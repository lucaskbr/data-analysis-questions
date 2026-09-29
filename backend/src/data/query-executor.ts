export interface QueryLimits {
  maxBytesBilled: number;
  maxRows: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalBytesProcessed: number;
}

export interface QueryExecutor {
  run(sql: string): Promise<QueryResult>;
}
