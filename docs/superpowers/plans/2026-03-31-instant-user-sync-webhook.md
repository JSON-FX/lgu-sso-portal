# Instant User Sync Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make newly registered SSO users appear instantly in lgu-chat's "New Chat" dialog by adding a webhook from SSO to chat, plus always-fresh user loading on dialog open.

**Architecture:** SSO Laravel backend fires an `EmployeeCreated` event after registration. A listener sends a POST webhook to lgu-chat. lgu-chat exposes a webhook endpoint that triggers the existing `syncEmployees()`. The NewChatDialog is changed to always re-fetch users on open.

**Tech Stack:** Laravel 11 (PHP), Next.js 15 (TypeScript), SQLite, HTTP webhooks

---

### Task 1: Create webhook config in LGU-SSO

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/config/webhooks.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/.env.example`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/.env`

- [ ] **Step 1: Create `config/webhooks.php`**

```php
<?php

return [
    'chat' => [
        'url' => env('CHAT_WEBHOOK_URL'),
        'secret' => env('CHAT_WEBHOOK_SECRET'),
    ],
];
```

- [ ] **Step 2: Add env vars to `.env.example`**

Append to the end of `/Users/jsonse/Documents/development/LGU-SSO/.env.example`:

```
CHAT_WEBHOOK_URL=
CHAT_WEBHOOK_SECRET=
```

- [ ] **Step 3: Add env vars to `.env`**

Append to the end of `/Users/jsonse/Documents/development/LGU-SSO/.env`:

```
CHAT_WEBHOOK_URL=http://lgu-chat.lguquezon.local/api/webhook/sso-sync
CHAT_WEBHOOK_SECRET=webhook-secret-lgu-chat-sso-sync
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add config/webhooks.php .env.example
git commit -m "feat: add webhook configuration for chat sync"
```

Note: Do NOT commit `.env` — it contains secrets.

---

### Task 2: Create EmployeeCreated event in LGU-SSO

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/app/Events/EmployeeCreated.php`

- [ ] **Step 1: Create `app/Events/EmployeeCreated.php`**

```php
<?php

namespace App\Events;

use App\Models\Employee;
use Illuminate\Foundation\Events\Dispatchable;

class EmployeeCreated
{
    use Dispatchable;

    public function __construct(public Employee $employee)
    {
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add app/Events/EmployeeCreated.php
git commit -m "feat: add EmployeeCreated event"
```

---

### Task 3: Create SendChatWebhook listener in LGU-SSO

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/app/Listeners/SendChatWebhook.php`

- [ ] **Step 1: Create `app/Listeners/SendChatWebhook.php`**

```php
<?php

namespace App\Listeners;

use App\Events\EmployeeCreated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendChatWebhook
{
    public function handle(EmployeeCreated $event): void
    {
        $url = config('webhooks.chat.url');
        $secret = config('webhooks.chat.secret');

        if (empty($url) || empty($secret)) {
            return;
        }

        $employee = $event->employee->load(['office', 'position']);

        try {
            Http::timeout(5)
                ->withHeaders([
                    'X-Webhook-Secret' => $secret,
                ])
                ->post($url, [
                    'event' => 'employee.created',
                    'employee' => [
                        'uuid' => $employee->uuid,
                        'username' => $employee->username,
                        'email' => $employee->email,
                        'first_name' => $employee->first_name,
                        'middle_name' => $employee->middle_name,
                        'last_name' => $employee->last_name,
                        'full_name' => $employee->full_name,
                        'position' => $employee->position?->title,
                        'office_name' => $employee->office?->name,
                        'is_active' => $employee->is_active,
                    ],
                ]);

            Log::info('[Webhook] Chat sync triggered for new employee: ' . $employee->username);
        } catch (\Exception $e) {
            Log::warning('[Webhook] Failed to notify chat: ' . $e->getMessage());
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add app/Listeners/SendChatWebhook.php
git commit -m "feat: add SendChatWebhook listener"
```

---

### Task 4: Register event-listener and dispatch in AuthController

**Files:**
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Providers/AppServiceProvider.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Controllers/Api/V1/AuthController.php`

- [ ] **Step 1: Register event-listener in `AppServiceProvider.php`**

Add the event-listener mapping in the `boot()` method of `/Users/jsonse/Documents/development/LGU-SSO/app/Providers/AppServiceProvider.php`. The file currently has empty `register()` and `boot()` methods.

Replace the file contents with:

```php
<?php

namespace App\Providers;

use App\Events\EmployeeCreated;
use App\Listeners\SendChatWebhook;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen(EmployeeCreated::class, SendChatWebhook::class);
    }
}
```

- [ ] **Step 2: Dispatch event in `AuthController::register()`**

In `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Controllers/Api/V1/AuthController.php`, add the import at the top of the file (after the existing `use` statements):

```php
use App\Events\EmployeeCreated;
```

Then in the `register()` method, add the event dispatch after the application access granting loop (line 89) and before the return statement (line 91). Insert this line:

```php
        EmployeeCreated::dispatch($employee);
