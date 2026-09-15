# Seokav

[![Version](https://img.shields.io/badge/version-1.2.1-0d5e53)](./VERSION)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Validate](https://github.com/mamadflat/wordpress-seo-master/actions/workflows/validate.yml/badge.svg)](https://github.com/mamadflat/wordpress-seo-master/actions/workflows/validate.yml)

Seokav is a privacy-first, multi-site SEO operations dashboard for WordPress and
WooCommerce. It is a Persian RTL application that runs entirely in the browser,
can read public WooCommerce catalog data without a plugin, and can edit products
and product categories through the optional Seokav Connector plugin.

**Live application:** [mamadflat.github.io/wordpress-seo-master](https://mamadflat.github.io/wordpress-seo-master/)

## Why Seokav?

WooCommerce administrators and SEO specialists often need a complete view of a
large product taxonomy, a practical product editor, and an auditable record of
monthly SEO work. Seokav combines these workflows without requiring a hosted
Seokav account or a central database.

## Main Features

### Multi-site workspace

- Register and switch between multiple WordPress/WooCommerce sites.
- Keep categories, products, tasks, connection keys, and reports isolated per site.
- Store all user-provided state in the current browser profile.

### Category intelligence

- Read public WooCommerce product categories immediately after a domain is added.
- Explore categories in six views: tree, full overview graph, interactive branch,
  level map, columns, and cards.
- Use a full parent-child graph with branch colors, pan, zoom, fit-to-screen,
  minimap, root filtering, and search highlighting.
- Highlight empty categories in red.
- Audit empty categories, excessive depth, and duplicate slugs.
- Edit category name, slug, parent, description, SEO title, and meta description
  when the connector is enabled.

### Product workspace

- Read published products without installing a plugin.
- With the connector enabled, read published, draft, pending, private, scheduled,
  and trashed products.
- Filter by status and search by name, slug, or SKU.
- Edit name, slug, status, SKU, regular price, sale price, stock state, stock
  quantity, categories, descriptions, and supported SEO metadata.

### SEO work calendar and monthly reports

- Schedule work by date and time.
- Record work type, notes, estimated duration, and completion timestamp.
- Review open and completed work by month.
- Calculate completed work time for the selected month.
- Export monthly activity as CSV or JSON.

### Reporting, backup, and appearance

- Export category data as JSON or CSV.
- Export and restore a complete local Seokav backup.
- Print the current report to PDF through the browser print dialog.
- Switch between persistent light and dark themes.
- Use the responsive interface on desktop, tablet, and mobile layouts.

## Public Mode vs Connector Mode

| Capability | Public mode | Connector mode |
| --- | --- | --- |
| Read product categories | Yes | Yes |
| Read published products | Yes | Yes |
| Read non-public product statuses | No | Yes |
| Edit categories | No | Yes |
| Edit products | No | Yes |
| WordPress administrator password required | No | No |

Public mode uses the WooCommerce Store API. Connector mode uses a dedicated
48-character key sent in the `X-Seokav-Key` header to the restricted
`/wp-json/seokav/v1` REST namespace.

## Quick Start

### Use the hosted application

1. Open the [live application](https://mamadflat.github.io/wordpress-seo-master/).
2. Select **Add Site**.
3. Enter a display name and the full HTTPS domain of a WooCommerce site.
4. Wait for public categories and published products to be imported.
5. Open **Category Structure** and select **Full Overview** for the complete graph.
6. Install the connector only when editing or private product statuses are needed.

### Run locally

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/mamadflat/wordpress-seo-master.git
cd wordpress-seo-master
npm run check
npm run dev
```

Open `http://localhost:4173`. The application has no compilation step and no
runtime dependencies; GitHub Pages serves `index.html` directly.

## Install the WordPress Connector

1. Download [`seokav-connector.zip`](./seokav-connector.zip).
2. In WordPress, open **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP, install it, and activate **Seokav Connector**.
4. Open **Tools > Seokav Connector**.
5. Confirm that `https://mamadflat.github.io` is an allowed origin.
6. Copy the generated connector key.
7. In Seokav, open **Settings & Connections**, paste the key, and run the test.

Never enter the WordPress administrator password in Seokav. Rotate the connector
key immediately if it is exposed.

See [WordPress Connector](./docs/WORDPRESS-CONNECTOR.md) for endpoint and security
details.

## Repository Layout

```text
.
├── index.html                         # Complete browser application
├── VERSION                            # Application release version
├── seokav-connector.zip               # Installable WordPress plugin
├── wordpress-plugin/
│   └── seokav-wordpress-connector/    # Connector source code
├── scripts/
│   ├── validate.mjs                   # Repository and JavaScript validation
│   ├── build-connector.ps1            # Windows connector packaging
│   └── build-connector.sh             # macOS/Linux connector packaging
├── docs/                              # Detailed project documentation
└── .github/                           # CI and contribution templates
```

## Documentation

- [User Guide](./docs/USER-GUIDE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Development and Build](./docs/DEVELOPMENT.md)
- [WordPress Connector](./docs/WORDPRESS-CONNECTOR.md)
- [Release Process](./docs/RELEASE.md)
- [Seokav 1.2.1 Release Notes](./docs/releases/1.2.1.md)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

## Privacy and Data Storage

Seokav has no application server, user account system, analytics pipeline, or
central database. Site configuration, imported data, connector keys, tasks, and
preferences are serialized under `seokav.public.dashboard.v2` in browser
`localStorage`.

This architecture means:

- data does not synchronize automatically between browsers or devices;
- clearing browser storage removes the local workspace;
- backups should be exported before clearing storage or changing devices;
- each browser profile has an independent workspace;
- connector keys must only be stored in trusted browser profiles.

## Team mode

The local-first release is still available for a private browser workspace. For
shared work, run the Team API with PostgreSQL and set the public API URL in
`config.js`. A Workspace owner can invite members, add several WordPress sites,
and assign each member a separate site role (`viewer`, `editor`, or `manager`).
Members only receive sites allowed by the server-side `site_members` policy.
The API stores WordPress connector keys encrypted and proxies authorized
requests without exposing those keys to member browsers.

See [Team mode and site-level access](./docs/TEAM-MODE.md) for local setup and
deployment requirements.

## Browser and Platform Support

Seokav targets current versions of Chromium, Chrome, Edge, Firefox, and Safari.
The connected WordPress site must expose the WooCommerce Store API for public
mode and must use HTTPS when Seokav is loaded from GitHub Pages.

The connector requires WordPress 6.4+, PHP 8.0+, WooCommerce for product
features, and HTTPS for production use.

## License

The browser application is released under the [MIT License](./LICENSE). The
WordPress connector declares GPL-2.0-or-later compatibility in its plugin
metadata.
