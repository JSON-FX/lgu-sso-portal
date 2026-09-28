# LGU Portal design implementation

## Goal

Apply the LGU Portal Storybook Public Index direction to every rendered portal route. Keep live API calls, form fields, application grants, SSO callback validation, authorization, and logout semantics intact. Commit each completed page after its checks pass.

## Authority and source sync

- Design: `storybook-hub/projects/lgu-portal/DESIGN.md` and the 16 route stories in `docs/page-coverage.md`.
- Components: official shadcn/ui primitives already installed in `components/ui/`; adapt the Storybook `PortalBrand`, `PortalHeading`, `PortalStatus`, `PortalSelect`, and `PortalDatePicker` compositions to the application's Radix-based shadcn version.
- Storybook LGU Portal files are not committed in the hub yet. Record the exact source file hashes in `docs/storybook-source-sync.md` rather than claiming a pinned commit.
- Use Public Index: warm paper, dark ink, forest-green actions, Source Sans 3 records, Source Serif 4 headings, fine rules, and a separate administration workspace.

## Implementation order

1. Foundation and `/login`: tokens, fonts, shared brand/auth components, responsive authentication form.
2. `/sso/login`: reuse the auth frame; preserve redirect validation, existing-session checks, setup redirect, and code issuance.
3. `/setup-account`: preserve password change and completion redirect behavior.
4. `/portal/applications`: searchable real grants, distinct load error and empty states, access details without invented launch links.
5. `/portal`: real profile fields and address cascade, no administration-only lookups for self-service.
6. `/portal/change-password`: preserve current session and password policy.
7. `/dashboard`: real overview; do not label API reachability as system health.
8. `/employees`: searchable, paginated real directory.
9. `/employees/new`: all existing fields and validation, searchable long lists, shadcn date picker.
10. `/employees/[uuid]`: all existing details and update actions.
11. `/employees/[uuid]/applications`: existing grant/revoke flow and roles.
12. `/applications`: real application directory.
13. `/applications/new`: existing client registration and secret handling.
14. `/applications/[uuid]`: existing configuration and secret rotation.
15. `/applications/[uuid]/employees`: existing employee grants.
16. `/audit`: real audit records, filtering, and pagination.

The two workspace layouts share responsive navigation and account actions. `/` and `/register` remain redirects. No new backend endpoint or application launch URL is assumed.

## Per-page gate

For each page: compare the Storybook route at desktop and mobile sizes; check states, keyboard operation, and responsive layout; run `npx tsc --noEmit`, `npm run lint`, and relevant `npm test` checks; review the diff; commit only that page and its needed shared changes. Run `npm run build` and the complete checks before the final handoff. Protect unrelated `.gitignore` and `.playwright-mcp/` changes from commits.
