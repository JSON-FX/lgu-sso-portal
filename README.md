# lgu-sso-portal

Next.js login and administration portal for LGU single sign-on (SSO). The backend owns identity, application grants, and shared roles. Consumer applications own their detailed business permissions.

## Local stack

Run from the `lgu-dev` workspace root. Existing Traefik, MySQL, `dev-net`, local DNS, and trusted HTTPS certificates are required.

| Service | URL |
| --- | --- |
| Backend API | https://sso.lgu.lan |
| Portal | https://sso-portal.lgu.lan |

```sh
docker compose build lgu-sso lgu-sso-ui
docker compose up -d --no-build lgu-sso lgu-sso-ui
docker compose ps
```

OPTS and Chat are retired from this stack and their local SSO registrations are disabled. Their source folders and data remain available for rebuilding.

## Authentication contract

Browser requests use the same-origin `/api/sso-backend/*` server route. It stores the central bearer in a host-only, Secure, HttpOnly `__Host-portal_session` cookie in production builds. Development uses `portal_session`. The server never returns the bearer to browser JavaScript or forwards it to consumers. Unsafe requests must match `SSO_PORTAL_ORIGIN`.

A consumer redirects to `/sso/login` with its client ID, exact registered callback, and unpredictable state. Its server exchanges the returned one-time code using its own client credentials. Codes expire after 60 seconds. Tokens are bound to that application and cannot access portal/admin APIs or acquire central authority through refresh.

Consumers must validate current authorization for each protected request and deny access when SSO cannot be reached. Normal sign out revokes the current session only. The portal separately offers **Sign out everywhere**, which revokes all central and application sessions and outstanding codes.

See [LGU-SSO-INTEGRATION-GUIDE.md](LGU-SSO-INTEGRATION-GUIDE.md) for the complete API contract and consumer acceptance checks.

## Configuration and migration

Copy `.env.local.example` for development outside Docker, then run `npm ci` and `npm run dev`. Set the exact browser origin in `SSO_PORTAL_ORIGIN` and a server-reachable `SSO_API_URL`. Enable `SSO_TRUST_PROXY_HEADERS` only behind a trusted ingress that overwrites forwarded headers.

Docker uses `SSO_API_URL=http://lgu-sso:8000/api/v1` locally and `http://sso-web:8080/api/v1` in production. Mock API mode is disabled. Cookies never use a shared parent domain. `SSO_LEGACY_COOKIE_DOMAIN` only expires cookies left by earlier releases. The backend migration revokes legacy tokens once; existing users must sign in again.

## Production

Use the separate workspace `docker-compose.prod.yml`. Follow the [backend production runbook](../lgu-sso-backend/README.md#production-docker-stack) for secrets, TLS, administrator bootstrap, backups, and rollback. Supply trusted API/portal hostnames and the exact allowed portal origin. Never reuse local certificates or secrets.

```sh
production_env=/secure/path/sso-production.env
docker compose --env-file "$production_env" -f docker-compose.prod.yml config --quiet
docker compose --env-file "$production_env" -f docker-compose.prod.yml build
docker compose --env-file "$production_env" -f docker-compose.prod.yml up -d --no-build
```

Verify login, required password setup, grants, code exchange/replay, token isolation, backend outage behavior, and both logout options before admitting consumers. This local implementation does not constitute production deployment acceptance.

## Office server

The office deployment uses `https://sso.lguquezon.local` for this Portal and `https://api.sso.lguquezon.local` for the API. Follow the [office deployment runbook](../lgu-sso-backend/README.md#office-server-deployment) for the existing Nginx ingress and isolated SSO Compose stack.

## Office management

Super administrators can add offices, edit names and abbreviations, and deactivate or reactivate offices at `/offices`. The page uses the real SSO API, preserves drafts on failed saves, and confirms status changes. Successful writes update the shared records consumed by external applications. IDs and existing employee assignments remain stable.

See the [office contract](LGU-SSO-INTEGRATION-GUIDE.md#shared-office-directory) and [staging handoff](docs/office-management-staging.md). The current office feature depends on the newer reference-directory backend source; use the handoff's source paths instead of rebuilding the older primary backend checkout. Staging deployment is deferred until the owner is at the office.

## Position management and CSV exports

Super administrators manage positions at `/positions` using the same add, edit, deactivate, and reactivate flow as Offices. Both directories provide **Export all CSV** for the complete current management list. Position titles and status are reflected in consumer reference and employee endpoints on subsequent reads. The supplied October 8 position CSV matches all 306 existing seeded titles after normalization; this feature does not import or overwrite records.

See the [shared directory contract](LGU-SSO-INTEGRATION-GUIDE.md#shared-office-directory) and [staging handoff](docs/office-management-staging.md).

## Checks

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

### Shared profile photos

Employees and SSO super administrators can upload, replace and remove the shared default photo. Applications read it through the confidential directory photo endpoint and may keep a local override. See [integration guide](LGU-SSO-INTEGRATION-GUIDE.md#shared-employee-profile-photos).


## Account registration and recovery

`/register` is public and linked from sign-in. Users enter their details, choose a password and optionally select applications. The backend assigns LGU Connect Standard and other public applications Guest. The success view displays the generated username; users then sign in. Only superadministrators can change roles. Administrator application management is excluded from signup choices.

Superadministrators can generate a one-time temporary password from an employee's detail page. Existing sessions end, and the employee must choose a different personal password at next sign-in. Temporary credentials remain only in the open dialog and are cleared on Done. The acting administrator uses Change my password for their own account.

The local design catalog includes `Pages/Self registration` states. See `docs/storybook-source-sync.md` for canonical component sources. Public signup is not identity or employment verification.
