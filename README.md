# Feature Tracker

React + Vite frontend for the shared Feature Tracker API. Feature data is stored
on the API server; signing in is required to view or change it.

## Run locally (Node.js 18+)

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to the running API URL.
2. Install and start the frontend:

   ```sh
   npm install
   npm run dev
   ```

3. Sign in with an account configured for the API.

The API must allow the frontend's origin in its `CORS_ORIGIN` setting. The API
admin account can be seeded using the API's `ADMIN_EMAIL` and `ADMIN_PASSWORD`
environment variables.

## Build and deploy

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Set `VITE_API_URL` in
the frontend build environment to the API's base URL (for example, the
`https://...onrender.com` service URL) and rebuild. Vite embeds this value at
build time, so setting it only after the frontend is built will not change the
deployed app. `VITE_API_URL` is public configuration; never put API secrets in
frontend environment variables.

For Render, set the frontend service's **Root Directory** to `ft-react`, use
`npm install && npm run build` as the build command, and publish `dist`.
Configure the API service separately from `feature-tracker-api`.

The app supports searching, filtering, CSV export, and shared feature CRUD.
Data saved by the former browser-only version is not automatically copied to
the API; export it from that version before switching if you need to preserve it.
