import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const scrypt = promisify(crypto.scrypt);
const app = express();
const port = Number(process.env.PORT || 8787);
const sessionDays = 30;
const sessionCookie = 'seokav_session';
const webOrigins = new Set((process.env.SEOKAV_WEB_ORIGINS || 'http://localhost:4173')
  .split(',').map(value => value.trim()).filter(Boolean));
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'None' : 'Lax');
const encryptionKey = process.env.SEOKAV_ENCRYPTION_KEY || '';

if (encryptionKey && !/^[0-9a-f]{64}$/i.test(encryptionKey)) {
  throw new Error('SEOKAV_ENCRYPTION_KEY must be a 64-character hex key.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const id = () => crypto.randomUUID();
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const json = (res, status, payload) => res.status(status).json(payload);

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name };
}

function parseCookies(request) {
  const header = request.headers.cookie || '';
  return Object.fromEntries(header.split(';').map(part => part.trim().split('='))
    .filter(pair => pair[0]).map(([key, ...value]) => [key, decodeURIComponent(value.join('='))]));
}

function setSessionCookie(response, token, maxAge = sessionDays * 86400) {
  const flags = [
    `${sessionCookie}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    `SameSite=${cookieSameSite}`,
  ];
  if (cookieSecure) flags.push('Secure');
  response.setHeader('Set-Cookie', flags.join('; '));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (typeof password !== 'string') return false;
  const [scheme, salt, expectedHex] = String(stored).split(':');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function encryptSecret(value) {
  if (!value) return null;
  if (!encryptionKey) throw new Error('SEOKAV_ENCRYPTION_KEY is not configured.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

function decryptSecret(value) {
  if (!value) return '';
  if (!encryptionKey) throw new Error('SEOKAV_ENCRYPTION_KEY is not configured.');
  const [ivText, tagText, encryptedText] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function rateLimit(maximum, windowMs) {
  const buckets = new Map();
  return (request, response, next) => {
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maximum) return json(response, 429, { error: 'rate_limited', message: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' });
    return next();
  };
}

function requirePassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    const error = new Error('رمز عبور باید حداقل ۱۰ کاراکتر باشد.');
    error.status = 400;
    throw error;
  }
}

async function currentUser(request) {
  const token = parseCookies(request)[sessionCookie];
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return result.rows[0] || null;
}

const requireAuth = asyncRoute(async (request, response, next) => {
  request.user = await currentUser(request);
  if (!request.user) return json(response, 401, { error: 'auth_required', message: 'ابتدا وارد حساب شوید.' });
  return next();
});

async function workspaceMembership(workspaceId, userId) {
  const result = await pool.query(
    `SELECT w.id, w.name, w.owner_id, wm.role
       FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = $1 AND wm.user_id = $2`,
    [workspaceId, userId],
  );
  return result.rows[0] || null;
}

async function siteAccess(siteId, userId) {
  const result = await pool.query(
    `SELECT s.id, s.workspace_id, s.name, s.url, s.connector_secret,
            wm.role AS workspace_role, sm.role AS site_role
       FROM sites s
       JOIN workspace_members wm ON wm.workspace_id = s.workspace_id AND wm.user_id = $2
       LEFT JOIN site_members sm ON sm.site_id = s.id AND sm.user_id = $2
      WHERE s.id = $1`,
    [siteId, userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const role = ['owner', 'admin'].includes(row.workspace_role) ? 'manager' : row.site_role;
  if (!role) return null;
  return { ...row, effective_role: role };
}

function canEdit(access) {
  return access && ['owner', 'admin', 'manager', 'editor'].includes(access.effective_role);
}

function canManage(access) {
  return access && ['owner', 'admin', 'manager'].includes(access.effective_role);
}

async function audit(userId, workspaceId, siteId, action, details = {}) {
  await pool.query(
    `INSERT INTO audit_log (workspace_id, site_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [workspaceId, siteId || null, userId, action, JSON.stringify(details)],
  );
}

function safeSite(row, userId) {
  const role = ['owner', 'admin'].includes(row.workspace_role) ? 'manager' : row.site_role;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    role,
    canEdit: ['owner', 'admin', 'manager', 'editor'].includes(role),
    canManage: ['owner', 'admin', 'manager'].includes(role),
    connectorConfigured: Boolean(row.connector_secret),
    workspaceId: row.workspace_id,
    userId,
  };
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && webOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Vary', 'Origin');
  }
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    return response.sendStatus(204);
  }
  return next();
});

app.get('/health', (_request, response) => json(response, 200, { ok: true, service: 'seokav-api' }));

app.use('/api/auth', rateLimit(30, 60_000));
app.use('/api/invites', rateLimit(30, 60_000));

