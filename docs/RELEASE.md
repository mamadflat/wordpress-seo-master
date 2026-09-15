# Release Process

## 1. Prepare

1. Select a semantic version.
2. Update `VERSION`, `package.json`, `APP_VERSION`, the UI version badge, and
   `CHANGELOG.md`.
3. Update connector version fields separately when connector behavior changes.
4. Rebuild `seokav-connector.zip` when connector source changes.

## 2. Validate

```bash
npm run check
git diff --check
git status --short
```

If the connector changed, inspect `unzip -l seokav-connector.zip`.

## 3. Test

Run `npm run dev` and execute the manual matrix in
[Development](./DEVELOPMENT.md#manual-test-matrix).

Release gates:

- all eight pages render in light and dark themes;
- public category and product import works;
- the complete graph fits, pans, zooms, filters, and marks empty nodes;
- tasks create, complete, aggregate, and export to CSV/JSON;
- connector onboarding works without a key;
- authenticated category and product edits work on staging;
- no site data or connector key is committed.

## 4. Commit and Push

```bash
git add -A
git commit -m "Release Seokav vX.Y.Z"
git push origin main
```

Wait for validation and GitHub Pages deployment.

## 5. Tag and Publish

```bash
git tag -a vX.Y.Z -m "Seokav vX.Y.Z"
git push origin vX.Y.Z
```

Create a GitHub Release from the tag, use the matching changelog section as
release notes, and attach `seokav-connector.zip`.

## 6. Verify Production

Open `https://mamadflat.github.io/wordpress-seo-master/?v=X.Y.Z`. Verify the UI version,
complete graph on a real site, theme switch, and monthly task report.

## Rollback

Create and push a normal revert commit for the broken release, wait for Pages,
verify production, and document the incident in the next changelog entry. Do not
rewrite public history.
