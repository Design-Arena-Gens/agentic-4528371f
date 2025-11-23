## Agentic Social Responders

Agentic Social Responders is a single-page cockpit for managing Facebook and Instagram conversations with an automation-first workflow. It is optimised for Vercel deployment and ships with a typed API helper for the Meta Graph API, an inbox simulator, and a no-code automation builder.

### Features

- **Unified Inbox** – triage Facebook comments, Facebook DMs, Instagram comments, and Instagram DMs with platform/status filters.
- **Reply Composer** – hydrate quick replies, personalise a response, and dispatch via `POST /api/respond`. Defaults to a dry-run until tokens are provided.
- **Automation Studio** – define keyword or intent-based rules for comments or DMs. Persisted in `localStorage` so they survive refreshes during prototyping.
- **Meta API Helper** – server route `/api/respond` wraps the Meta Graph API. Supports both comments and messages with optional dry-run mode.
- **Connection Overview** – track onboarding progress for Facebook Pages and Instagram Business accounts, including webhook URL hints.
- **Activity Stream** – inspect outbound replies, scheduled automations, or errors with contextual JSON payloads.

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

3. Build for production:
   ```bash
   npm run build
   npm start
   ```

### Environment Variables

The responder API can operate without secrets (dry-run mode). To send real replies, configure:

| Variable | Description |
| --- | --- |
| `META_ACCESS_TOKEN` | Default token used if a request omits `accessToken`. Should be a long-lived page or user token from Meta. |

You can also provide `accessToken` per-request from the UI for Facebook or Instagram by pasting it into the connection cards.

### Meta Webhook Integration

1. Register a webhook in Meta Developers configured for the Page or Instagram Business account.
2. Point the webhook to your own server endpoint (e.g. `/api/meta/webhook`). This demo surfaces a field where you can paste the URL you create.
3. In your webhook handler, evaluate incoming events, optionally consult the automation rules stored in `localStorage` (or persist them to a database), and forward responses to `/api/respond`.

### Deployment

This project is ready for Vercel:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-4528371f
```

After deployment, confirm that the production URL responds:

```bash
curl https://agentic-4528371f.vercel.app
```

---

Built with Next.js App Router, Tailwind CSS v4, and the Meta Graph API.
