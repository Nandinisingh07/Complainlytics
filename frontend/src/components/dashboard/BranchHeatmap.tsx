import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Trophy } from "lucide-react";

const rankStyles = [
  "bg-accent text-accent-foreground font-bold",
  "bg-muted text-muted-foreground font-semibold",
  "bg-warning/20 text-warning font-semibold",
];

function getRankBadge(index: number) {
  if (index < 3) {
    const labels = ["1st", "2nd", "3rd"];
    return (
      <span className={`inline-flex items-center justify-center h-7 w-10 rounded-lg text-xs ${rankStyles[index]}`}>
        {labels[index]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center h-7 w-10 rounded-lg text-xs bg-muted text-muted-foreground">
      {index + 1}th
    </span>
  );
}

function getBarColor(ratio: number) {
  if (ratio > 0.8) return "bg-destructive";
  if (ratio > 0.5) return "bg-warning";
  return "bg-success";
}

export function BranchHeatmap() {
  const { data, isLoading } = useQuery({ queryKey: ["by-branch"], queryFn: api.getByBranch });

  const sorted = data?.sort((a, b) => b.count - a.count).slice(0, 10) ?? [];
  const max = sorted[0]?.count || 1;

  return (
    <Card className="p-5 rounded-xl card-shadow">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Top 10 Branches</h3>
          <p className="text-[11px] text-muted-foreground">Ranked by complaint volume</p>
        </div>
        <Trophy className="h-4 w-4 text-accent ml-auto" />
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b, i) => {
            const ratio = b.count / max;
            return (
              <div key={b.branch} className="flex items-center gap-3 group">
                {getRankBadge(i)}
                <span className="text-sm font-semibold w-44 truncate">{b.branch}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(ratio)} rounded-full transition-all duration-500 group-hover:opacity-80`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold w-10 text-right text-foreground">{b.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
