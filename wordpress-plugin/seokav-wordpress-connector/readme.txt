=== Seokav Connector ===
Contributors: seokav
Tags: seo, woocommerce, api, connector
Requires at least: 6.4
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 1.1.1
License: GPLv2 or later

A restricted API connector between Seokav, WordPress, and WooCommerce.

== Description ==

Seokav Connector adds authenticated REST endpoints for reading and editing
WooCommerce product categories, products, supported content types, and common
SEO metadata. Authentication uses a dedicated connector key; the WordPress
administrator password is never shared with Seokav.

== Installation ==

1. Upload `seokav-connector.zip` from WordPress Admin > Plugins > Add New > Upload Plugin.
2. Activate **Seokav Connector**.
3. Open WordPress Admin > Tools > Seokav Connector.
4. Copy the connector key.
5. In Seokav, open Settings & Connections for the matching site and paste the key.
6. Run the connection test.

The default allowed origin is `https://mamadflat.github.io`. Add one origin per
line if the dashboard is hosted elsewhere. Rotate the key immediately if it is
ever exposed; rotation invalidates the previous key.

== Security Notes ==

The connector key grants product and category management capabilities through
the Seokav REST namespace. Store it only in a trusted browser profile, use
HTTPS in production, restrict allowed origins, and rotate exposed keys.

== Changelog ==

= 1.1.1 =
* Restricted content editing to posts and pages with supported statuses.
* Used the active WordPress category taxonomy consistently when WooCommerce is unavailable.

= 1.1.0 =
* Added a dedicated 48-character connector key and origin allowlist.
* Added product listing across all supported statuses.
* Added category and product editing from Seokav.
* Added common Yoast SEO and Rank Math metadata support.
