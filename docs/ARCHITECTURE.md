# Architecture

This document describes the architecture of Seokav 1.2.1.

## System Overview

Seokav is a static, client-side application. GitHub Pages serves a single
`index.html` file containing the layout, styles, state management, WooCommerce
integration, editors, reports, and interaction logic.

```text
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  Seokav UI + localStorage + reports + editors                │
└───────────────┬───────────────────────────┬──────────────────┘
                │ public Store API          │ authenticated API
                │ categories/products       │ X-Seokav-Key
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│ WooCommerce Store API     │   │ Seokav Connector            │
│ /wc/store/v1              │   │ /seokav/v1                   │
└───────────────────────────┘   └──────────────┬───────────────┘
                                               ▼
                                  WordPress + WooCommerce data
```

The local-first mode has no Seokav backend, database, login service, proxy, or
telemetry service. Optional Team mode adds the Node API and PostgreSQL schema
described in [Team mode](./TEAM-MODE.md); the same frontend can then load only
the sites authorized for the signed-in user.

## Runtime Modules

Although the application is delivered as one file, its functions form distinct
logical modules:

| Module | Responsibilities |
| --- | --- |
| Shell | Navigation, current site, theme, badges, responsive sidebar |
| Site registry | Add, select, refresh, and remove sites |
| Public reader | Read WooCommerce Store API categories and products |
| Connector client | Authenticated requests with `X-Seokav-Key` |
| Taxonomy | Build parent-child trees and render six views |
| Full graph | Layout nodes, draw SVG edges, pan, zoom, fit, minimap, filtering |
| Product workspace | Status filters, search, pagination, editor |
| Category editor | Category and SEO metadata editing |
| Task calendar | Scheduling, completion tracking, monthly aggregation |
| Audit | Empty category, depth, and duplicate slug checks |
| Reports | CSV, JSON, print, backup, and restore |
| Persistence | Serialize the complete application state to localStorage |

In Team mode, site membership and connector secrets are authoritative on the
API. WordPress requests go through the API proxy, which checks the user's site
role before forwarding an allowed request. Browser-local tasks and reports are
still local unless a future sync module is enabled.

## State Model

The root object is stored under `seokav.public.dashboard.v2`.

```json
{
  "activeSiteId": "site-id",
  "view": "overview",
  "theme": "dark",
  "sites": [
    {
      "id": "site-id",
      "name": "Store",
      "url": "https://example.com",
      "categories": [],
      "products": [],
      "tasks": [],
      "connectorKey": "stored-only-in-this-browser",
      "lastSync": 0
    }
  ]
}
```

Imported category records are normalized to `id`, `parent`, `name`, `slug`,
`count`, and `url`. Connector responses may also add descriptions and SEO fields.

Task records contain `id`, `title`, `note`, `kind`, planned `duration`,
`scheduledAt`, `createdAt`, optional `completedAt`, and a Boolean `done` state.
Old task records use `createdAt` as the fallback schedule.

## Public Data Flow

1. The user adds a WooCommerce domain.
2. Seokav validates and normalizes the URL.
3. Categories are requested from `/wp-json/wc/store/v1/products/categories`.
4. Published products are requested from `/wp-json/wc/store/v1/products`.
5. Pagination continues until the final partial page.
6. Data is normalized, saved locally, and rendered.

The reader uses a sandboxed iframe JSONP bridge because a static application
cannot control third-party CORS policy. Only public Store API data is available
through this path.

## Authenticated Data Flow

1. The connector key is saved for one site in localStorage.
2. Requests are sent directly from the browser to `/wp-json/seokav/v1`.
3. The key is supplied in `X-Seokav-Key`.
4. The plugin compares it with the saved WordPress option using `hash_equals`.
5. The plugin permits the request only when the key or a logged-in WordPress
   capability check succeeds.
6. The plugin returns normalized JSON and the browser updates its local cache.

No credentials pass through GitHub Pages or a Seokav server.

## Full Taxonomy Graph

The graph converts categories into a forest and attaches a virtual root. Leaf
nodes receive sequential horizontal positions; each parent is centered above its
children. SVG cubic paths connect levels. Major branches receive distinct colors
and zero-product categories receive the red empty state.

The graph supports transform-based pan and zoom, large-tree fit-to-screen, root
filtering, an SVG minimap, search highlighting, and category edit entry points.

## Security Boundaries

- Public mode can only read public Store API data.
- Mutations require the connector key or WordPress capabilities.
- Connector CORS responses are limited to configured origins.
- Connector keys are never committed to this repository.
- Requests intentionally use `credentials: omit`.
- Commercial product changes include an explicit confirmation field.

The connector key is powerful. Restrict origins, use HTTPS, and rotate exposed
keys immediately.

## Scaling Characteristics

The implementation is optimized for small and medium WooCommerce catalogs and
has been tested with dozens to hundreds of categories. All graph nodes exist in
the DOM at once, so very large taxonomies begin at a smaller fit-to-screen zoom.
Root filtering provides a readable detailed view without changing the data.

## Deployment

GitHub Pages serves the repository root from `main`. There is no generated web
bundle. A deployment is complete when `index.html`, documentation, and the
connector ZIP exist on the deployed revision.
