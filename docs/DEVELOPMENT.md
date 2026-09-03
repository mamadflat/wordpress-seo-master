# Development and Build

## Prerequisites

- Git
- Node.js 20 or newer
- npm
- PowerShell 7+ on Windows, or `zip` on macOS/Linux, to rebuild the connector

The browser application has no installed dependencies and uses no bundler.

## Set Up and Run

```bash
git clone https://github.com/mamadflat/derakhtyar.git
cd derakhtyar
npm run check
npm run dev
```

Open `http://localhost:4173`. Do not use a `file://` URL; realistic browser and
WordPress integration testing requires an HTTP origin.

## Build Model

Seokav is zero-build. HTML, CSS, and JavaScript are authored in `index.html`,
`npm run check` validates the production file, and GitHub Pages serves it directly.
There is no generated `dist` directory.

## Validation

```bash
npm run check
git diff --check
git status --short
```

The validator checks required artifacts, inline JavaScript syntax, version
markers, major UI modules, and obvious hard-coded connector keys.

## Rebuild the WordPress Connector

Source: `wordpress-plugin/seokav-wordpress-connector/`

Windows:

```powershell
npm run build:connector
```

macOS/Linux:

```bash
sh scripts/build-connector.sh
```

Both commands replace `seokav-connector.zip`. Verify that the archive contains:

```text
seokav-wordpress-connector/seokav-connector.php
seokav-wordpress-connector/readme.txt
```

## Versioning

Seokav follows semantic versioning. Update `VERSION`, `package.json`,
`APP_VERSION`, the visible UI version badge, and `CHANGELOG.md` together. The
WordPress connector has an independent PHP header, class constant, and stable tag.

## Manual Test Matrix

Test every navigation page in light and dark themes:

| Page | Minimum checks |
| --- | --- |
| Overview | Metrics, action cards, responsive layout |
| Sites | Add, select, refresh, remove |
| Category Structure | Six views, search, graph controls, empty categories |
| Tasks | Create, schedule, complete, filter, CSV/JSON export |
| Audit | Empty/depth/slug results |
| Products | Public list, search, statuses, connector prompt/editor |
| Reports | Category exports, backup, restore, print |
| Settings | Save/test/remove key, clear local data |

For the graph, test pan, zoom, fit, minimap, root filtering, category editing,
and large-taxonomy auto-fit. Use a staging WordPress site for write tests.

## Coding Conventions

- Keep the application dependency-free unless a documented need justifies one.
- Preserve the RTL Persian user interface.
- Escape remote and user strings before inserting HTML.
- Keep connector keys and real site data out of source control.
- Maintain backward compatibility with saved localStorage records.
- Test both themes whenever adding a new surface.

## Continuous Integration

`.github/workflows/validate.yml` runs `npm run check` on pushes and pull requests.
GitHub Pages deployment is configured through repository Pages settings and
publishes the `main` branch root.
