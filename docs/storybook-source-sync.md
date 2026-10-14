# Storybook source sync

The LGU Portal catalog at `/Users/jsonse/Documents/development/storybook-hub` is the visual authority for this application redesign. Its LGU Portal files are currently uncommitted, so these SHA-256 hashes identify the exact source inspected on 2026-09-29:

| Source file in Storybook Hub | SHA-256 |
| --- | --- |
| `packages/lgu-portal-ui/src/styles.css` | `5cb9b21db831eb207aacdf4c4452a9c48a99e081b7224cdeaca9090502d6c1ae` |
| `packages/lgu-portal-ui/src/portal.tsx` | `8a630c6c08ae8fe5b7f5d0dcedfac06c993cdabf1c96892ac90bae99227ed638` |
| `packages/lgu-portal-ui/src/selection.tsx` | `9c66555ecfd69447b2260a022f8971d5d0fcb6f6da4d7c4859ff5d94728abe74` |
| `projects/lgu-portal/src/catalog.css` | `200c6dd66e394c736f24a5bf700a00c74db65af9540480efda9028bb3e0c3080` |
| `projects/lgu-portal/src/admin.css` | `a1cc0527a37bf5bea0fe7b7660fc76b0fbb5c72f240840528e52c3e7d405c00a` |
| `projects/lgu-portal/DESIGN.md` | `c53cb8404f2947d39ec5901f423da2c674d3f967f2c6fc5359619933567fed0b` |

The consuming application uses its existing shadcn/ui Radix primitives. The Storybook package uses Base UI for some components, so importing it directly would introduce a second incompatible primitive stack. Application compositions follow the documented Storybook states, anatomy, tokens, and interaction behavior while retaining the app's existing shadcn components.

## Offices integration — 2026-10-15

The owner approved `Proposals/Office management` before implementation. These additional hashes identify the approved source used for the live `/offices` page. Earlier hashes above remain historical evidence.

| Source file in Storybook Hub | SHA-256 |
| --- | --- |
| `projects/lgu-portal/src/office-pages.tsx` | `84a3f58bc72e91dac8019c3fef2c99267fa5a5ae13e15d3d0fb072ef859db090` |
| `projects/lgu-portal/src/office-pages.css` | `05c1ec50aa3df3b0cb80a2688807862cfccb700b42902fc3a45c4b13b24bbc30` |
| `projects/lgu-portal/src/offices.stories.tsx` | `54d67071a18cbc29087ac237a80d65f574a190a5fd58eca57f2ba6cf377f500f` |
| `projects/lgu-portal/DESIGN.md` | `48f8ac0e3c3905b22707c3362b11bb20b51780f92376ac158c96df9f5706c214` |

`components/portal/office-management.tsx` adapts the approved composition to `lib/api/offices.ts`. `app/offices.css` preserves its layout and styling. The existing Radix Dialog and Select primitives replace catalog-only primitives. The live page removes the prototype banner and fixture storage. It adds backend field errors, busy states, and a shell navigation guard. No new design tokens or dependencies were introduced.

Desktop and mobile integration review returned **ship**, with no material fixes. The catalog retains synthetic fixtures; it never writes to SSO. Integration is verified locally, while staging is deferred. Captures and detailed test results are recorded in the workspace `.claude/reports/sso-office-management-report.md`.

## Position and CSV extension — 2026-10-15

The new position catalog follows the already approved Public Index office pattern. Office and position stories remain synthetic; the live components call the SSO API. These hashes pin the current visual sources without replacing earlier provenance.

| Source file in Storybook Hub | SHA-256 |
| --- | --- |
| `projects/lgu-portal/src/office-pages.tsx` | `8d05161ffd7ef3e068fcd790f308982435bba6d30a3753b5e8f5f3abd350244d` |
| `projects/lgu-portal/src/office-pages.css` | `91b0f2403a48c4f0fa67b48c063bf83fde2147ad7a1ac15203e3083bf0c24645` |
| `projects/lgu-portal/src/position-pages.tsx` | `789ee140f7c451077f660c7a7b26792224a7bc3f8a2a7e8a63fcdceaa0e6ea1c` |
| `projects/lgu-portal/src/positions.stories.tsx` | `d7c2af168c28dc02460cf13cc950ca07157816ef1ebe9215471a4442b6284612` |
| `projects/lgu-portal/src/fixture-csv.ts` | `57607f13c7fda20f8d63655a33938f4320de2ca51a02931134b58c3de7647cee` |
| `projects/lgu-portal/src/portal-prototype.tsx` | `debdca99e31b904ba96255d57f378d2ee46c08ae7ffbc57804f0da3de76e122a` |

Live mapping: `components/portal/position-management.tsx` uses `lib/api/positions.ts`; `components/portal/office-management.tsx` uses `lib/api/offices.ts`. Both use `lib/directory-csv.ts` for export and the current Radix primitives. The position view reuses `app/offices.css`; no new tokens or dependencies were added.
