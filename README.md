# n8n Portfolio Workflows

Three importable n8n workflows covering lead capture, AI-assisted email triage, and an HTTP bridge to a support-agent API, with a Docker Compose setup for self-hosting n8n.

> Self-built demo, AI-assisted. This is not a client project. It makes no production, customer, or performance claims. All credentials in this repo are placeholders.

## Contents

| Folder | What it does | Notes |
| --- | --- | --- |
| [workflows/01-lead-capture](workflows/01-lead-capture/说明.md) | Webhook → validate → Google Sheets → Slack and email alert | Includes a separate error-handler workflow |
| [workflows/02-email-ai-triage](workflows/02-email-ai-triage/说明.md) | Gmail trigger (or a manual sample email) → OpenAI-compatible chat completion → structured JSON → draft reply and label | Drafts are created, never sent |
| [workflows/03-supportpilot-http](workflows/03-supportpilot-http/说明.md) | Webhook → HTTP Request to `POST /api/chat` → JSON response | Non-streaming; SSE is not used |

Self-host guide: [docs/自托管说明.md](docs/自托管说明.md)

## Import into n8n

1. Start n8n (see Quick start below, or use your own instance).
2. In n8n, open **Workflows → Import from File** and pick a `.json` file from `workflows/`.
3. Attach your own credentials to the Google Sheets, Gmail and Slack nodes. The JSON files ship with placeholder credential IDs on purpose.
4. Fill in the environment variables listed in each folder's `说明.md`, using `.env.example` as the template.
5. For workflow 01, also import `error-handler.json` and select it under **Settings → Error workflow**.
6. Test with the Manual Trigger or the webhook examples in each folder, then activate.

## Quick start

```bash
cp .env.example .env
# Replace N8N_ENCRYPTION_KEY with the output of: openssl rand -hex 32
mkdir -p n8n-data
docker compose up -d
```

Open http://localhost:5678 and create the owner account. Full steps, networking notes and env reference: [docs/自托管说明.md](docs/自托管说明.md).

## Repository checks

```bash
npm run check
```

Validates that every workflow JSON parses, that every connection points at an existing node, and that no key-shaped strings appear in the files.

## Verification status

- All four JSON files import without errors into n8n `2.44.6`.
- Node types, `typeVersion` values and credential type names were checked against the `n8n-nodes-base` package for that version.
- Run against local mock services (an OpenAI-compatible stub and a SupportPilot stub), not real accounts:
  - 03: a valid message is forwarded as `{message, conversation_id: null}`, a follow-up reuses `conversation_id`, empty or over-length messages and malformed `conversation_id` values return 400, and an unreachable backend returns 502.
  - 01: invalid email returns 400. A valid lead reaches the Google Sheets node and stops there with a 500, because no credential is attached.
  - 02: the manual sample run reaches the LLM call and the structured parse step. The Gmail draft node stops on the placeholder credential.
- The SupportPilot request schema (`message`, optional `conversation_id`) is taken from SupportPilot's `backend/app/api/chat.py`. It was tested only against a local stub.
- Not run against real Google Sheets, Slack, Gmail, a real LLM provider, or a live SupportPilot backend.

## Security notes

- No real keys are committed. `.env` is git-ignored; `.env.example` holds placeholders only.
- Webhook URLs are public if n8n is publicly reachable. Add authentication or put n8n behind a reverse proxy before exposing it.
- Email triage never sends mail automatically. It creates drafts for human review.

## Known limitations

- Gmail label assignment needs label IDs (not names) in `GMAIL_LABEL_IDS_JSON`.
- `response_format: json_object` is not supported by every OpenAI-compatible provider. If the reply is not valid JSON, the parse step marks the email for human review.
- Google Sheets, Slack and Gmail retries can duplicate a row or message if the first attempt succeeded but the response was lost.
- The SupportPilot bridge uses non-streaming JSON only. It does not read AgentReply fields beyond passing them through. See `workflows/03-supportpilot-http/说明.md` for SSE limits.

## Upwork portfolio blurb

I built a self-hosted n8n demo with three importable workflows: webhook lead capture to Google Sheets with Slack and email alerts, AI-assisted email triage that classifies messages through any OpenAI-compatible LLM and creates draft replies for review, and an HTTP bridge that calls a custom support-agent API. This is a self-built, AI-assisted portfolio project, not a client engagement, and all credentials are placeholders for local setup.