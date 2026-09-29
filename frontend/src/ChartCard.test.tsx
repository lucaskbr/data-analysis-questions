import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { QueryResult } from "./api";
import { ChartCard } from "./ChartCard";

const result: QueryResult = {
  columns: ["date", "purchases"],
  rows: [
    { date: "2026-09-27", purchases: 4 },
    { date: "2026-09-28", purchases: "7" },
  ],
  totalBytesProcessed: 0,
};

describe("ChartCard", () => {
  afterEach(cleanup);

  it("renders an interactive bar chart for valid numeric data", () => {
    render(
      <ChartCard visualization={{ type: "bar", x: "date", y: "purchases" }} result={result} />,
    );

    expect(screen.getByText("Bar chart of purchases by date")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bar chart of purchases by date" })).toBeInTheDocument();
  });

  it("renders an interactive line chart when requested", () => {
    render(
      <ChartCard visualization={{ type: "line", x: "date", y: "purchases" }} result={result} />,
    );

    expect(screen.getByText("Line chart of purchases by date")).toBeInTheDocument();
  });

  it("renders tabular metadata as a results table", () => {
    render(<ChartCard visualization={{ type: "table" }} result={result} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2026-09-27")).toBeInTheDocument();
  });

  it("falls back to a table when the requested y field is not numeric", () => {
    render(
      <ChartCard
        visualization={{ type: "bar", x: "date", y: "purchases" }}
        result={{ ...result, rows: [{ date: "2026-09-27", purchases: "unknown" }] }}
      />,
    );

    expect(screen.getByText("Visualization unavailable for this result.")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
