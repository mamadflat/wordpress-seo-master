# Changelog

All notable changes to Seokav are documented here. The project follows semantic
versioning and the structure of [Keep a Changelog](https://keepachangelog.com/).

## [1.2.1] - 2026-09-15

### Fixed

- Corrected repository and GitHub Pages URLs in project documentation and issue templates.
- Made release validation follow the current application version and verify connector metadata and security markers.
- Restricted authenticated content editing to supported post types and statuses.
- Made category reads and edits use the active WordPress category taxonomy when WooCommerce is unavailable.

### Changed

- Updated the bundled connector to 1.1.1 and rebuilt its release archive.

## [1.2.0] - 2026-09-03

### Added

- Full taxonomy overview graph with parent-child edges, branch colors, pan, zoom,
  fit-to-screen, minimap, search highlighting, and root filtering.
- Red visual treatment for categories with zero products.
- Persistent application-wide dark theme.
- Scheduled SEO task calendar with date, time, work type, planned duration, and
  completion timestamps.
- Monthly task summaries and CSV/JSON activity exports.
- English project documentation, connector source, build scripts, validation,
  contribution templates, and CI.

### Changed

- Category navigation now provides six complementary views.
- The application version is visible in the sidebar and tracked in `VERSION`.
- Large taxonomy graphs automatically fit to the available viewport.

## [1.1.0] - 2026-09-03

### Added

- Authenticated product editing and all-status product retrieval.
- Authenticated category editing, including hierarchy and SEO metadata.
- Interactive branch view with progressive expand/collapse controls.
- Public-first onboarding: categories and published products load without the
  connector, while editing prompts for connector installation.

## [1.0.0] - 2026-09-03

### Added

- Multi-site local dashboard.
- Public WooCommerce category and product import.
- Category tree, map, columns, and cards.
- Structure audit, local SEO tasks, category exports, and browser backup/restore.
- GitHub Pages deployment with no bundled site data.

[1.2.1]: https://github.com/mamadflat/wordpress-seo-master/releases/tag/v1.2.1
[1.2.0]: https://github.com/mamadflat/wordpress-seo-master/releases/tag/v1.2.0
[1.1.0]: https://github.com/mamadflat/wordpress-seo-master/commits/18c3862
[1.0.0]: https://github.com/mamadflat/wordpress-seo-master/commits/c834407
