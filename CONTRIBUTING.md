# Contributing

Thank you for improving Seokav. Contributions can include bug fixes, accessibility
improvements, documentation, tests, new audits, taxonomy visualization work, and
WordPress connector improvements.

## Before You Start

1. Search existing issues and pull requests.
2. Open an issue for a large or behavior-changing proposal.
3. Never include real site data, connector keys, credentials, or client reports.
4. Use a staging WordPress site for all write testing.

## Development Workflow

```bash
git clone https://github.com/mamadflat/derakhtyar.git
cd derakhtyar
npm run check
npm run dev
```

Create a focused branch:

```bash
git switch -c fix/short-description
```

## Pull Request Requirements

- Explain the problem and the chosen solution.
- Keep unrelated changes out of the pull request.
- Update English documentation for user-visible or architectural changes.
- Update `CHANGELOG.md` for release-relevant changes.
- Preserve the Persian RTL product interface unless localization is the purpose.
- Preserve existing localStorage compatibility.
- Run `npm run check` and `git diff --check`.
- Test all affected pages in light and dark themes.
- Include screenshots for visual changes.
- Test connector writes only on staging and describe the test data used.

## Code Style

- Use clear, small functions and descriptive identifiers.
- Escape all remote and user-controlled values before HTML insertion.
- Avoid new runtime dependencies unless the tradeoff is documented.
- Keep the static deployment model intact unless a proposal explicitly changes it.
- Use semantic HTML and accessible names for interactive controls.
- Keep mobile and RTL layouts in scope for UI changes.

## Connector Changes

Update source under `wordpress-plugin/seokav-wordpress-connector/`. Keep the PHP
header version, class version, and readme stable tag aligned. Rebuild the ZIP and
inspect its top-level directory before committing.

## Commit Messages

Use a concise imperative summary, for example:

```text
Fix graph fit for wide taxonomies
Add connector endpoint documentation
Improve monthly task export
```

## Reporting Security Problems

Do not open a public issue for a vulnerability or exposed key. Follow
[SECURITY.md](./SECURITY.md).
