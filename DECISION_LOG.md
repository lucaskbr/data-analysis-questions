# Decision log

## Assumptions

- This is a read-only analytics assistant for the GA4 public sample dataset. The agent may query only the configured dataset; it cannot modify BigQuery or access other datasets.
- The frontend needs a stable contract. The backend returns a typed response (`text` or `data`), trusted rows in `queryTrace`, and server-generated visualization metadata—rather than asking the UI to interpret prose.
- Authentication is environment-owned. The BigQuery client uses Application Default Credentials (ADC), which works locally and can use workload identity or an attached service account in production without changing app code.
- Query cost and result size need guardrails, so every query is dry-run and bounded by byte and row limits.

## Decisions and trade-offs

- I used a small application-managed agent loop and one strict `run_sql` tool rather than an agent framework: it is short, observable, and easy to constrain for an MVP.
- Prompts are a Markdown asset loaded once at startup, with the dataset injected into a reviewable code-managed template.
- Structured Outputs support text-only and data-backed answers. The app, not the model, selects chart metadata from trusted results.
- Chart selection is deterministic: only one unambiguous, non-temporal numeric metric can produce a chart; otherwise the UI receives a table. A second model reviewer would add cost and still be fallible.
- Structured JSON logs carry request IDs, error type, and message, while excluding keys, messages, SQL, and results.

## What I cut or deprioritized

- Persistent conversations, user authentication/tenancy, and authorization; conversations last only for the process lifetime.
- Schema discovery, semantic metrics, and a curated data catalog.
- Rich visualizations, exports, drill-downs, dashboard persistence, streaming, background jobs, caching, and rate limiting.

## Where I got stuck and what I did

- BigQuery initially lacked a valid project ID and ADC credentials. I surfaced exact errors in logs and used ADC rather than unsupported API keys.
- Generated SQL used unqualified tables. I injected the configured `project.dataset` prefix into prompts and retained server-side validation.
- Raw Responses API output did not always expose top-level `output_text`; I extract text from `output[].content[]` as well.
- Numeric timestamps were selected as chart metrics. I now reject temporal names and require one unambiguous numeric metric, backed by regression tests.

## With another 40 hours

1. Add schema discovery and a curated GA4 semantic layer for reliable suggestions and valid field selection.
2. Add production foundations: persistent conversations, tenant isolation, role-based BigQuery access, workload identity, and audit retention.
3. Improve UX: streaming/progress, accessible charts and tables, chart controls, query explanations, saved views, and feedback.
4. Add reliability: controlled-dataset end-to-end tests, agent evaluations, SQL fixtures, rate limits, caching, tracing, and alerts.
5. Safely support richer analysis: multiple series, date handling, metric formatting, comparisons, and drill-downs.
