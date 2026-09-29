# LGU SSO consumer integration contract

Updated 29 September 2026. This replaces the former bearer-in-URL/shared-cookie integration. LGU SSO currently provides a custom authorization-code protocol for confidential server applications; it is not an OpenID Connect provider. A browser-only application needs a server component that can protect its client secret and bearer.

## Ownership

SSO owns employee identity, active status, application access, and one shared role per employee/application. Consumers own detailed business permissions such as procurement endorsement or document approval. Both checks are required for a business operation.

Supported shared roles are defined in `lgu-sso-backend/app/Enums/AppRole.php`. Read the role returned for your application; never infer it from another application's grant. Use the stable employee `uuid` as your external identity key. JWT `sub` is an internal database key.

## Registration

An SSO administrator registers the application, exact HTTPS callback URLs, and a rate limit suited to its authorization traffic. The administrator grants each employee an appropriate application role. New employees receive a one-time password and must finish password setup before entering an application.

Store the client ID, client secret, API URL, portal URL, and callback URL on the consumer server. A client ID is public; the client secret and bearer must never enter a browser bundle, browser storage, logs, or a URL. Use separate clients and secrets for separate applications and environments.

Local API: `https://sso.lgu.lan/api/v1`. Local portal: `https://sso-portal.lgu.lan`. The portal container uses the private API URL `http://lgu-sso:8000/api/v1`. Rebuilt consumers should receive their own deployment configuration. OPTS and Chat are not currently registered or running in this stack.

## Sign-in flow

1. The consumer server generates an unpredictable state of at least 32 random bytes. Store it in the user's short-lived server session. Preserve the intended destination as a validated local path.
2. Redirect the browser to `<portal>/sso/login?client_id=...&redirect_uri=...&state=...`, encoding each value.
3. The portal validates the exact callback. It uses its own host-only HttpOnly session or requests credentials and required password setup.
4. The portal sends the browser back to the registered callback with `code` and the original `state`. It never sends a bearer in the URL.
5. The consumer compares the returned state with the stored value using a constant-time comparison, then consumes the state. Reject missing, incorrect, expired, or reused state before exchanging the code.
6. The consumer server exchanges the code as below. Do not send an incoming browser Authorization header to SSO as a substitute.
7. Authorize the returned token. Create a local session containing the application bearer in server storage and issue an opaque, Secure, HttpOnly, host-only session cookie. Regenerate the local session identifier at login.
8. Redirect to the validated local destination, removing code/state from the displayed URL. Use `Cache-Control: no-store` and `Referrer-Policy: no-referrer` on the callback response.

The consumer and portal may use different domains. SSO works through redirects to the portal; consumers never receive or need a central cookie.

## Server-side code exchange

```http
POST /api/v1/sso/exchange
Content-Type: application/json
Accept: application/json
X-Client-ID: <your client ID>
X-Client-Secret: <your client secret>

{"code":"<one-time code>","redirect_uri":"https://your-app.example/auth/callback"}
```

Successful response:

```json
{"access_token":"<application bearer>","token_type":"bearer","expires_in":86400}
```

Use the returned `expires_in`; the example is not a guaranteed lifetime. The code expires after 60 seconds. The exact application, callback, source central session, employee status, password setup, and current application grant must still be valid. A consumed or expired code cannot be reused. Do not retry an ambiguous exchange indefinitely; restart sign-in with a new state if the response is lost.

## Authorize every protected request

```http
POST /api/v1/sso/authorize
Content-Type: application/json
Accept: application/json
X-Client-ID: <your client ID>
X-Client-Secret: <your client secret>

{"token":"<application bearer>"}
```

Successful response:

```json
{
  "authorized": true,
  "role": "standard",
  "employee": {"uuid":"<employee UUID>","full_name":"Example Employee","email":"employee@example.gov.ph"}
}
```

The server checks token signature/expiry, token revocation, application scope, active client credentials, active employee, completed password setup, and current grant. After this succeeds, enforce the consumer's detailed permission for the requested operation.

