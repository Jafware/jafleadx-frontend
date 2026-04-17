# JafLeadX Frontend

This is the future frontend-only repository for JafLeadX AI by Jafware.

It contains the Vite + React application that will deploy to Vercel and talk to the Railway backend API.

This file is a planning/bootstrap draft created from the main repo source of truth.

## What This Repo Contains

- the React frontend app under `src/`
- static assets under `public/`
- Vite, TypeScript, Tailwind, and frontend test/tooling config

This repo should not contain:

- backend source
- database schema ownership
- server secrets

## Required Environment Variables

Create a local `.env` from `.env.example`.

Required in production:

- `VITE_API_BASE_URL`
  Set this to the deployed Railway backend base URL.

Optional:

- `VITE_OPENAI_API_URL`
  Leave blank unless you intentionally want a direct frontend override for the AI reply endpoint.
- `VITE_API_PROXY_TARGET`
  Local development helper for the Vite proxy. Not usually needed in Vercel production.

## Install

```bash
npm install
```

## Local Development

1. Create `.env` from `.env.example`.
2. Set `VITE_API_BASE_URL` to the backend URL you want to target.
3. If you are using a local backend, you can optionally set `VITE_API_PROXY_TARGET`.
4. Start the frontend:

```bash
npm run dev
```

## Build

```bash
npm run build
```

Optional checks:

```bash
npm run lint
npm test
```

## Deploy Target

This repo is intended for:

- Vercel

Recommended Vercel settings:

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Required Vercel environment variables:

- `VITE_API_BASE_URL`

Usually leave unset in Vercel unless intentionally needed:

- `VITE_API_PROXY_TARGET`
- `VITE_OPENAI_API_URL`

## Post-Deploy Smoke Tests

After the first Vercel deploy:

1. Open the app and confirm the main routes render.
2. Register a new test user.
3. Confirm the frontend calls:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/auth/me`
4. Confirm requests go to the Railway backend domain, not to a malformed `${...}` URL.
5. Confirm the new user lands on the dashboard after signup.
6. Refresh the dashboard and confirm the session restores.
7. Confirm there are no obvious CORS errors in the browser console.

## Notes

- This frontend relies on the backend for auth, billing state, and API data.
- Production auth depends on `VITE_API_BASE_URL` being set correctly.
- Do not commit `.env`, `dist/`, or `node_modules/`.
