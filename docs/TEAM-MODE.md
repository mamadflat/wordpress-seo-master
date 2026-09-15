# Team mode and site-level access

The public 1.2.1 release is local-first. Team mode adds a server API and a
PostgreSQL database so one workspace can contain several users and sites while
each site has its own access list.

## Access model

- `owner`: owns the workspace and all sites.
- `admin`: manages workspace members and sites.
- `manager`: manages one site's members and connector settings.
- `editor`: reads and edits the assigned site's WordPress data.
- `viewer`: reads the assigned site's data only.

Workspace administrators can see every site in that workspace. Regular members
see only rows in `site_members`, and every site API request repeats that check
server-side. Hiding a site in the browser is never used as the security control.

## Local API setup

1. Install Node.js 20+ and PostgreSQL 16+ (or start `docker-compose.team.yml`).
2. Copy `.env.example` to `.env` and generate a random 32-byte hex key:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Set `DATABASE_URL`, `SEOKAV_ENCRYPTION_KEY`, and the exact frontend origin in
   `SEOKAV_WEB_ORIGINS`.
4. Install dependencies and start the API:

   ```powershell
   npm install
   npm run dev:api
   ```

5. For a hosted frontend, set the public API URL in `config.js` (for example
   `window.SEOKAV_API_BASE = 'https://api.example.com'`). This value is public;
   database credentials and encryption keys must remain only in the API
   environment.

The API creates the tables in `database/schema.sql` on startup. Connector keys
are encrypted with AES-256-GCM before they are stored. They are never returned
by the API and are only decrypted for an authorized WordPress proxy request.

## Example assignment

Create one workspace, invite four users, add five sites, then assign:

```text
Site 1: owner + user X (editor)
Site 2: owner only
Site 3: owner + user Y (editor)
Site 4: owner + user Z (viewer)
Site 5: owner + user W (manager)
```

The frontend still needs the API base URL configured before team mode can be
enabled in a hosted deployment. Do not place `DATABASE_URL` or
`SEOKAV_ENCRYPTION_KEY` in frontend code or GitHub Pages.

The first Team mode slice shares site access and live WordPress data. Existing
browser-local tasks, reports, and UI preferences remain per-user until a later
sync module moves them to the API.

To move an existing local workspace into Team mode, export its backup first,
create the sites in the Workspace, configure each connector key in the site's
settings, and then invite and assign members. The local backup is not uploaded
automatically.
