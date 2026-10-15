# Profile photo source sync — 2026-10-15

Approved prototype: https://storybook.lan/lgu-portal/?path=/story/proposals-profile-photos--my-profile

Source was uncommitted in the shared hub. This explicit snapshot records the sources copied and adapted, preserving unrelated catalog work.

- `projects/lgu-portal/src/avatar-prototype.tsx` SHA-256 `9fdc06c256716a8868c5baab40ba1276623eeffcf13f47b249c1d23473ff1503`
- `projects/lgu-portal/src/avatar-prototype.css` SHA-256 `d7532320424211f34cbffe57498d9c725a7c807bdfae135017daab28579c2b3c`
- `packages/lgu-portal-ui/src/ui/slider.tsx` SHA-256 `c24627a138bfc0c131d46d788d9d86e07e2586afc3d8f737131f4db325a91479`
- `packages/lgu-portal-ui/src/ui/alert-dialog.tsx` SHA-256 `e3b77f9def7d5afe9c7f2ae198756b05f16ea4c97f7204d82b2f0cdf0c893cd2`

## Adaptations

`components/portal/profile-photo.tsx` adapts the approved prototype to live Employee data and self-service or administrator context. Employees and super administrators can upload, crop, replace, and remove an SSO profile photo. Multipart upload and deletion use the existing host-cookie proxy. Header state changes only after successful persistence; open employee forms retain unsaved fields. The fictional portrait and catalog shell are not shipped.

The client retains JPG, PNG, and WebP support, a minimum of 256 pixels per dimension, and a 5 MiB file limit. It adds an upper bound of 4096 pixels per side and 16 million total pixels. The UI labels the file limit as “5 MB”; enforcement uses `5 * 1024 * 1024` bytes. Framing retains the 512 × 512 canvas, zoom, four reposition controls, and 90-degree rotation. Failed saves preserve the existing photo and allow retry. Cancellation leaves the saved photo intact.

The SSO backend validates the submitted raster again, decodes it, and re-encodes it as a 512 × 512 WebP. Storage remains private, and responses do not expose storage paths. Connected applications use a credential-scoped endpoint through their own authenticated proxy.

## Shared-photo ownership

SSO supplies the default employee photo. Each connected application may retain its own photo override. Removing an application override returns that application to the current SSO photo, or initials when no SSO photo exists. Removing the SSO photo leaves application overrides unchanged.

The LGU Connect panel is a preview of the default appearance. Its local refresh after a Portal save does not establish live Connect synchronization. The Connect chat owns that integration separately; this implementation supplies the authenticated endpoint it can consume.

## Source continuity and design preservation

The final documentation pass compared the approved hub sources with the Portal implementation on 2026-10-15. All four source hashes above still matched. `app/profile-photo.css` is byte-for-byte identical to the prototype stylesheet. Portal's Slider and AlertDialog differ from their canonical package sources only in the `cn` utility import path. The Slider retains the optional `thumbProps` adaptation, including the “Photo zoom” label and percentage announcement.

The component uses Portal's existing Avatar, Button, and Dialog primitives. Existing semantic colors, typography, focus behavior, and responsive rules remain authoritative. The photo workspace has two columns above 800 pixels and stacks below that breakpoint. Circular portraits, a compact message preview, and the framing dialog extend the established Public Index design. No generated portrait asset was copied into the application.

The hub's `PRODUCT.md`, `DESIGN.md`, and tokens remain unchanged. The incumbent design document uses its existing proposal format; this ordinary extension does not authorize a schema migration, sidecar creation, or system redesign. Prototype shell selectors retained in the copied stylesheet are provenance, not new global design rules.

## Validation and release boundary

The implementation owner reported 225 passing backend tests, 15 passing Portal tests, a successful Portal build, and a successful TypeScript check. Six existing lint warnings remain. The separate fresh release reviewer reported “ship” with no material findings. These are implementation and review results; this documentation pass did not rerun those checks.

Local review screenshots are recorded at `.impeccable/review/avatar/desktop.png`, `mobile.png`, `crop-desktop.png`, and `crop-mobile.png`. Source comparison in this pass independently confirmed stylesheet and primitive continuity. It does not replace browser acceptance.

Staging deployment and acceptance remain pending at this handoff. No production acceptance or deployed Connect integration is claimed here.

## Catalog copy follow-through

The approved prototype’s sharing, preview, and removal copy now describes the confirmed application-override policy. Its original snapshot above remains the implementation source record. The updated prototype SHA-256 is `80abf3d1236e0b86608106be1062f251c17a472e75b34c1bfbbb6a3a9df8a0e6`. No composition or tokens changed.
