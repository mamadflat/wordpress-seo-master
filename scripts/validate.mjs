import { readFile, access } from 'node:fs/promises';

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
  'docs/releases/1.2.0.md',
  'wordpress-plugin/seokav-wordpress-connector/readme.txt',
  'wordpress-plugin/seokav-wordpress-connector/seokav-connector.php'
];

for (const path of requiredFiles) {
  await access(path);
}

const html = await readFile('index.html', 'utf8');
const version = (await readFile('VERSION', 'utf8')).trim();
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
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
  'id="connectorPromptModal"'
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`Missing required application marker: ${marker}`);
}

if (/connectorKey\s*:\s*['"][^'"]+['"]/.test(html)) {
  throw new Error('A connector key appears to be hard-coded in index.html.');
}

console.log(`Seokav ${version}: validation passed.`);
