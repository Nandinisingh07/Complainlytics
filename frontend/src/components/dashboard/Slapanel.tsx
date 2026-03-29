import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

function SLAMeter({ value, status }: { value: number; status: string }) {
  const color =
    status === "Breached" ? "bg-destructive" :
    status === "At Risk"  ? "bg-warning" :
    "bg-success";
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SLAPanel() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["sla-summary"],
    queryFn: api.getSLASummary,
    refetchInterval: 30000,
  });

  const { data: atRiskData, isLoading: loadingAtRisk } = useQuery({
    queryKey: ["sla-at-risk"],
    queryFn: api.getSLAAtRisk,
    refetchInterval: 30000,
  });

  const { data: breachedData, isLoading: loadingBreached } = useQuery({
    queryKey: ["sla-breached"],
    queryFn: api.getSLABreached,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">

      {/* SLA Compliance Overview */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">SLA Compliance Dashboard</h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time SLA tracking across all open complaints
            </p>
          </div>
        </div>

        {loadingSummary ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            {/* Compliance Rate */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-3xl font-extrabold text-foreground">
                  {summary?.compliance_rate ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground">Overall SLA compliance</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total open</p>
                <p className="text-xl font-bold">{summary?.total_open ?? 0}</p>
              </div>
            </div>

            {/* SLA Status Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-center">
                <CheckCircle className="h-4 w-4 text-success mx-auto mb-1" />
                <p className="text-lg font-extrabold text-success">{summary?.on_track ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">On Track</p>
              </div>
              <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-center">
                <Clock className="h-4 w-4 text-warning mx-auto mb-1" />
                <p className="text-lg font-extrabold text-warning">{summary?.at_risk ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">At Risk</p>
              </div>
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
                <AlertTriangle className="h-4 w-4 text-destructive mx-auto mb-1" />
                <p className="text-lg font-extrabold text-destructive">{summary?.breached ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Breached</p>
              </div>
            </div>

            {/* SLA Config */}
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                SLA Thresholds
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {Object.entries(summary?.sla_config ?? {}).map(([severity, hours]) => (
                  <div key={severity} className="text-center">
                    <p className="text-xs font-bold">{hours}h</p>
                    <p className="text-[10px] text-muted-foreground">{severity}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* At Risk Complaints */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-bold">At Risk — Action Required</h3>
              <p className="text-[11px] text-muted-foreground">
                Complaints approaching SLA deadline
              </p>
            </div>
          </div>
          {atRiskData && (
            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
              {atRiskData.total_at_risk} at risk
            </Badge>
          )}
        </div>

        {loadingAtRisk ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !atRiskData?.complaints?.length ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All complaints are on track!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskData.complaints.slice(0, 8).map((c: any) => (
              <div key={c.complaint_id} className="rounded-xl border bg-warning/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{c.complaint_id}</span>
                    <Badge
                      className={`text-[10px] ${
                        c.severity === "Critical" ? "bg-destructive text-destructive-foreground" :
                        c.severity === "High"     ? "bg-warning text-warning-foreground" :
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.severity}
                    </Badge>
                  </div>
                  <span className={`text-xs font-bold ${
                    c.hours_remaining < 2 ? "text-destructive" : "text-warning"
                  }`}>
                    {c.hours_remaining < 1
                      ? `${Math.round(c.hours_remaining * 60)}m left`
                      : `${Math.round(c.hours_remaining)}h left`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2 truncate">{c.category}</p>
                <SLAMeter
                  value={c.sla?.completion_pct ?? 80}
                  status={c.sla?.sla_status ?? "At Risk"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Breached Complaints */}
      {breachedData && breachedData.total_breached > 0 && (
        <Card className="p-5 rounded-xl card-shadow border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-destructive">SLA Breached</h3>
                <p className="text-[11px] text-muted-foreground">
                  Requires immediate attention
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
              {breachedData.total_breached} breached
            </Badge>
          </div>

          <div className="space-y-2">
            {breachedData.complaints.slice(0, 5).map((c: any) => (
              <div key={c.complaint_id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{c.complaint_id}</span>
                    <span className="text-[10px] text-muted-foreground">{c.category}</span>
                  </div>
                  <Badge className="bg-destructive text-destructive-foreground text-[10px]">
                    Breached
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{c.branch}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}