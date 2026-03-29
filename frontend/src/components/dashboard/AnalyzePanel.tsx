import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type AnalyzeResult } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, Search, Sparkles } from "lucide-react";

export function AnalyzePanel() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const mutation = useMutation({
    mutationFn: (t: string) => api.analyzeComplaint(t),
    onSuccess: setResult,
  });

  return (
    <Card className="p-5 rounded-xl card-shadow">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Analyze New Complaint</h3>
          <p className="text-[11px] text-muted-foreground">AI-powered complaint classification and duplicate detection</p>
        </div>
      </div>

      <Textarea
        placeholder="Paste or type a customer complaint here for instant AI analysis…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="mb-3 text-sm rounded-xl resize-none"
      />
      <Button
        onClick={() => mutation.mutate(text)}
        disabled={!text.trim() || mutation.isPending}
        className="w-full rounded-xl h-11"
      >
        {mutation.isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI…</>
        ) : (
          <><Search className="mr-2 h-4 w-4" />Analyze Complaint</>
        )}
      </Button>

      {result && (
        <div className="mt-5 space-y-4">
          {result.duplicate_found && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive animate-fade-in">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Potential Duplicate Detected!</p>
                <p className="text-xs opacity-80">This complaint closely matches existing records</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Category", value: result.category, conf: result.category_confidence, color: "bg-primary" },
              { label: "Sentiment", value: result.sentiment, conf: result.sentiment_confidence, color: "bg-warning" },
              { label: "Severity", value: result.severity, conf: result.severity_confidence, color: "bg-destructive" },
            ].map((item, idx) => (
              <div key={item.label} className="rounded-xl border bg-card p-4 text-center animate-slide-up card-shadow" style={{ animationDelay: `${idx * 0.1}s` }}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{item.label}</p>
                <p className="font-bold text-sm mt-2">{item.value}</p>
                <div className="mt-2">
                  <Progress value={item.conf * 100} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{(item.conf * 100).toFixed(0)}% confidence</p>
                </div>
              </div>
            ))}
          </div>

          {result.similar_complaints?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Similar Complaints Found</p>
              <div className="space-y-2">
                {result.similar_complaints.map((s) => (
  <div key={s.complaint_id} className="rounded-xl border bg-card p-3 card-shadow animate-fade-in">
    <div className="flex justify-between items-center mb-1">
      <span className="font-mono text-xs font-bold">{s.complaint_id}</span>
      <Badge variant="outline" className="text-xs">{(s.similarity * 100).toFixed(0)}% similar</Badge>
    </div>
    <p className="text-xs text-muted-foreground line-clamp-2">{s.complaint_text}</p>
  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
