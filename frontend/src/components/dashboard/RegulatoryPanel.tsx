import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download, AlertTriangle, TrendingUp, FileText } from "lucide-react";

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

export function RegulatoryPanel() {
  const { data: report, isLoading } = useQuery({
    queryKey: ["regulatory-report"],
    queryFn: api.getRegulatoryReport,
  });

  const { data: rbiFlags } = useQuery({
    queryKey: ["rbi-flags"],
    queryFn: api.getRBIFlags,
  });

  const handleExport = async () => {
    try {
      const data = await api.exportRegulatoryData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `UBI_Regulatory_Report_${data.export_date?.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header Card */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Regulatory Reporting</h3>
              <p className="text-[11px] text-muted-foreground">
                RBI Banking Ombudsman Scheme — {report?.reporting_period ?? "FY 2024-25"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export Report
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Complaints", value: report?.total_complaints ?? 0, color: "text-primary" },
                { label: "Resolved",         value: report?.total_resolved ?? 0,   color: "text-success" },
                { label: "Pending",          value: report?.total_pending ?? 0,     color: "text-warning" },
                { label: "Critical",         value: report?.critical_complaints ?? 0, color: "text-destructive" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className={`text-xl font-extrabold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Overall Resolution Rate */}
            <div className="rounded-xl border p-3 mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs font-semibold">Overall Resolution Rate</p>
                <span className="text-sm font-extrabold text-success">
                  {report?.overall_resolution_rate ?? 0}%
                </span>
              </div>
              <ProgressBar value={report?.overall_resolution_rate ?? 0} color="bg-success" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {report?.rbi_compliance_note}
              </p>
            </div>
          </>
        )}
      </Card>

      {/* RBI Flagged Complaints */}
      {rbiFlags && rbiFlags.total_flagged > 0 && (
        <Card className="p-5 rounded-xl card-shadow border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-destructive">RBI Flagged Complaints</h3>
                <p className="text-[11px] text-muted-foreground">
                  Critical severity or SLA breached — may require RBI reporting
                </p>
              </div>
            </div>
            <Badge className="bg-destructive text-destructive-foreground">
              {rbiFlags.total_flagged} flagged
            </Badge>
          </div>

          <div className="space-y-2">
            {rbiFlags.complaints.slice(0, 6).map((c: any) => (
              <div
                key={c.complaint_id}
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{c.complaint_id}</span>
                    <Badge className={`text-[10px] ${
                      c.severity === "Critical"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-warning text-warning-foreground"
                    }`}>
                      {c.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {c.category} · {c.branch}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-destructive">
                  {c.flag_reason}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category-wise Report Table */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Category-wise Complaint Report</h3>
            <p className="text-[11px] text-muted-foreground">
              Resolution rates by banking product category
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Category</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Total</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Resolved</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Escalated</th>
                  <th className="text-left py-2 pl-3 text-muted-foreground font-semibold">Resolution %</th>
                </tr>
              </thead>
              <tbody>
                {report?.category_wise_report?.map((row: any, i: number) => (
                  <tr
                    key={row.category}
                    className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                  >
                    <td className="py-2 pr-3 font-medium">{row.category}</td>
                    <td className="text-right py-2 px-2 font-bold">{row.total}</td>
                    <td className="text-right py-2 px-2 text-success font-semibold">{row.resolved}</td>
                    <td className="text-right py-2 px-2 text-destructive font-semibold">{row.escalated}</td>
                    <td className="py-2 pl-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={row.resolution_rate}
                          color={
                            row.resolution_rate >= 70 ? "bg-success" :
                            row.resolution_rate >= 40 ? "bg-warning" :
                            "bg-destructive"
                          }
                        />
                        <span className={`font-bold min-w-[36px] text-right ${
                          row.resolution_rate >= 70 ? "text-success" :
                          row.resolution_rate >= 40 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {row.resolution_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Channel-wise Report */}
      <Card className="p-5 rounded-xl card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-info/10">
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Channel-wise Complaint Volume</h3>
            <p className="text-[11px] text-muted-foreground">
              Complaints received per input channel
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2">
            {report?.channel_wise_report?.map((row: any) => {
              const total   = report.total_complaints || 1;
              const pct     = Math.round((row.count / total) * 100);
              return (
                <div key={row.channel} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-28 shrink-0">{row.channel}</span>
                  <ProgressBar value={pct} color="bg-primary" />
                  <span className="text-xs font-bold w-8 text-right">{row.count}</span>
                  <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}