app.post('/api/auth/register', asyncRoute(async (request, response) => {
  const name = String(request.body?.name || '').trim();
  const email = normalizeEmail(request.body?.email);
  const password = request.body?.password;
  const workspaceName = String(request.body?.workspaceName || `${name} workspace`).trim().slice(0, 120);
  if (!name || name.length > 120 || !validEmail(email)) return json(response, 400, { error: 'invalid_registration', message: 'نام و ایمیل معتبر وارد کنید.' });
  requirePassword(password);
  const userId = id();
  const workspaceId = id();
  const token = crypto.randomBytes(32).toString('base64url');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await hashPassword(password);
    await client.query('INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)', [userId, email, name, passwordHash]);
    await client.query('INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)', [workspaceId, workspaceName || 'Seokav Workspace', userId]);
    await client.query('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)', [workspaceId, userId, 'owner']);
    await client.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [hashToken(token), userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return json(response, 409, { error: 'email_exists', message: 'این ایمیل قبلاً ثبت شده است.' });
    throw error;
  } finally {
    client.release();
  }
  setSessionCookie(response, token);
  return json(response, 201, { user: { id: userId, email, name }, workspace: { id: workspaceId, name: workspaceName || 'Seokav Workspace', role: 'owner' } });
}));

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = request.body?.password;
  const result = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
  if (!result.rows[0] || !(await verifyPassword(password, result.rows[0].password_hash))) return json(response, 401, { error: 'invalid_login', message: 'ایمیل یا رمز عبور نادرست است.' });
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')', [hashToken(token), result.rows[0].id]);
  setSessionCookie(response, token);
  return json(response, 200, { user: publicUser(result.rows[0]) });
}));

app.post('/api/auth/logout', requireAuth, asyncRoute(async (request, response) => {
  const token = parseCookies(request)[sessionCookie];
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  setSessionCookie(response, '', 0);
  return json(response, 200, { ok: true });
}));

app.get('/api/auth/me', requireAuth, asyncRoute(async (request, response) => {
  const result = await pool.query(
    `SELECT w.id, w.name, wm.role FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = $1 ORDER BY w.created_at`,
    [request.user.id],
  );
  return json(response, 200, { user: publicUser(request.user), workspaces: result.rows });
}));

app.get('/api/workspaces/:workspaceId/members', requireAuth, asyncRoute(async (request, response) => {
  const membership = await workspaceMembership(request.params.workspaceId, request.user.id);
  if (!membership) return json(response, 404, { error: 'workspace_not_found' });
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, wm.role, wm.created_at
       FROM workspace_members wm JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1 ORDER BY u.name`,
    [membership.id],
  );
  return json(response, 200, { workspace: { id: membership.id, name: membership.name, role: membership.role }, members: result.rows });
}));

app.post('/api/workspaces/:workspaceId/invites', requireAuth, asyncRoute(async (request, response) => {
  const membership = await workspaceMembership(request.params.workspaceId, request.user.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) return json(response, 403, { error: 'forbidden' });
  const email = normalizeEmail(request.body?.email);
  const role = ['admin', 'member'].includes(request.body?.role) ? request.body.role : 'member';
  if (!validEmail(email)) return json(response, 400, { error: 'invalid_email', message: 'ایمیل معتبر وارد کنید.' });
  const token = crypto.randomBytes(32).toString('base64url');
  const inviteId = id();
  await pool.query(
    `INSERT INTO workspace_invites (id, workspace_id, email, role, token_hash, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', $6)`,
    [inviteId, membership.id, email, role, hashToken(token), request.user.id],
  );
  await audit(request.user.id, membership.id, null, 'workspace.invite_created', { email, role });
  const publicOrigin = process.env.SEOKAV_PUBLIC_WEB_ORIGIN || process.env.SEOKAV_WEB_ORIGINS?.split(',')[0] || 'http://localhost:4173';
  return json(response, 201, { id: inviteId, email, role, expiresInDays: 7, inviteToken: token, inviteUrl: `${publicOrigin}/?invite=${encodeURIComponent(token)}` });
}));

