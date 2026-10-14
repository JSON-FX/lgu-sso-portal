# Office and position management staging handoff

Status: Offices and Positions implemented and verified locally on 2026-10-15. Staging and production have not been changed. The owner requested staging deployment after arriving at the office. Changes are uncommitted and unpushed; do not treat branch names as published revisions.

## Required sources

| Component | Local source | Branch / dependency |
| --- | --- | --- |
| Backend | `../.worktrees/sso-reference-directory` | `feature/sso-office-management`, based on `4409e76` |
| Portal | This repository | `feature/sso-office-management`, based on the existing portal redesign |

The primary `../lgu-sso-backend` checkout is older. A normal root Compose rebuild would use that older source. The local implementation was built with `/tmp/sso-office-local-compose.yml`, which overrides `lgu-sso.build.context` to the reference-directory worktree and uses image `lgu-sso-office-management:local-20261015`. It explicitly sets `SSO_AUTO_SEED=false`. Preserve that source selection when rebuilding locally until the feature is integrated into the primary checkout.

## Verified locally

- Full backend Pest suite: 185 tests, 874 assertions, isolated SQLite.
- Portal proxy tests: 9 passing.
- TypeScript, production build, both Docker builds, and changed-file lint/Pint checks pass.
- Full portal lint has zero errors and six existing warnings outside the new office code.
- Browser checks cover add, edit, deactivate, reactivate, duplicate validation, retained drafts during an outage, retry, reload persistence, guarded navigation, and desktop/mobile layouts.
- Consumer reads confirm renamed office metadata, active-list exclusion/restoration, inactive detail lookup, and preserved employee references.
- Mutating browser checks used a disposable SQLite database. No synthetic records were added to shared MySQL.

## When the owner is at the office

1. Follow the `mis-deploy-app` workflow and inspect current staging/network access. Confirm exact backend and portal revisions and preserve unrelated local work before preparing release commits.
2. Include the reference-directory dependency in the backend release. Build both services from the verified sources; record immutable image/revision identifiers.
3. Take the required staging backup and inspect pending migrations. These directory-management features add no schema migrations. Do not rerun OfficeSeeder, PositionSeeder, or broad seeders: snapshot seeds can overwrite managed names and active status. Any uninstalled reference-data dependency needs separate reconciliation against current staging data.
4. Deploy to staging only after the owner resumes that step. Verify login and the super-admin role on the active Admin App Management System application.
5. Run an agreed staging acceptance using reversible test records: create, rename, abbreviate offices, edit position titles, deactivate/reactivate both, export both CSVs, and confirm the consumer endpoints. Check non-admin and consumer-token denial, preserved IDs/assignments, draft recovery, and ordinary portal navigation.
6. Confirm existing consumer applications refresh reference data. SSO returns updated values on subsequent reads; it does not push updates to consumer caches.

Keep production unchanged. Rolling back an image does not undo office metadata edits or invalidate the need to preserve business history.

## Position and export extension

The owner added position management and CSV exports after the office implementation. The supplied October 8 position export contains 306 unique decoded titles; its title set matches the existing PositionSeeder exactly. Its `Active Employees` values are a dated snapshot, not data to import into SSO. No seeder run or employee reassignment is part of this extension. The local SSO database currently holds 349 positions, 303 active; the extra inactive rows are retained history beyond the 306-title snapshot. Reconcile target staging data independently before deployment.

Position administration uses the current central super-admin grant. Consumer `/sso/positions` remains active-only and paginated; `/sso/positions/{id}` keeps inactive detail. Employee position IDs and current title fields remain intact. Both portal directories export all current management records, including inactive rows, with stable IDs and boolean status. The download refetches the API to include later changes by other administrators; a backend error shows a retryable message. CSV downloads omit dated staffing counts.

The local checks for the extended feature are recorded in `.claude/reports/sso-position-management-and-csv-export-report.md`. The earlier counts in the office-only section above are historical baseline results; use the new report for final release acceptance. Staging and production remain unchanged until the owner resumes deployment at the office.
