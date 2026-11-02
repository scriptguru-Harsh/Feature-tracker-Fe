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
- **Add feature** opens a guided form by default. Doctor, clinic, and assignee
  inputs suggest values already used in the tracker. **Describe it** remains
  available for one or more plain-text feature drafts.
- Adding a text draft always requires pressing **Add to tracker**.
- Alert rules: an undelivered feature is overdue when its deadline is before
  today, due soon when it is due in 0–3 days, blocked when development is
  Blocked or testing Failed, and high priority when priority is High. Delivered
  means development Done, testing Passed, deployment Production, and doctor
  informed or communication Not Required.

  The deadline timeline uses a calendar-day window from 7 days before today
  through 28 days after today. It labels overdue, near-term, later, earlier, and
  out-of-window items separately; overlapping labels are assigned to different
  lanes.

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

The API also seeds the 25 feature requests visible in the provided spreadsheet
image once, using a migration marker. It creates new rows without replacing or
editing existing tracker entries. Completed spreadsheet requests map to Done,
Passed, and Production; trial work maps to In Review, In Testing, and Staging;
the assigned teammate maps to Lead. Spreadsheet remarks and any dates that
could not be represented as valid calendar dates remain in Notes. The
“before Diwali” deadline is mapped to November 8, 2026.

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