app.post('/api/invites/:token/accept', requireAuth, asyncRoute(async (request, response) => {
  const tokenHash = hashToken(request.params.token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invite = await client.query(
      `SELECT * FROM workspace_invites
        WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [tokenHash],
    );
    if (!invite.rows[0]) { await client.query('ROLLBACK'); return json(response, 404, { error: 'invite_invalid', message: 'دعوت‌نامه معتبر نیست یا منقضی شده است.' }); }
    if (invite.rows[0].email !== request.user.email) { await client.query('ROLLBACK'); return json(response, 403, { error: 'invite_email_mismatch', message: 'این دعوت‌نامه برای ایمیل دیگری صادر شده است.' }); }
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.rows[0].workspace_id, request.user.id, invite.rows[0].role],
    );
    await client.query('UPDATE workspace_invites SET accepted_at = NOW() WHERE id = $1', [invite.rows[0].id]);
    await client.query('COMMIT');
    await audit(request.user.id, invite.rows[0].workspace_id, null, 'workspace.invite_accepted');
    return json(response, 200, { ok: true, workspaceId: invite.rows[0].workspace_id });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/workspaces/:workspaceId/sites', requireAuth, asyncRoute(async (request, response) => {
  const membership = await workspaceMembership(request.params.workspaceId, request.user.id);
  if (!membership) return json(response, 404, { error: 'workspace_not_found' });
  const result = await pool.query(
    `SELECT s.*, wm.role AS workspace_role, sm.role AS site_role
       FROM sites s JOIN workspace_members wm ON wm.workspace_id = s.workspace_id AND wm.user_id = $2
       LEFT JOIN site_members sm ON sm.site_id = s.id AND sm.user_id = $2
      WHERE s.workspace_id = $1
        AND ($3 IN ('owner', 'admin') OR sm.user_id IS NOT NULL)
      ORDER BY s.name`,
    [membership.id, request.user.id, membership.role],
  );
  return json(response, 200, { sites: result.rows.map(row => safeSite(row, request.user.id)) });
}));

app.post('/api/workspaces/:workspaceId/sites', requireAuth, asyncRoute(async (request, response) => {
  const membership = await workspaceMembership(request.params.workspaceId, request.user.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) return json(response, 403, { error: 'forbidden' });
  const name = String(request.body?.name || '').trim();
  const url = String(request.body?.url || '').trim().replace(/\/+$/, '');
  if (!name || name.length > 120) return json(response, 400, { error: 'invalid_site_name' });
  let parsed;
  try { parsed = new URL(url); } catch { return json(response, 400, { error: 'invalid_site_url' }); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return json(response, 400, { error: 'invalid_site_url' });
  const siteId = id();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO sites (id, workspace_id, name, url, connector_secret) VALUES ($1, $2, $3, $4, $5)', [siteId, membership.id, name, parsed.origin + parsed.pathname.replace(/\/+$/, ''), encryptSecret(request.body?.connectorKey)]);
    await client.query('INSERT INTO site_members (site_id, user_id, role) VALUES ($1, $2, $3)', [siteId, request.user.id, 'manager']);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return json(response, 409, { error: 'site_exists', message: 'این سایت قبلاً در Workspace ثبت شده است.' });
    throw error;
  } finally {
    client.release();
  }
  await audit(request.user.id, membership.id, siteId, 'site.created', { name, url: parsed.origin + parsed.pathname });
  return json(response, 201, { site: { id: siteId, name, url: parsed.origin + parsed.pathname, role: 'manager', canEdit: true, canManage: true, connectorConfigured: Boolean(request.body?.connectorKey), workspaceId: membership.id } });
}));

app.patch('/api/sites/:siteId', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!canManage(access)) return json(response, 403, { error: 'forbidden' });
  const fields = [];
  const values = [];
  if (request.body?.name !== undefined) { fields.push(`name = $${values.length + 1}`); values.push(String(request.body.name).trim().slice(0, 120)); }
  if (request.body?.url !== undefined) { let parsed; try { parsed = new URL(String(request.body.url).trim()); } catch { return json(response, 400, { error: 'invalid_site_url' }); } if (!['http:', 'https:'].includes(parsed.protocol)) return json(response, 400, { error: 'invalid_site_url' }); fields.push(`url = $${values.length + 1}`); values.push(parsed.origin + parsed.pathname.replace(/\/+$/, '')); }
  if (request.body?.connectorKey !== undefined) { fields.push(`connector_secret = $${values.length + 1}`); values.push(encryptSecret(request.body.connectorKey)); }
  if (!fields.length) return json(response, 400, { error: 'nothing_to_update' });
  values.push(request.params.siteId);
  await pool.query(`UPDATE sites SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);
  await audit(request.user.id, access.workspace_id, access.id, 'site.updated', { fields: fields.map(field => field.split(' ')[0]) });
  const latest = await siteAccess(request.params.siteId, request.user.id);
  return json(response, 200, { site: safeSite(latest, request.user.id) });
}));

app.delete('/api/sites/:siteId', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!canManage(access)) return json(response, 403, { error: 'forbidden' });
  await audit(request.user.id, access.workspace_id, request.params.siteId, 'site.deleted');
  await pool.query('DELETE FROM sites WHERE id = $1', [request.params.siteId]);
  return json(response, 200, { ok: true });
}));

