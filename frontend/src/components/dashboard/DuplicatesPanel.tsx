import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare, AlertCircle } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 0.95) return { ring: "border-destructive text-destructive", bg: "bg-destructive/10", label: "Critical Match" };
  if (score >= 0.90) return { ring: "border-warning text-warning", bg: "bg-warning/10", label: "High Match" };
  if (score >= 0.82) return { ring: "border-info text-info", bg: "bg-info/10", label: "Moderate Match" };
  return { ring: "border-success text-success", bg: "bg-success/10", label: "Low Match" };
}

export function DuplicatesPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["duplicates"], queryFn: api.getDuplicates });

  return (
    <Card className="p-5 rounded-xl card-shadow">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-warning/10">
          <GitCompare className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Potential Duplicate Complaints</h3>
          <p className="text-[11px] text-muted-foreground">Detected similar complaint pairs</p>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">No duplicates detected.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((d, i) => {
            const pct = d.similarity_score * 100;
            const sc = scoreColor(d.similarity_score);
            return (
              <div key={i} className={`rounded-xl border p-4 ${sc.bg} transition-all hover:card-shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${sc.ring.split(" ")[1]}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{sc.label}</span>
                  </div>
                  {/* Circular score indicator */}
                  <div className={`relative h-12 w-12 rounded-full border-[3px] ${sc.ring} flex items-center justify-center`}>
                    <span className="text-xs font-extrabold">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                 <div className="flex-1 rounded-lg bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Complaint 1</p>
                    <p className="font-mono text-xs font-bold">{d.complaint_id_1}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{d.text_1?.slice(0,40)}...</p>
                  </div>
                  <GitCompare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 rounded-lg bg-card p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Complaint 2</p>
                    <p className="font-mono text-xs font-bold">{d.complaint_id_2}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{d.text_2?.slice(0,40)}...</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
