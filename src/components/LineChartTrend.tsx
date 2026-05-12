"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

export interface TrendPoint {
  date: string;
  value: number | null;
}

interface LineChartTrendProps {
  data: TrendPoint[];
  target?: number;
  unit?: string;
  domain?: [number | "auto", number | "auto"];
  height?: number;
  color?: string;
  showGrid?: boolean;
}

export function LineChartTrend({
  data,
  target,
  unit = "",
  domain = ["auto", "auto"],
  height = 140,
  color = "#0a0a0a",
  showGrid = false,
}: LineChartTrendProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />}
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} domain={domain} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => [`${v}${unit ? ` ${unit}` : ""}`, ""]}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#16a34a"
              strokeDasharray="4 3"
              label={{ value: "cible", fontSize: 9, fill: "#16a34a", position: "right" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
