# Instant User Sync via Webhook

**Date:** 2026-03-31
**Status:** Draft
**Builds on:** [SSO-Chat User Sync Design](2026-03-31-sso-chat-user-sync-design.md)

## Problem

After a new user registers in SSO, they don't appear in lgu-chat's "Start New Chat" dialog for up to 5 minutes (the periodic sync interval). Users expect to see new employees immediately.

## Solution: Webhook + Dialog Re-fetch

Two complementary changes:

1. **SSO fires a webhook** to lgu-chat on user registration, triggering an immediate sync
2. **NewChatDialog always re-fetches** the user list when opened (removing the stale cache check)

The existing 5-minute periodic sync remains as a fallback safety net.

## Changes Required

### 1. SSO Backend (LGU-SSO): Webhook on Registration

#### Configuration

New `.env` variables:

```
CHAT_WEBHOOK_URL=http://lgu-chat.test/api/webhook/sso-sync
CHAT_WEBHOOK_SECRET=<shared-secret-string>
```

New config file `config/webhooks.php`:

```php
return [
    'chat' => [
        'url' => env('CHAT_WEBHOOK_URL'),
        'secret' => env('CHAT_WEBHOOK_SECRET'),
    ],
];
```

#### Laravel Event: `EmployeeCreated`

**New file:** `app/Events/EmployeeCreated.php`

Dispatched in `AuthController::register()` after the user and application access records are created. Contains the employee model instance.

#### Laravel Listener: `SendEmployeeWebhook`

**New file:** `app/Listeners/SendEmployeeWebhook.php`

- Sends `POST` to `config('webhooks.chat.url')`
- Header: `X-Webhook-Secret: <secret>`
- Body:
  ```json
  {
    "event": "employee.created",
    "employee": {
      "uuid": "abc-123",
      "username": "j.doe",
      "email": "j.doe@lgu.gov.ph",
      "full_name": "John Doe",
      "first_name": "John",
      "middle_name": null,
      "last_name": "Doe",
      "position": null,
      "office_name": null,
      "is_active": true
    }
  }
  ```
- Uses `dispatch()->afterResponse()` so the registration HTTP response returns immediately without waiting for the webhook delivery
- Logs success/failure but does not retry (the 5-min poll is the fallback)
- Skips silently if `CHAT_WEBHOOK_URL` is not configured

#### Event Registration

**File:** `app/Providers/EventServiceProvider.php` (create if missing)

Register `EmployeeCreated` → `SendEmployeeWebhook` mapping.

#### Modified File: `AuthController::register()`

Add `EmployeeCreated::dispatch($employee)` after user creation and application access granting.

### 2. Chat Backend (lgu-chat): Webhook Endpoint

#### New API Route: `POST /api/webhook/sso-sync`

**New file:** `app/api/webhook/sso-sync/route.ts`

- Validates `X-Webhook-Secret` header against `SSO_WEBHOOK_SECRET` env var
- On valid request: calls existing `syncEmployees()` from `lib/sso-sync.ts`
- Returns `200 OK` with `{ "status": "synced" }`
- Returns `401 Unauthorized` if secret doesn't match
- Returns `500` if sync fails (with error logged)

#### Configuration

New `.env` variable for lgu-chat:

```
SSO_WEBHOOK_SECRET=<same-shared-secret-string>
```

### 3. Chat Frontend (lgu-chat): NewChatDialog Always Re-fetches

#### Modified File: `components/chat/NewChatDialog.tsx`

Change the `useEffect` from:

```typescript
useEffect(() => {
  if (isOpen && users.length === 0) {
    loadUsers();
  }
}, [isOpen]);
```

To:

```typescript
useEffect(() => {
  if (isOpen) {
    loadUsers();
  }
}, [isOpen]);
```

This ensures every time the dialog opens, it fetches the latest user list from the database — which the webhook has already populated.

## Data Flow

```
User registers in SSO
        │
        ▼
AuthController::register()
        │
        ├──► Returns 201 to user (immediate)
        │
        └──► EmployeeCreated event (afterResponse)
                │
                ▼
        SendEmployeeWebhook listener
                │
                ▼
        POST /api/webhook/sso-sync ──► lgu-chat
                                          │
                                          ▼
                                    syncEmployees()
                                    (fetches all from SSO,
                                     upserts into SQLite)
                                          │
                                          ▼
                                    New user now in DB
                                          │
                                          ▼
                              User opens "New Chat" dialog
                                          │
                                          ▼
                              loadUsers() fetches fresh list
                                          │
                                          ▼
                              New user visible instantly ✓
```

## Fallback Behavior

| Scenario | What happens |
|----------|-------------|
| Webhook succeeds | User visible immediately when dialog opens |
| Webhook fails (chat down) | 5-minute periodic sync catches up |
| Webhook URL not configured | No webhook sent, periodic sync only |
| User opens dialog before webhook arrives | Gets stale list, but next open gets fresh list |

## Files to Modify

### SSO Backend (LGU-SSO)

| File | Action | Description |
|------|--------|-------------|
| `app/Events/EmployeeCreated.php` | Create | Event class with employee data |
| `app/Listeners/SendEmployeeWebhook.php` | Create | HTTP POST to chat webhook |
| `app/Providers/EventServiceProvider.php` | Create | Event-listener registration |
| `app/Http/Controllers/Api/V1/AuthController.php` | Modify | Dispatch EmployeeCreated event |
| `config/webhooks.php` | Create | Webhook URL and secret config |
| `.env` | Modify | Add CHAT_WEBHOOK_URL, CHAT_WEBHOOK_SECRET |

### Chat App (lgu-chat)

| File | Action | Description |
|------|--------|-------------|
| `app/api/webhook/sso-sync/route.ts` | Create | Webhook receiver endpoint |
| `components/chat/NewChatDialog.tsx` | Modify | Remove `users.length === 0` condition |
| `.env` | Modify | Add SSO_WEBHOOK_SECRET |

## Security

- Webhook is authenticated via shared secret in `X-Webhook-Secret` header
- Secret is stored in env vars on both sides, never in code
- Webhook endpoint only triggers a sync (reads from SSO) — it doesn't accept user data directly from the payload, preventing spoofed user injection

## Edge Cases

- **Multiple rapid registrations:** Each triggers a webhook → full sync. The sync is idempotent (upserts), so concurrent syncs are safe.
- **SSO down when chat receives webhook:** Sync fails, logged as error, 5-min retry catches up.
- **Chat down when SSO sends webhook:** Webhook fails silently (afterResponse, no retry). 5-min poll catches up when chat comes back.
- **Webhook secret mismatch:** Returns 401, no sync triggered. Investigate env var configuration.

## Testing

1. **Happy path:** Register user in SSO → open "New Chat" in lgu-chat → new user appears immediately
2. **Webhook authentication:** Send POST without/wrong secret → verify 401 response
3. **Dialog re-fetch:** Open "New Chat", close it, register new user via direct DB insert, reopen dialog → new user appears
4. **Webhook failure resilience:** Stop lgu-chat, register user in SSO, start lgu-chat → user appears after next 5-min sync
5. **No webhook configured:** Remove CHAT_WEBHOOK_URL from SSO .env → registration still works, no errors logged
