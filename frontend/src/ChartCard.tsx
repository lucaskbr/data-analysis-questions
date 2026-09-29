import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { QueryResult, Visualization } from "./api";

type ChartCardProps = {
  visualization: Visualization;
  result?: QueryResult;
};

type ChartDatum = {
  label: string;
  value: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ResultsTable({ result }: { result: QueryResult }) {
  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            {result.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {result.columns.map((column) => (
                <td key={column}>{displayValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function chartData(result: QueryResult, x: string, y: string): ChartDatum[] {
  return result.rows.map((row) => ({ label: displayValue(row[x]), value: toNumber(row[y]) }));
}

export function ChartCard({ visualization, result }: ChartCardProps) {
  if (!result) return null;

  if (visualization.type === "table") {
    return (
      <section className="chart-card" aria-label="Query results">
        <ResultsTable result={result} />
      </section>
    );
  }

  const { x, y } = visualization;
  const hasAxes = Boolean(x && y && result.columns.includes(x) && result.columns.includes(y));
  const data = hasAxes ? chartData(result, x!, y!) : [];
  const hasNumericValue = data.some((datum) => datum.value !== null);

  if (!hasAxes || data.length === 0 || !hasNumericValue) {
    return (
      <section className="chart-card chart-unavailable" role="status">
        <p>Visualization unavailable for this result.</p>
        <ResultsTable result={result} />
      </section>
    );
  }

  const title = `${visualization.type === "bar" ? "Bar" : "Line"} chart of ${y} by ${x}`;
  const sharedChartProps = {
    data,
    margin: { top: 12, right: 12, bottom: 12, left: 0 },
  };

  return (
    <section className="chart-card" aria-label={title}>
      <p className="chart-title">{title}</p>
      <div className="chart-canvas" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          {visualization.type === "bar" ? (
            <BarChart {...sharedChartProps}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart {...sharedChartProps}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              <Line dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