A local session or cached profile is not proof of current authorization. Do not skip this call because a local session exists. Do not serve protected content or perform actions if the check cannot complete. A timeout, network error, 429, or 5xx means authorization is unavailable; return a clear temporary-unavailability response and permit a later retry. Never convert these errors into success. A 401/403 ends local access and must not trigger an endless silent-login loop.

For long-lived connections, authorize at connection establishment and each protected operation. A previously authenticated WebSocket is not permission for later writes after a grant is revoked. Cache only profile/display information unless a separate, explicitly approved revocation-delay policy is introduced.

## Identity and directory endpoints

`POST /sso/validate` accepts the same credentials and bearer body. It returns `valid` plus `data`. `GET /sso/employee` accepts the bearer in the Authorization header and returns `data` plus your application's role. Both enforce the same application boundary and grant checks. The returned `applications` collection contains only the requesting application's grant.

`GET /sso/employees` uses client credentials and returns only active employees with completed password setup and a grant for that application. It is not a directory of every SSO employee. Do not use cached directory membership as authorization.

For role-aware discovery, use `GET /sso/directory` with an explicit `roles[]` allowlist and optional `search`, `page`, and `per_page`. Use `GET /sso/directory/{uuid}` with the same role filter to verify a prospective recipient currently. Both use server-side client credentials and filter active, password-ready employees by the requesting application before pagination. Responses contain only UUID, display name/initials, current role, and nullable office display fields. The legacy endpoint remains unchanged.

The [backend directory contract](../lgu-sso-backend/docs/consumer-directory.md) defines exact bounds, response shapes, errors, and tests. These endpoints describe source capability; verify the backend revision deployed in your environment before enabling a consumer. Consumers must authorize their own caller, choose allowed roles server-side, and deny contact when current recipient verification fails. Directory data never grants access to conversation content.

## Logout

**Sign out:** the consumer server calls `POST /api/v1/auth/logout` with `Authorization: Bearer <application bearer>`. On success, destroy the current local session and expire its cookie. This revokes only that bearer and preserves the portal and other applications. If SSO is unreachable, clear local access but report that remote revocation could not be confirmed; do not claim global logout. A user can return through the portal without another password while their central session remains valid.

**Sign out everywhere:** expose a separate action directing the user to their SSO portal account menu. The portal calls central-only `POST /auth/logout-all`, which revokes all employee tokens and pending codes. Every consumer's next protected request must fail authorization. Application bearers cannot invoke central administration, central refresh, password change, code issuance, or logout-all.

Application bearers cannot use `/auth/refresh`. When one expires, repeat the authorization-code flow. A still-valid portal session allows this without another password. Central refresh is reserved for the portal.

Changing a password revokes other sessions and outstanding codes, while preserving the current central session. Removing a grant revokes that application's issued tokens and pending codes. Regranting access requires a new sign-in; it does not revive old tokens.

## Retired endpoints and migration

`GET /sso/check` and `POST /sso/cookie-logout` return 410. Never read `lgu_sso_token` from a parent-domain cookie, pass a bearer in the callback URL, or persist a bearer in localStorage/sessionStorage. The portal's production cookie is `__Host-portal_session`; it is not a consumer credential.

The hardening migration invalidates all previously issued sessions once. Users must sign in again. Set the portal's `SSO_LEGACY_COOKIE_DOMAIN` to the former shared domain during migration so it can expire old browser cookies. Keep central cookies host-only in both local and production deployments.

## Required acceptance tests for each rebuilt consumer

- Valid code/state reaches the intended page; missing/wrong/reused state is rejected.
- Exact callback/client binding, expired codes, and code replay are enforced.
- Sign into two independently registered applications through one portal session; each receives a different scoped bearer.
- Application A's bearer cannot authorize as B or access central SSO administration.
- Grant removal, employee/application deactivation, token expiry, and password setup block protected requests and socket operations.
- Updated shared roles and local business permissions both affect authorization.
- Normal sign-out preserves other app/portal sessions; global sign-out causes all consumer tokens to fail their next check.
- Backend outage and rate limiting deny protected operations with a useful retry message.
- Client secrets and bearers remain server-side; callback URLs and browser storage contain no bearer.
