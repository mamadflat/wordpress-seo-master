import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.SEOKAV_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { hashPassword, verifyPassword, encryptSecret, decryptSecret } = await import('../server/index.mjs');

test('password hashes verify only the original password', async () => {
  const hash = await hashPassword('a sufficiently long password');
  assert.equal(await verifyPassword('a sufficiently long password', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('connector secrets round-trip through authenticated encryption', () => {
  const encrypted = encryptSecret('connector-secret');
  assert.notEqual(encrypted, 'connector-secret');
  assert.equal(decryptSecret(encrypted), 'connector-secret');
});
