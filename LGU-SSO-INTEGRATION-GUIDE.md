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

## Shared office directory

SSO owns office names, abbreviations, and active status. Super administrators manage these records on the portal's `/offices` page. Connected applications read the same records through these server-to-server endpoints:

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/sso/offices` | Searchable, paginated active offices. |
| `GET /api/v1/sso/offices/{id}` | Current metadata for an office, including inactive historical records. |
| `GET /api/v1/sso/directory` | Application-scoped employees with current `office_id`, `office_name`, and `office_abbreviation`. |

Send `X-Client-ID` and `X-Client-Secret` from the consumer server. Office responses contain `id`, `name`, `abbreviation`, and boolean `is_active`. Lists accept `search` (maximum 100 characters), `page` (1–10000), and `per_page` (1–100, default 50); follow `meta.has_more`. The employee directory separately requires `roles[]` and uses a maximum page size of 50. See the backend's `docs/consumer-directory.md` for the complete directory contract.

Office edits appear on subsequent endpoint reads. Deactivation removes the office from active lists; its ID, employee assignments, and detail lookup remain available. Reactivation restores the same office to active lists. Existing employees are not deactivated when their office is deactivated. Keep historical transaction snapshots in the consumer when the original display name matters. Do not treat reference metadata as authorization.

There is no push synchronization to consumers. Applications that copy or cache office data must refresh it. Reference IDs belong to one SSO database; do not assume staging and production IDs match.

### Portal administration contract

These routes require an active central SSO session, completed password setup, and a current `super_administrator` grant on the active **Admin App Management System** application. Consumer credentials and application bearers cannot write office data.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/offices?include_inactive=1` | Complete management list. Omit the flag for active offices only. |
| `GET /api/v1/offices/{id}` | Current record, including inactive offices. |
| `POST /api/v1/offices` | Create from `name` and `abbreviation`; starts active, returns 201. |
| `PUT /api/v1/offices/{id}` | Update supplied `name`, `abbreviation`, or boolean `is_active`; returns 200. |

Management responses use `{data: {id, name, abbreviation, is_active}}`. Names and abbreviations are trimmed, required when supplied, and case-insensitively unique, including inactive records. Length limits are 255 and 20 characters. Creation must omit `is_active`. Invalid fields return 422 with field errors. Metadata saves omit status; activation changes send only `is_active`. Writes and audit records commit together.

Self-service `GET /api/v1/portal/offices` always excludes inactive offices, even if a caller supplies `include_inactive=1`. Office management adds no schema migration or seeder requirement. Do not rerun snapshot reference seeders to deploy it; they can overwrite managed data.

### Position administration contract

Positions use the same central SSO super-administrator boundary as Offices. `GET /api/v1/positions` is active-only by default; `include_inactive=1` returns all records. `GET /positions/{id}` includes inactive records. `POST /positions` accepts a `title` and starts active; `PUT /positions/{id}` accepts a partial `title` or boolean `is_active`. Responses contain `data: {id, title, is_active}`. Titles are trimmed, required when supplied, case-insensitively unique including inactive records, and limited to 255 characters. Invalid fields return 422. Successful mutations and audit records commit together.

Self-service `GET /api/v1/portal/positions` always excludes inactive positions. External applications use `GET /api/v1/sso/positions` and `GET /api/v1/sso/positions/{id}` with server-side client credentials. The list is searchable and paginated, active-only; the detail route retains historical inactive references. Employee responses and the application-scoped directory retain `position_id` and show the current title. Deactivation does not alter employee assignments. A consumer that caches titles must refetch; no push notification is sent.

The portal's Offices and Positions pages offer **Export all CSV**. These downloads include all management rows, including inactive records, regardless of the current page filters. Offices columns are `id,name,abbreviation,is_active`; positions columns are `id,title,is_active`. `is_active` uses `true` or `false`. CSV text is quoted and guarded against spreadsheet formulas. Current employee counts are not included. Export is disabled until the full management list loads.

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

## Shared employee profile photos

SSO is the default source of employee photos. Applications may keep an independent override; deleting that override should restore the current SSO photo, then initials when absent. Never write an application's override back to SSO implicitly.

Employee resources and `/sso/directory` entries add nullable `avatar_version` (opaque UUID) and `avatar_endpoint` (relative `/api/v1/sso/directory/{uuid}/avatar`). No photo means both are null. Existing fields retain their semantics.

Read the photo server-side with `GET /api/v1/sso/directory/{uuid}/avatar?roles[]=standard` and the same `X-Client-ID` / `X-Client-Secret` headers as the directory. Include each supported role explicitly. The endpoint derives application scope from active credentials and rechecks the target's active status, completed password setup, current grant and role. Ineligible, deleted or absent photos return404; invalid credentials401; missing/invalid roles422; rate limits429. No bearer or client secret belongs in an image URL or browser JavaScript.

Success is `image/webp`,512×512, at most524288bytes, with `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Construct the URL against the fixed configured SSO API origin; do not fetch arbitrary upstream URLs or follow redirects. Proxy through the consumer's current authenticated session and business visibility checks. Widgets fetch bytes with their existing opaque credential and display a bounded Blob. An unavailable SSO must not grant access through stale cached authorization.

`avatar_version` changes per successful replacement and becomes null on removal. Refresh metadata during current profile/directory/member reads; do not synchronize only at login. The image endpoint always resolves the current photo and does not expose historical versions. An old version query is not an access credential. Consumers may keep their own versioned in-memory UI state but must refresh it and clear removed images.

Central employee self-service: GET/POST/DELETE `/api/v1/portal/profile/avatar`. Super administrators: GET/POST/DELETE `/api/v1/employees/{uuid}/avatar`. POST uses multipart field `photo`; JPG/PNG/WebP up to5MiB, dimensions256–4096 per side, at most16millionpixels. The Portal frames a512px square before submitting. Direct API images are center-cropped. The server independently decodes/re-encodes; submitted originals/metadata are not retained. Writes return EmployeeResource and are audited. Consumer bearers cannot write these routes.

Avatar files use the private persistent `storage/app/private/avatars` disk. Include it in storage backups. The additive nullable migration supports rollback to the previous application image without dropping columns or reversing migrations. Do not make the avatars disk publicly served.
