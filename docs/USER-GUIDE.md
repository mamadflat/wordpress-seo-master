# User Guide

## Add a Site

1. Select **Add Site**.
2. Enter a recognizable site name.
3. Enter the full domain, including `https://`.
4. Submit the form.

Seokav immediately attempts to read public WooCommerce categories and published
products. If the Store API is blocked, imports fail until the WordPress or CDN
configuration is corrected.

## Manage Multiple Sites

Use the sidebar selector to switch workspaces. Each site has separate categories,
products, tasks, connection settings, and synchronization dates.

The **Sites** page can select, refresh, or remove a site. Removing a site deletes
only its data from the current browser; it does not modify WordPress.

## Explore Category Structure

The **Category Structure** page provides six views:

1. **Tree** — compact expandable hierarchy.
2. **Full Overview** — complete parent-child graph.
3. **Branch** — one root branch with progressive expansion.
4. **Map** — categories grouped by depth.
5. **Columns** — one hierarchy level at a time.
6. **Cards** — root categories summarized as cards.

### Full Overview controls

- Drag the canvas to pan.
- Use `+` and `-` to zoom.
- Use **Fit to Screen** to show the complete structure.
- Use the dropdown to isolate a root branch.
- Use search to highlight matching nodes.
- Use the minimap to understand structure scale.
- Red nodes are categories with zero products.
- Select an edit icon to open editing or connector setup.

## Run a Structure Audit

The audit reports empty categories, duplicate category slugs, and structures
deeper than four levels. Results are recommendations, not automatic changes.

## Work with Products

Public mode lists published products. Search and filter the local product cache.
Install the connector to retrieve non-public statuses and edit product content,
commercial fields, categories, and supported SEO metadata.

Price, stock, and status changes affect the live catalog. Review the form before
saving.

## Edit Categories

With the connector enabled, edit category name, slug, parent, description, and
Yoast SEO or Rank Math title/description fields. The parent selector excludes the
current category and its descendants to prevent obvious cycles.

## Plan and Report SEO Work

1. Open **Tasks** and select **New Task**.
2. Enter title, notes, date, time, estimated duration, and work type.
3. Save the task and mark it complete when finished.

Completion records the current timestamp. Use the month and status filters to
review activity. The summary shows total, completed, open, and completed work time.

At month-end, export CSV for spreadsheets and client reporting or JSON for backup
and custom processing.

## Reports and Backups

The **Reports** page exports categories as JSON or CSV and can export a complete
local backup. Restore that JSON file in another browser. Importing a backup
replaces the current local site list, so export a fresh backup first when needed.

## Light and Dark Themes

Use the sun/moon button in the top bar. The choice is stored with the workspace.

## Privacy and Reset

**Settings & Connections** can clear all Seokav data from the current browser.
This removes local sites, imported data, tasks, preferences, and connector keys.
It does not delete or edit WordPress data.

## Troubleshooting

### Categories or products are not imported

- Confirm the domain includes `https://`.
- Confirm WooCommerce is active.
- Open `/wp-json/wc/store/v1/products/categories` on the site.
- Check security plugins, CDN rules, and REST API restrictions.

### Connector test fails

- Confirm Seokav Connector 1.1.1 is active.
- Copy the key again without extra spaces.
- Confirm the dashboard origin is allowed.
- Confirm HTTPS works on WordPress.
- Rotate the key if it may be stale.

### Data disappeared

Seokav data belongs to one browser profile. Private browsing, storage cleanup,
profile changes, or device changes create an empty workspace. Restore an exported
backup.
