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
