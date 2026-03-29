import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Complaint } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ComplaintDrawer } from "./ComplaintDrawer";
import { Search } from "lucide-react";

const sentimentConfig: Record<string, { emoji: string; classes: string }> = {
  Angry: { emoji: "🔴", classes: "bg-destructive/10 text-destructive border border-destructive/20" },
  Urgent: { emoji: "🚨", classes: "bg-destructive/10 text-destructive border border-destructive/20" },
  Frustrated: { emoji: "🟠", classes: "bg-warning/10 text-warning border border-warning/20" },
  Disappointed: { emoji: "🟡", classes: "bg-warning/10 text-muted-foreground border border-warning/20" },
  Neutral: { emoji: "⚪", classes: "bg-muted text-muted-foreground border border-border" },
};

const severityConfig: Record<string, string> = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-warning text-warning-foreground",
  Medium: "bg-info text-info-foreground",
  Low: "bg-success text-success-foreground",
};

const statusConfig: Record<string, string> = {
  Open: "border-info text-info bg-info/10",
  "In Progress": "border-warning text-warning bg-warning/10",
  Resolved: "border-success text-success bg-success/10",
  Escalated: "border-destructive text-destructive bg-destructive/10",
};

export function ComplaintTable() {
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [filters, setFilters] = useState({ category: "", severity: "", sentiment: "", status: "" });
  const [search, setSearch] = useState("");

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.getComplaints(50),
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["filter-options"],
    queryFn: api.getFilterOptions,
  });

  const filtered = complaints?.filter((c) => {
    if (filters.category && c.category !== filters.category) return false;
    if (filters.severity && c.severity !== filters.severity) return false;
    if (filters.sentiment && c.sentiment !== filters.sentiment) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (search && !(c.complaint_text || "").toLowerCase().includes(search.toLowerCase()) && !c.complaint_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderFilter = (label: string, key: keyof typeof filters, options?: string[]) => (
    <Select value={filters[key]} onValueChange={(v) => setFilters((f) => ({ ...f, [key]: v === "all" ? "" : v }))}>
      <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options?.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-[240px] text-xs rounded-lg"
            />
          </div>
          {renderFilter("Category", "category", filterOptions?.categories)}
          {renderFilter("Severity", "severity", filterOptions?.severities)}
          {renderFilter("Sentiment", "sentiment", filterOptions?.sentiments)}
          {renderFilter("Status", "status", filterOptions?.statuses)}
        </div>
        <div className="rounded-xl border bg-card card-shadow overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Complaint</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Sentiment</TableHead>
                <TableHead className="text-xs font-semibold">Severity</TableHead>
                <TableHead className="text-xs font-semibold">Channel</TableHead>
                <TableHead className="text-xs font-semibold">Branch</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered?.map((c, idx) => {
                    const sent = sentimentConfig[c.sentiment] || sentimentConfig.Neutral;
                    return (
                      <TableRow
                        key={c.complaint_id}
                        className={`cursor-pointer transition-colors hover:bg-info/5 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                        onClick={() => setSelected(c)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs font-semibold">{c.complaint_id}</p>
                            {c.complaint_text && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                                {c.complaint_text.slice(0, 60)}…
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{c.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${sent.classes}`}>
                            {sent.emoji} {c.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${severityConfig[c.severity] || "bg-muted text-muted-foreground"}`}>
                            {c.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{c.channel}</TableCell>
                        <TableCell className="text-xs font-medium">{c.branch}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusConfig[c.status] || "border-border text-muted-foreground"}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.created_date}</TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
        {filtered && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {complaints?.length ?? 0} complaints
          </p>
        )}
      </div>
      <ComplaintDrawer complaint={selected} onClose={() => setSelected(null)} />
    </>
  );
}
