# Security policy

## Reporting a vulnerability

**Please do not open a public issue containing an exploit, secret, token, password, or private user information.**

Report vulnerabilities privately using [GitHub's private vulnerability reporting](https://github.com/huraamongonhur-ui/Red-Ribbon-Scans/security/advisories/new), if enabled for this repository. Include the affected page, reproducible steps, impact, and a suggested fix. Do not submit real user data.

If private vulnerability reporting is unavailable, create a public issue with only a **non-sensitive request for a private contact method**. Do not post vulnerability details there.

## Project security model

- The web app uses a public Supabase publishable/anon key in the browser. This key is **not** a secret; it must be paired with correctly configured database Row Level Security (RLS).
- Supabase service-role keys, database passwords, GitHub tokens, private keys, and Vercel secrets must **never** be committed or exposed by browser-facing APIs.
- Keep all access checks in database RLS policies. Hiding admin controls in frontend JavaScript is not an authorization boundary.
- Review SQL migrations before running them in Supabase. GitHub source files do not prove that production RLS policies are applied.
- If a secret was committed, immediately revoke or rotate it at the provider. Adding it to `.gitignore` or deleting it from a new commit does **not** remove it from repository history.

## Supported code

Security issues affecting the current `main` branch are prioritized. The maintainers do not guarantee fixes for older snapshots or third-party copies.