app.get('/api/sites/:siteId/members', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!canManage(access)) return json(response, 403, { error: 'forbidden' });
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, sm.role, sm.created_at
       FROM site_members sm JOIN users u ON u.id = sm.user_id
      WHERE sm.site_id = $1 ORDER BY u.name`,
    [request.params.siteId],
  );
  return json(response, 200, { members: result.rows });
}));

app.put('/api/sites/:siteId/members/:userId', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!canManage(access)) return json(response, 403, { error: 'forbidden' });
  const role = request.body?.role;
  if (!['viewer', 'editor', 'manager'].includes(role)) return json(response, 400, { error: 'invalid_site_role' });
  const member = await pool.query(
    `SELECT wm.workspace_id FROM workspace_members wm WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
    [access.workspace_id, request.params.userId],
  );
  if (!member.rows[0]) return json(response, 404, { error: 'user_not_in_workspace' });
  await pool.query(
    `INSERT INTO site_members (site_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (site_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [request.params.siteId, request.params.userId, role],
  );
  await audit(request.user.id, access.workspace_id, request.params.siteId, 'site.member_role_updated', { userId: request.params.userId, role });
  return json(response, 200, { ok: true });
}));

app.delete('/api/sites/:siteId/members/:userId', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!canManage(access)) return json(response, 403, { error: 'forbidden' });
  await pool.query('DELETE FROM site_members WHERE site_id = $1 AND user_id = $2', [request.params.siteId, request.params.userId]);
  await audit(request.user.id, access.workspace_id, request.params.siteId, 'site.member_removed', { userId: request.params.userId });
  return json(response, 200, { ok: true });
}));

app.get('/api/workspaces/:workspaceId/audit', requireAuth, asyncRoute(async (request, response) => {
  const membership = await workspaceMembership(request.params.workspaceId, request.user.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) return json(response, 403, { error: 'forbidden' });
  const result = await pool.query(
    `SELECT a.id, a.action, a.details, a.created_at, u.name AS actor_name, s.name AS site_name
       FROM audit_log a JOIN users u ON u.id = a.actor_id LEFT JOIN sites s ON s.id = a.site_id
      WHERE a.workspace_id = $1 ORDER BY a.created_at DESC LIMIT 200`,
    [membership.id],
  );
  return json(response, 200, { entries: result.rows });
}));

app.use('/api/sites/:siteId/wp', requireAuth, asyncRoute(async (request, response) => {
  const access = await siteAccess(request.params.siteId, request.user.id);
  if (!access) return json(response, 404, { error: 'site_not_found' });
  const suffix = request.originalUrl.split('?')[0].replace(/^\/api\/sites\/[^/]+\/wp/, '') || '/health';
  const allowed = ['/health', '/categories', '/products', '/content'];
  if (!allowed.some(prefix => suffix === prefix || suffix.startsWith(`${prefix}/`))) return json(response, 404, { error: 'proxy_route_not_allowed' });
  if (request.method !== 'GET' && !canEdit(access)) return json(response, 403, { error: 'site_read_only' });
  const key = decryptSecret(access.connector_secret);
  if (!key) return json(response, 409, { error: 'connector_not_configured', message: 'برای این سایت هنوز اتصال وردپرس تنظیم نشده است.' });
  const target = `${access.url.replace(/\/$/, '')}/wp-json/seokav/v1${suffix}${request.originalUrl.includes('?') ? `?${request.originalUrl.split('?').slice(1).join('?')}` : ''}`;
  const headers = { 'X-Seokav-Key': key };
  if (request.body && Object.keys(request.body).length) headers['Content-Type'] = 'application/json';
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : JSON.stringify(request.body || {}),
    signal: AbortSignal.timeout(30000),
  });
  const text = await upstream.text();
  if (request.method !== 'GET') await audit(request.user.id, access.workspace_id, access.id, `site.wp.${request.method.toLowerCase()}`, { path: suffix });
  response.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
}));

app.use((error, _request, response, _next) => {
  console.error(error);
  return json(response, error.status || 500, { error: 'server_error', message: error.status ? error.message : 'خطای داخلی سرور.' });
});

async function start() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!encryptionKey) throw new Error('SEOKAV_ENCRYPTION_KEY is required.');
  const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  app.listen(port, () => console.log(`Seokav API listening on http://localhost:${port}`));
}

if (process.env.NODE_ENV !== 'test') start().catch(error => { console.error(error); process.exitCode = 1; });

export { app, hashPassword, verifyPassword, encryptSecret, decryptSecret };
