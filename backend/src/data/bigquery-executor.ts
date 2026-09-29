import { BigQuery, type Query } from "@google-cloud/bigquery";

import { logger } from "../observability/logger.js";
import type { QueryExecutor, QueryLimits, QueryResult } from "./query-executor.js";

const DISALLOWED_SQL =
  /\b(?:alter|call|create|delete|drop|execute|export|grant|insert|load|merge|revoke|truncate|update)\b/i;
const TABLE_REFERENCE =
  /\b(?:from|join)\s+`?([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_*?-]+)`?/gi;

class SqlValidationError extends Error {}

export function validateSql(sql: string, expectedDataset: string): void {
  const normalized = sql.trim();

  if (!/^(select|with)\b/i.test(normalized)) {
    throw new SqlValidationError("Only SELECT queries and WITH queries are allowed.");
  }

  if (normalized.includes(";") || DISALLOWED_SQL.test(normalized)) {
    throw new SqlValidationError("The query contains a disallowed SQL operation.");
  }

  const referencedTables = [...normalized.matchAll(TABLE_REFERENCE)].map((match) => match[1]);
  if (referencedTables.length === 0) {
    throw new SqlValidationError(
      "Queries must use fully qualified tables from the configured dataset.",
    );
  }

  for (const table of referencedTables) {
    if (!table?.startsWith(`${expectedDataset}.`)) {
      throw new SqlValidationError(`Only tables in ${expectedDataset} are allowed.`);
    }
  }
}

export class BigQueryExecutor implements QueryExecutor {
  readonly bigQuery: BigQuery;

  constructor(
    private readonly dataset: string,
    private readonly limits: QueryLimits,
    projectId?: string,
  ) {
    this.bigQuery = new BigQuery(projectId ? { projectId } : {});
  }

  async run(sql: string): Promise<QueryResult> {
    const startedAt = Date.now();
    logger.info("bigquery_query_started", { dataset: this.dataset, sqlLength: sql.length });
    try {
      validateSql(sql, this.dataset);

      const [dryRun] = await this.bigQuery.createQueryJob({
        query: sql,
        dryRun: true,
        useLegacySql: false,
      });
      const totalBytesProcessed = Number(
        dryRun.metadata.statistics?.query?.totalBytesProcessed ?? 0,
      );
      logger.info("bigquery_query_dry_run_completed", {
        dataset: this.dataset,
        totalBytesProcessed,
      });

      if (totalBytesProcessed > this.limits.maxBytesBilled) {
        logger.info("bigquery_query_cost_limit_exceeded", {
          dataset: this.dataset,
          maxBytesBilled: this.limits.maxBytesBilled,
          totalBytesProcessed,
        });
        throw new SqlValidationError(
          `Query would process ${totalBytesProcessed} bytes, exceeding the configured limit.`,
        );
      }

      const query: Query = {
        query: sql,
        maximumBytesBilled: String(this.limits.maxBytesBilled),
        maxResults: this.limits.maxRows,
        useLegacySql: false,
      };
      const [rows] = await this.bigQuery.query(query);
      const normalizedRows = rows.map(
        (row) => JSON.parse(JSON.stringify(row)) as Record<string, unknown>,
      );

      logger.info("bigquery_query_completed", {
        dataset: this.dataset,
        durationMs: Date.now() - startedAt,
        rowCount: normalizedRows.length,
        totalBytesProcessed,
      });
      return {
        columns: Object.keys(normalizedRows[0] ?? {}),
        rows: normalizedRows,
        totalBytesProcessed,
      };
    } catch (error) {
      logger.error("bigquery_query_failed", error, {
        dataset: this.dataset,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }
}
