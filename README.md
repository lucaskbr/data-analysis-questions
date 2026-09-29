# GA4 Analysis Monorepo

This pnpm workspace contains a Vite + React frontend and a Node.js/TypeScript backend. The backend exposes a chat endpoint that uses OpenAI function calling to decide when to run a read-only BigQuery query against a GA4 dataset.

## Prerequisites

- Node.js 22 or later and pnpm 12
- An OpenAI API key and a model available to your account
- A Google Cloud project with the BigQuery API enabled
- BigQuery access to the target GA4 dataset. For local development, authenticate with Application Default Credentials:

  ```sh
  gcloud auth application-default login
  ```

  The authenticated identity needs permission to create BigQuery jobs in the project and read data from the target dataset.

## Configure the backend

Install workspace dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
```

Create your local environment file:

```sh
cp backend/.env.example backend/.env
```

Set the required values in `backend/.env`:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_model_name
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
BIGQUERY_DATASET=your-gcp-project-id.analytics_123456789
```

`BIGQUERY_DATASET` must be the fully qualified project-and-dataset prefix. The service rejects queries that reference any other dataset.

The backend scripts load `backend/.env` automatically:

```sh
pnpm --filter backend dev
```

The API starts at `http://localhost:3000` by default. The frontend development server runs at `http://localhost:5173`; start it in another terminal with `pnpm --filter frontend dev`. `pnpm dev` starts both workspaces together.

## Call the chat API

Send a message to the backend with a stable conversation ID:

```sh
curl --request POST http://localhost:3000/api/chat \
  --header 'Content-Type: application/json' \
  --data '{
    "conversationId": "local-demo",
    "message": "How many active users did we have yesterday?"
  }'
```

The response includes the model's `analysis`, optional visualization metadata, and an in-memory `queryTrace` containing each permitted query and its normalized results. Conversation history lasts only for the life of the process.

## Environment reference

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | — | API key used for OpenAI Responses API requests. |
| `OPENAI_MODEL` | Yes | — | OpenAI model used by the agent. |
| `GOOGLE_CLOUD_PROJECT` | No | ADC default project | Google Cloud project used to create BigQuery jobs. |
| `BIGQUERY_DATASET` | Yes | — | Only permitted BigQuery dataset, as `project.dataset`. |
| `BIGQUERY_MAX_BYTES_BILLED` | No | `1000000000` | Maximum bytes a query may process or bill. |
| `BIGQUERY_MAX_ROWS` | No | `1000` | Maximum rows returned by a query. |
| `AGENT_MAX_ITERATIONS` | No | `6` | Maximum model/tool-call iterations per chat request. |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Browser origin allowed to call the API. |
| `PORT` | No | `3000` | Backend HTTP port. |

## Safety boundaries

- The agent loop is implemented in the application, without LangChain, LlamaIndex, or an agent framework.
- `run_sql` is the only tool. SQL must begin with `SELECT` or `WITH`, use fully qualified tables in `BIGQUERY_DATASET`, and cannot contain write or administrative operations.
- BigQuery performs a dry run before execution; queries over the byte limit are rejected.
- OpenAI request state is not stored by the API (`store: false`); the MVP conversation store is in memory.

## Quality checks and production build

```sh
pnpm run check
pnpm --filter backend run build
pnpm --filter backend run start
pnpm --filter frontend run build
```

The backend's `start` command also loads `backend/.env` automatically.
