# Feature Tracker

React + Vite frontend for the shared Feature Tracker API. Sign in to manage
shared feature data.

## Run locally (Node.js 18+)

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to the running API URL.
2. Install and start the frontend:

   ```sh
   npm install
   npm run dev
   ```

3. Sign in with an account configured for the API.

The API must allow the frontend's origin in its `CORS_ORIGIN` setting.

## Views and alerts

- **Overview** shows feature journey steps, delivery counts, doctor communication,
  deadlines and high-alert flags. The shared filters and “Show only these” alert
  toggle apply to both views.
- **Table** retains the editable feature sheet and adds deadline, priority and
  computed alert columns.
- **Quick add** parses one feature per line using a local rule-based parser.
  Adding a draft always requires pressing **Add to tracker**.
- Alert rules: an undelivered feature is overdue when its deadline is before
  today, due soon when it is due in 0–3 days, blocked when development is
  Blocked or testing Failed, and high priority when priority is High. Delivered
  means development Done, testing Passed, deployment Production, and doctor
  informed or communication Not Required.

The new fields are `deadline` (`YYYY-MM-DD` or null) and `priority` (`Normal` or
`High`, default Normal). The API service applies its PostgreSQL migration at
startup. If migrating an existing Supabase `public.features` table manually,
run:

```sql
ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normal';
```

This checkout currently includes only the API backend adapter; Supabase and
Firebase adapters are not present in the workspace.

## Optional smart parsing

The rule-based parser is always available and does not send feature text over
the network. To enable the optional Groq-powered parser, configure
`GROQ_API_KEY` and optionally `GROQ_MODEL` on the API service (see the API
README), then turn on **Smart parse** in Quick add. It is off by default.

## Build and deploy

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Set `VITE_API_URL` in
the frontend build environment to the API's base URL and rebuild. This value is
public configuration; never put API secrets in frontend environment variables.
