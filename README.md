# LGU-SSO UI

User-facing Single Sign-On login portal for the LGU platform. Users are redirected here by sibling apps (opts2026, lgu-chat) to authenticate; after sign-in the portal redirects back to the originating app with an access token.

Built with [Next.js](https://nextjs.org) 15 + TypeScript. The portal calls the LGU-SSO backend API for credential validation and token issuance.

<!-- lgu-ecosystem:start -->
## LGU Ecosystem

This project is one of four applications that make up the LGU platform, all running inside the shared Docker container **development**:

| Project     | Role                       | Dev URL                                 | Prod URL                                            |
|-------------|----------------------------|-----------------------------------------|-----------------------------------------------------|
| LGU-SSO     | Authentication API         | http://api.sso.local                    | https://api.sso.lguquezon.local                     |
| lgu-sso-ui  | SSO login portal           | http://sso-portal.local                 | https://sso-portal.lguquezon.local                  |
| lgu-chat    | Real-time messaging        | http://chat.local                       | https://chat.lguquezon.local                        |
| opts2026    | Procurement tracking       | http://opts.local                       | https://opts.lguquezon.local                        |

Authentication works in two hops: apps redirect users to the **login portal** (`sso-portal.*`), and then talk to the **SSO API** (`api.sso.*`) server-to-server to validate tokens and fetch the user profile. The legacy names `sso-ui.*`, `lgu-sso.test`, and `lgu-sso.local` are being phased out — always use `sso-portal.*` and `api.sso.*`.

Dev and production configurations must be identical except for DNS hostnames, secrets, and `APP_ENV`/`NODE_ENV`/`APP_DEBUG`. See the workspace-level [`../CLAUDE.md`](../CLAUDE.md) for the full ecosystem overview, authentication model, and the list of known cross-app issues.
<!-- lgu-ecosystem:end -->

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or [http://sso-portal.local](http://sso-portal.local) inside the `development` Docker container) to view the portal.

### Environment

Copy `.env.local.example` → `.env.local` and fill in the SSO API URL and client credentials. See the [Integration Guide](LGU-SSO-INTEGRATION-GUIDE.md) for what each variable is for.

## SSO Integration Guide

For full documentation on integrating a new app with LGU-SSO (register client, implement callback, validate tokens), see [`LGU-SSO-INTEGRATION-GUIDE.md`](LGU-SSO-INTEGRATION-GUIDE.md).

## Learn More about Next.js

- [Next.js Documentation](https://nextjs.org/docs) — Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) — interactive tutorial.