```

The end of the `register()` method should look like:

```php
        // Auto-grant guest role on all active applications
        $applications = \App\Models\Application::where('is_active', true)->get();
        foreach ($applications as $app) {
            $employee->applications()->attach($app->id, [
                'role' => \App\Enums\AppRole::Guest->value,
            ]);
        }

        EmployeeCreated::dispatch($employee);

        return response()->json([
            'username' => $username,
            'message' => 'Registration successful',
        ], 201);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add app/Providers/AppServiceProvider.php app/Http/Controllers/Api/V1/AuthController.php
git commit -m "feat: dispatch EmployeeCreated event on registration"
```

---

### Task 5: Create webhook endpoint in lgu-chat

**Files:**
- Create: `/Users/jsonse/Documents/development/lgu-chat/app/api/webhook/sso-sync/route.ts`
- Modify: `/Users/jsonse/Documents/development/lgu-chat/.env`

- [ ] **Step 1: Add env var to `.env`**

Append to the end of `/Users/jsonse/Documents/development/lgu-chat/.env`:

```
# Webhook secret for SSO sync notifications
SSO_WEBHOOK_SECRET=webhook-secret-lgu-chat-sso-sync
```

This must match the `CHAT_WEBHOOK_SECRET` value in the LGU-SSO `.env`.

- [ ] **Step 2: Create `app/api/webhook/sso-sync/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { syncEmployees } from '../../../../lib/sso-sync';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');

  if (!secret || secret !== process.env.SSO_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await syncEmployees();
    return NextResponse.json({ status: 'synced' });
  } catch (error: any) {
    console.error('[Webhook] SSO sync failed:', error.message);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-chat
git add app/api/webhook/sso-sync/route.ts
git commit -m "feat: add webhook endpoint for SSO sync"
```

---

### Task 6: Make NewChatDialog always re-fetch users on open

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-chat/components/chat/NewChatDialog.tsx:43-46`

- [ ] **Step 1: Update the useEffect in NewChatDialog.tsx**

In `/Users/jsonse/Documents/development/lgu-chat/components/chat/NewChatDialog.tsx`, change lines 43-46 from:

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

This removes the `users.length === 0` condition so the user list is always fetched fresh when the dialog opens, not just the first time.

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-chat
git add components/chat/NewChatDialog.tsx
git commit -m "feat: always re-fetch users when New Chat dialog opens"
```

---

### Task 7: Manual end-to-end test

- [ ] **Step 1: Start both services**

Make sure both LGU-SSO (`php artisan serve` or via Herd/Valet) and lgu-chat (`npm run dev`) are running.

- [ ] **Step 2: Register a new user in SSO**

Open the SSO registration page and register a new test user. Check the LGU-SSO logs to confirm:
- `[Webhook] Chat sync triggered for new employee: <username>` appears

- [ ] **Step 3: Verify in lgu-chat**

Open lgu-chat, click "New Chat" — the newly registered user should appear in the list immediately without waiting 5 minutes.

- [ ] **Step 4: Test webhook auth failure**

Temporarily change `SSO_WEBHOOK_SECRET` in lgu-chat's `.env` to a wrong value, restart lgu-chat, register another user in SSO. Confirm:
- LGU-SSO logs show `[Webhook] Failed to notify chat` (401 response)
- The user still appears after the next 5-minute periodic sync

- [ ] **Step 5: Restore correct secret**

Change `SSO_WEBHOOK_SECRET` back to the correct value and restart lgu-chat.
