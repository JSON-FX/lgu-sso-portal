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

## Checks

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Consumer directory contract

The [integration guide](LGU-SSO-INTEGRATION-GUIDE.md#identity-and-directory-endpoints) documents the backend’s role-aware directory and current recipient lookup. Consumer servers use confidential credentials; the portal does not expose these routes to browsers. Verify deployment of the corresponding backend revision before enabling consumers.
