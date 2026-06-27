import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Clock, Loader, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, ShieldAlert, ArrowUpCircle
} from "lucide-react";

const kpiConfig = [
  {
    key: "total_complaints" as const,
    label: "Total Complaints",
    icon: FileText,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-l-primary",
    trend: "+12%",
    trendUp: true,
  },
  {
    key: "open" as const,
    label: "Open",
    icon: Clock,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-l-warning",
    trend: "+5%",
    trendUp: true,
  },
  {
    key: "in_progress" as const,
    label: "In Progress",
    icon: Loader,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    borderColor: "border-l-info",
    trend: "-3%",
    trendUp: false,
  },
  {
    key: "resolved" as const,
    label: "Resolved",
    icon: CheckCircle,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    borderColor: "border-l-success",
    trend: "+18%",
    trendUp: true,
  },
  {
    key: "critical_count" as const,
    label: "Critical",
    icon: AlertTriangle,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    borderColor: "border-l-destructive",
    trend: "-7%",
    trendUp: false,
  },
  {
    key: "sla_breached" as const,
    label: "SLA Breached",
    icon: ShieldAlert,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    borderColor: "border-l-destructive",
    trend: "Action needed",
    trendUp: false,
    isBadge: true,
  },
  {
    key: "active_escalations" as const,
    label: "Escalations",
    icon: ArrowUpCircle,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-l-warning",
    trend: "Active",
    trendUp: false,
    isBadge: true,
  },
];

const agentLog = [
  { time: "09:00:01", icon: "▶", color: "text-purple-600", msg: "Auto-Triage Agent started" },
  { time: "09:00:02", icon: "⟳", color: "text-purple-500", msg: "Scanned all open complaints" },
  { time: "09:00:02", icon: "↑", color: "text-purple-700 font-semibold", msg: "Critical + SLA breached complaints auto-escalated → L2" },
  { time: "09:00:03", icon: "✓", color: "text-green-600 font-semibold", msg: "3 actions taken · Agent complete" },
];

export function KPIBar() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-overview"],
    queryFn: api.getOverview,
    refetchInterval: 30000,
  });

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {kpiConfig.map(({ key, label, icon: Icon, iconBg, iconColor, borderColor, trend, trendUp, isBadge }, idx) => (
          <Card
            key={key}
            className={`relative p-4 border-l-4 ${borderColor} rounded-xl card-shadow hover:shadow-md transition-all duration-300 animate-fade-in`}
            style={{ animationDelay: `${idx * 0.07}s` }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                  {label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-extrabold text-foreground">
                    {(data as any)?.[key] ?? 0}
                  </p>
                )}
                {isBadge ? (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    trendUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {trend}
                  </span>
                ) : (
                  <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
                    trendUp ? "text-success" : "text-destructive"
                  }`}>
                    {trendUp
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />
                    }
                    <span>{trend}</span>
                  </div>
                )}
              </div>
              <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Agent Activity Log */}
      <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
        <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-3">
          Agent activity log — last run
        </p>
        <div className="space-y-2">
          {agentLog.map((row, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground font-mono w-14 shrink-0">{row.time}</span>
              <span className={`w-4 text-center shrink-0 ${row.color}`}>{row.icon}</span>
              <span className={row.color}>{row.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}