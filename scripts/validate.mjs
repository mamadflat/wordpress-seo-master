import { access, readFile } from 'node:fs/promises';

const version = (await readFile('VERSION', 'utf8')).trim();
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const connectorPath = 'wordpress-plugin/seokav-wordpress-connector/seokav-connector.php';
const connectorReadmePath = 'wordpress-plugin/seokav-wordpress-connector/readme.txt';
const requiredFiles = [
  'index.html',
  'README.md',
  'LICENSE',
  'VERSION',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'seokav-connector.zip',
  'docs/ARCHITECTURE.md',
  'docs/DEVELOPMENT.md',
  'docs/RELEASE.md',
  'docs/USER-GUIDE.md',
  'docs/WORDPRESS-CONNECTOR.md',
  `docs/releases/${version}.md`,
  connectorReadmePath,
  connectorPath,
];

for (const path of requiredFiles) await access(path);

const html = await readFile('index.html', 'utf8');
const connector = await readFile(connectorPath, 'utf8');
const connectorReadme = await readFile(connectorReadmePath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) throw new Error('index.html does not contain an inline application script.');
new Function(scriptMatch[1]);

if (packageJson.version !== version) {
  throw new Error(`package.json (${packageJson.version}) and VERSION (${version}) do not match.`);
}

const requiredMarkers = [
  `const APP_VERSION='${version}'`,
  `v${version}`,
  'data-view="overview"',
  'id="themeToggle"',
  'id="taskWorkspace"',
  'id="connectorPromptModal"',
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`Missing required application marker: ${marker}`);
}

if (/connectorKey\s*:\s*['"][^'"]+['"]/.test(html)) {
  throw new Error('A connector key appears to be hard-coded in index.html.');
}

if (/mamadflat\.github\.io\/derakhtyar|github\.com\/mamadflat\/derakhtyar/.test(`${html}\n${await readFile('README.md', 'utf8')}\n${await readFile('docs/DEVELOPMENT.md', 'utf8')}`)) {
  throw new Error('A stale derakhtyar deployment or repository URL remains in release documentation.');
}

const connectorVersion = connector.match(/\* Version:\s*([^\s]+)/)?.[1];
const connectorConstant = connector.match(/const VERSION\s*=\s*'([^']+)'/)?.[1];
const stableTag = connectorReadme.match(/Stable tag:\s*([^\s]+)/)?.[1];
if (!connectorVersion || connectorVersion !== connectorConstant || connectorVersion !== stableTag) {
  throw new Error('Connector version metadata is inconsistent across PHP and readme.txt.');
}

for (const marker of ["register_rest_route", "permission_callback", "hash_equals", "wp_nonce_field"]) {
  if (!connector.includes(marker)) throw new Error(`Connector is missing security marker: ${marker}`);
}

console.log(`Seokav ${version}: validation passed (connector ${connectorVersion}).`);
