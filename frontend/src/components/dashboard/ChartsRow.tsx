import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp, AlertTriangle } from "lucide-react";

const PIE_COLORS = ["hsl(0,72%,51%)", "hsl(38,92%,50%)", "hsl(220,15%,47%)", "hsl(217,91%,60%)", "hsl(142,71%,35%)"];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "hsl(0,72%,51%)",
  High: "hsl(38,92%,50%)",
  Medium: "hsl(217,91%,60%)",
  Low: "hsl(142,71%,35%)",
};

export function ChartsRow() {
  const { data: byCategory, isLoading: l1 } = useQuery({ queryKey: ["by-category"], queryFn: api.getByCategory });
  const { data: bySentiment, isLoading: l2 } = useQuery({ queryKey: ["by-sentiment"], queryFn: api.getBySentiment });
  const { data: bySeverity, isLoading: l3 } = useQuery({ queryKey: ["by-severity"], queryFn: api.getBySeverity });
  const { data: trend, isLoading: l4 } = useQuery({ queryKey: ["trend"], queryFn: api.getTrend });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Category Horizontal Bar Chart */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">By Category</h3>
            <p className="text-[11px] text-muted-foreground">Complaint distribution across categories</p>
          </div>
        </div>
        {l1 ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={byCategory}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10 }}
                width={135}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#1a3a6b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Sentiment Donut Chart */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-warning/10">
            <PieIcon className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-bold">By Sentiment</h3>
            <p className="text-[11px] text-muted-foreground">Customer sentiment analysis</p>
          </div>
        </div>
        {l2 ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bySentiment}
                dataKey="count"
                nameKey="sentiment"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
              >
                {bySentiment?.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Severity Bar Chart */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold">By Severity</h3>
            <p className="text-[11px] text-muted-foreground">Severity level distribution</p>
          </div>
        </div>
        {l3 ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bySeverity}>
              <XAxis dataKey="severity" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {bySeverity?.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || "hsl(220,15%,47%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Monthly Trend Line Chart */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-info/10">
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Monthly Trend</h3>
            <p className="text-[11px] text-muted-foreground">Complaint volume over time</p>
          </div>
        </div>
        {l4 ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(216,62%,26%)"
                strokeWidth={2.5}
                dot={{ fill: "hsl(216,62%,26%)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

    </div>
  );
}
