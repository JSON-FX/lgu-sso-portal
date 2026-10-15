# Dashboard audit action crash

User-reported production failure, 2026-10-15. No GitHub issue was supplied.

Severity high: administrator dashboard fails after directory changes. Complexity low; confidence high: browser TypeError and source match.

Reproduction: open dashboard with office_updated among five recent events. Browser reports undefined.toLowerCase in activity.map.

Root cause: dashboard/page.tsx:50 indexes a closed six-action map then lowercases undefined. AuditLogResource returns real backend action strings unchanged. Directory events were introduced in backend e6b64de; dashboard mapping dates to8513bf3. Existing pending form release does not fix this.

Fix: shared display labels for existing auth, SSO and directory events with safe future-action fallback. Use in dashboard labels, accessible names and details; audit labels/filter choices share it. Extend known action type while allowing future server actions in records. Do not change authorization or audit storage.

Validate: node regression tests for all known and unknown/malformed actions; TypeScript, lint, production build; authenticated browser dashboard and event detail. Review diff, release through staging then production.

## Implementation and review
Shared label helper added and used by both dashboard and audit pages. Tests cover all known events, directory labels, future events, malformed values and inherited property names. Thirteen tests passed; TypeScript, lint (six pre-existing warnings), build and diff checks passed. Review found no changes to authorization, audit persistence or unrelated source. Authenticated staged and production rendering remains the release check.
