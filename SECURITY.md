# Security Policy

## Supported Versions

Security fixes are applied to the current application release and the current
connector release.

| Component | Supported version |
| --- | --- |
| Seokav application | 1.2.x |
| Seokav Connector | 1.1.x |

## Report a Vulnerability

Use the repository's private **Security Advisories** feature:

1. Open the repository **Security** tab.
2. Select **Report a vulnerability**.
3. Describe the affected component and version.
4. Include reproduction steps, impact, and a proposed fix when available.

Do not open a public issue for vulnerabilities, connector keys, credentials, or
client data. Do not test against a production site without explicit authorization.

## Connector Key Exposure

If a connector key is exposed:

1. Open WordPress Admin > Tools > Seokav Connector.
2. Rotate the key immediately.
3. Replace the key in every trusted Seokav browser.
4. Review WordPress and web server logs.
5. Remove untrusted origins from the connector allowlist.

## Security Model and Limitations

- Seokav stores site data and connector keys in browser localStorage.
- Browser storage is not encrypted by Seokav.
- Anyone with access to the browser profile may access that workspace.
- The connector key permits privileged catalog operations from allowed origins.
- Public mode only reads data already exposed by the WooCommerce Store API.
- The project has no central Seokav server that can revoke browser state remotely.

Use HTTPS, a trusted browser profile, a restricted origin list, regular backups,
and key rotation. Never use Seokav on a shared or untrusted computer when a
connector key is stored.

## Disclosure Process

Maintainers will acknowledge a valid report, investigate impact, prepare a fix,
and coordinate disclosure. Public details should be released only after a fix or
mitigation is available.
