import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Complaint, type DraftResponse } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, CheckCircle, Clock, AlertTriangle, User,
  MessageSquare, Send, ArrowUpCircle, ShieldAlert, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  complaint: Complaint | null;
  onClose: () => void;
}

function PriorityCircle({ score }: { score: number }) {
  const color =
    score >= 8 ? "border-destructive text-destructive" :
    score >= 5 ? "border-warning text-warning" :
    "border-success text-success";
  return (
    <div className={`h-16 w-16 rounded-full border-4 ${color} flex flex-col items-center justify-center mx-auto`}>
      <span className="text-xl font-extrabold">{score}</span>
      <span className="text-[9px] font-medium opacity-70">/10</span>
    </div>
  );
}

function SLABadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    "On Track": "bg-success/10 text-success border-success/30",
    "At Risk"  : "bg-warning/10 text-warning border-warning/30",
    "Breached" : "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config[status] ?? config["On Track"]}`}>
      SLA {status}
    </span>
  );
}

export function ComplaintDrawer({ complaint, onClose }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [editedResponse, setEditedResponse] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"details" | "communications" | "escalate">("details");
  const [newMessage, setNewMessage] = useState("");
  const [escalationLevel, setEscalationLevel] = useState("L1");
  const [escalationReason, setEscalationReason] = useState("");
  const [escalationTo, setEscalationTo] = useState("");
  const [isEscalated, setIsEscalated] = useState(false);

  // Fetch communication history
  const { data: commData, refetch: refetchComms } = useQuery({
    queryKey: ["communications", complaint?.complaint_id],
    queryFn: () => api.getCommunications(complaint!.complaint_id),
    enabled: !!complaint && activeTab === "communications",
  });

  // Fetch SLA info
  const { data: slaData } = useQuery({
    queryKey: ["sla", complaint?.complaint_id],
    queryFn: () => api.getComplaintSLA(complaint!.complaint_id),
    enabled: !!complaint,
  });

  const draftMutation = useMutation({
    mutationFn: (text: string) =>
      api.draftResponse(text, "Customer", complaint?.channel),
    onSuccess: (data) => {
      setDraft(data);
      setEditedResponse(data.draft_response || data.drafted_response || "");
      setCheckedItems(new Set());
      setEscalationTo(data.escalate_to || "");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      api.addCommunication(complaint!.complaint_id, "agent", newMessage, "Dashboard"),
    onSuccess: () => {
      setNewMessage("");
      refetchComms();
      toast.success("Message sent!");
    },
  });

  const escalateMutation = useMutation({
    mutationFn: () =>
      api.escalateComplaint(
        complaint!.complaint_id,
        escalationLevel,
        escalationReason,
        escalationTo,
        "Agent"
      ),
    onSuccess: () => {
      setIsEscalated(true);
      toast.success(`Complaint escalated to ${escalationLevel} — ${escalationTo}`);
      queryClient.invalidateQueries({ queryKey: ["stats-overview"] });
    },
  });

  const handleClose = () => {
    setDraft(null);
    setEditedResponse("");
    setCheckedItems(new Set());
    setActiveTab("details");
    setNewMessage("");
    setEscalationReason("");
    setIsEscalated(false);
    onClose();
  };

  const toggleItem = (i: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const tabs = [
    { id: "details" as const, label: "Details", icon: User },
    { id: "communications" as const, label: "Thread", icon: MessageSquare },
    { id: "escalate" as const, label: "Escalate", icon: ArrowUpCircle },
  ];

  return (
    <Sheet open={!!complaint} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">

        {/* Header */}
        <div className="bg-primary p-5 text-primary-foreground">
          <SheetHeader>
            <SheetTitle className="text-primary-foreground text-base">
              Complaint {complaint?.complaint_id}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground text-[10px]">
              {complaint?.severity}
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground text-[10px]">
              {complaint?.sentiment}
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground text-[10px]">
              {complaint?.channel}
            </Badge>
            {slaData && <SLABadge status={slaData.sla_status} />}
            {isEscalated && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/80 text-white">
                Escalated
              </span>
            )}
          </div>

          {/* SLA Progress Bar */}
          {slaData && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-primary-foreground/70 mb-1">
                <span>SLA: {slaData.sla_hours}h total</span>
                <span>
                  {slaData.is_breached
                    ? "Breached"
                    : `${Math.round(slaData.hours_remaining)}h remaining`}
                </span>
              </div>
              <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    slaData.is_breached ? "bg-destructive" :
                    slaData.sla_status === "At Risk" ? "bg-warning" : "bg-success"
                  }`}
                  style={{ width: `${Math.min(100, slaData.completion_pct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* ── TAB: DETAILS ── */}
          {activeTab === "details" && (
            <>
              {/* Complaint text */}
              <div className="rounded-xl bg-muted/50 border p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <User className="h-3 w-3" /> Customer Complaint
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {complaint?.complaint_text || "No complaint text available."}
                </p>
                <div className="flex gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span>📍 {complaint?.branch}</span>
                  <span>📅 {complaint?.created_date?.slice(0, 10)}</span>
                  <span>📂 {complaint?.category}</span>
                </div>
              </div>

              {/* Draft Response Button */}
              {!draft && (
                <Button
                  onClick={() => draftMutation.mutate(complaint?.complaint_text || "")}
                  disabled={draftMutation.isPending}
                  className="w-full rounded-xl h-11"
                >
                  {draftMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Drafting AI Response…</>
                  ) : (
                    "🤖 Draft AI Response"
                  )}
                </Button>
              )}

              {/* Draft Response Result */}
              {draft && (
                <div className="space-y-4 animate-fade-in">
                  {/* Regulatory Flag */}
                  {draft.regulatory_flag && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive bg-destructive/10 p-3">
                      <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-destructive">RBI Reporting Required</p>
                        <p className="text-[11px] text-destructive/80">{draft.regulatory_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Priority + SLA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3 text-center card-shadow">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Priority</p>
                      <PriorityCircle score={draft.priority_score} />
                    </div>
                    <div className="rounded-xl border p-3 card-shadow">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Resolution</p>
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-warning" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">SLA</p>
                            <p className="text-xs font-bold">{draft.resolution_sla}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-info" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Escalate To</p>
                            <p className="text-xs font-bold leading-tight">{draft.escalate_to}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Root Cause */}
                  {draft.root_cause && (
                    <div className="rounded-xl border bg-info/5 p-3">
                      <p className="text-[10px] font-bold text-info mb-1">Root Cause Analysis</p>
                      <p className="text-xs text-muted-foreground">{draft.root_cause}</p>
                    </div>
                  )}

                  {/* Action Items */}
                  <div className="rounded-xl border p-3 card-shadow">
                    <p className="text-xs font-bold mb-2">Action Items</p>
                    <div className="space-y-2">
                      {draft.action_items.map((item, i) => (
                        <label key={i} className="flex items-start gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={checkedItems.has(i)}
                            onCheckedChange={() => toggleItem(i)}
                            className="mt-0.5"
                          />
                          <span className={checkedItems.has(i) ? "line-through text-muted-foreground" : ""}>
                            {item}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Drafted Response */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <p className="text-xs font-bold">Drafted Response</p>
                      <span className="text-[10px] text-muted-foreground">{editedResponse.length} chars</span>
                    </div>
                    <Textarea
                      value={editedResponse}
                      onChange={(e) => setEditedResponse(e.target.value)}
                      rows={6}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <Button
                    className="w-full rounded-xl h-11 bg-success hover:bg-success/90 text-success-foreground font-bold text-sm"
                    onClick={() => {
                      // Add approved response to communication history
                      api.addCommunication(
                        complaint!.complaint_id,
                        "agent",
                        editedResponse,
                        complaint?.channel || "Dashboard"
                      );
                      toast.success("Response approved and sent!");
                      handleClose();
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve & Send Response
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── TAB: COMMUNICATIONS ── */}
          {activeTab === "communications" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Communication Thread — {commData?.total_messages ?? 0} messages
              </p>

              {/* Messages */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {commData?.communications?.map((msg, i) => (
                  <div key={i}>
                    {msg.sender === "system" ? (
                      <div className="text-center">
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    ) : msg.sender === "customer" ? (
                      <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-primary/10 rounded-xl rounded-tl-none p-3 text-xs">
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
                            Customer · {msg.channel} · {msg.timestamp?.slice(0, 16).replace("T", " ")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-muted rounded-xl rounded-tr-none p-3 text-xs text-right">
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 mr-1 text-right">
                            Agent · {msg.channel} · {msg.timestamp?.slice(0, 16).replace("T", " ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {(!commData?.communications || commData.communications.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No communications yet. Add the first message below.
                  </p>
                )}
              </div>

              {/* Send Message */}
              <div className="border rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground">Send Message</p>
                <Textarea
                  placeholder="Type your response to the customer..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  className="text-xs rounded-lg resize-none"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  onClick={() => sendMessageMutation.mutate()}
                >
                  {sendMessageMutation.isPending ? (
                    <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Sending…</>
                  ) : (
                    <><Send className="mr-1.5 h-3 w-3" />Send Message</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB: ESCALATE ── */}
          {activeTab === "escalate" && (
            <div className="space-y-4">
              {isEscalated ? (
                <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-center">
                  <ArrowUpCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-bold text-destructive">Complaint Escalated</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escalated to {escalationLevel} — {escalationTo}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                    <p className="text-xs text-warning font-medium">
                      Escalating will notify the responsible team and update the complaint status.
                    </p>
                  </div>

                  {/* Escalation Level */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Escalation Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["L1", "L2", "L3", "Management"].map((level) => (
                        <button
                          key={level}
                          onClick={() => setEscalationLevel(level)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            escalationLevel === level
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Escalate To */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Escalate To (Department)</label>
                    <Input
                      value={escalationTo}
                      onChange={(e) => setEscalationTo(e.target.value)}
                      placeholder="e.g. ATM Operations Team"
                      className="text-xs h-9 rounded-lg"
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Reason for Escalation</label>
                    <Textarea
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      placeholder="Describe why this complaint needs escalation..."
                      rows={3}
                      className="text-xs rounded-lg resize-none"
                    />
                  </div>

                  <Button
                    className="w-full rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
                    disabled={!escalationReason.trim() || !escalationTo.trim() || escalateMutation.isPending}
                    onClick={() => escalateMutation.mutate()}
                  >
                    {escalateMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Escalating…</>
                    ) : (
                      <><ArrowUpCircle className="mr-2 h-4 w-4" />Escalate to {escalationLevel}</>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}