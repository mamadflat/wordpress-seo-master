# WordPress Connector

Seokav Connector 1.1.0 adds an authenticated REST API for category, product, and
content management. It is optional for public reading and required for editing.

## Requirements

- WordPress 6.4+
- PHP 8.0+
- WooCommerce for product routes
- HTTPS for production use
- An administrator account for installation and configuration

## Installation

1. Download `seokav-connector.zip`.
2. In WordPress Admin, open **Plugins > Add New > Upload Plugin**.
3. Upload and activate the plugin.
4. Open **Tools > Seokav Connector**.
5. Copy the generated connector key.
6. Keep `https://mamadflat.github.io` in the allowlist for the official deployment.
7. Add another trusted dashboard origin on its own line when required.
8. Paste the key into the matching Seokav site and test the connection.

## Authentication

The browser sends:

```http
X-Seokav-Key: <48-character-key>
```

The plugin compares it with the WordPress option using `hash_equals`. Logged-in
WordPress users with relevant capabilities can also pass permission callbacks.
The key is not a WordPress password, but it is a privileged secret.

## CORS and Allowed Origins

CORS headers are added only for `/wp-json/seokav/v1/` routes and only when the
request origin exactly matches the configured allowlist.

```text
https://mamadflat.github.io
http://localhost:4173
```

Origins contain scheme, host, and optional port; paths are not allowed. Add
localhost only during development and remove it afterward.

## REST Endpoints

Base URL: `https://example.com/wp-json/seokav/v1`

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Test authentication and report capabilities |
| GET | `/categories` | List product categories |
| GET | `/categories/{id}` | Read a category and SEO metadata |
| PATCH | `/categories/{id}` | Update a category and SEO metadata |
| GET | `/products` | List products with status filters and pagination |
| GET | `/products/{id}` | Read one product |
| PATCH | `/products/{id}` | Update one product |
| GET | `/content/{type}/{id}` | Read supported WordPress content |
| PATCH | `/content/{type}/{id}` | Update supported WordPress content |

## Category Fields

```json
{
  "name": "Category name",
  "slug": "category-slug",
  "description": "Category description",
  "parent": 0,
  "seo_title": "SEO title",
  "seo_description": "Meta description"
}
```

Responses also include `id`, `count`, and `permalink`.

## Product Fields

The product editor supports name, slug, status, SKU, regular/sale price, stock
state and quantity, categories, descriptions, and supported SEO metadata.
Commercial changes require `confirm_commercial_changes: true`.

`GET /products` accepts `page`, `per_page`, and `status`; `status=any` powers the
all-status dashboard view. Responses include pagination and status counts.

## SEO Metadata

The connector reads Yoast SEO fields first and falls back to Rank Math. Updates
write supported title and description fields for both systems.

## Key Rotation

1. Open **Tools > Seokav Connector**.
2. Select key rotation and save.
3. Copy the new key into Seokav and test it.

Rotation invalidates the old key immediately.

## Security Recommendations

- Use HTTPS for WordPress and the dashboard.
- Allow only origins that actually host Seokav.
- Never share connector keys through messages, tickets, or screenshots.
- Use staging for write tests.
- Rotate keys after staff or device changes.
- Keep WordPress, WooCommerce, PHP, and the connector updated.
- Back up WooCommerce before bulk editing live catalog data.

## Build the Plugin

Source: `wordpress-plugin/seokav-wordpress-connector/`

```powershell
npm run build:connector
```

```bash
sh scripts/build-connector.sh
```

The generated archive is `seokav-connector.zip` in the repository root.

## Troubleshooting

### HTTP 401

Copy the current key again, save it for the correct site, and test. Rotate the key
if its history is unknown.

### Browser CORS error

Add the exact dashboard origin. Do not add a path or trailing slash. Confirm that
a CDN or security plugin is not replacing CORS headers.

### WooCommerce missing

Activate WooCommerce. Category and product routes use `product_cat` and
WooCommerce product APIs.

### SEO metadata does not appear

Confirm the site uses supported Yoast SEO or Rank Math fields, clear caches, and
reopen the item.
