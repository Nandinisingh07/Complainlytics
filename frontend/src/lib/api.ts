const BASE_URL = "http://localhost:8000";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── INTERFACES ───────────────────────────────────────────

export interface StatsOverview {
  total_complaints: number;
  open: number;
  in_progress: number;
  resolved: number;
  escalated: number;
  critical_count: number;
  duplicate_count: number;
  sla_breached: number;
  sla_at_risk: number;
  sla_compliance_rate: number;
  active_escalations: number;
  avg_resolution_days: number;
}

export interface Complaint {
  complaint_id: string;
  category: string;
  sentiment: string;
  severity: string;
  channel: string;
  branch: string;
  status: string;
  created_date: string;
  complaint_text?: string;
  is_duplicate?: boolean;
}

export interface FilterOptions {
  categories: string[];
  severities: string[];
  sentiments: string[];
  statuses: string[];
  branches: string[];
  channels: string[];
}

export interface DraftResponse {
  priority_score: number;
  escalate_to: string;
  resolution_sla: string;
  action_items: string[];
  draft_response: string;
  drafted_response?: string;
  root_cause?: string;
  customer_tone_tip?: string;
  regulatory_flag?: boolean;
  regulatory_reason?: string;
}

export interface CategoryStat { category: string; count: number; }
export interface SentimentStat { sentiment: string; count: number; }
export interface SeverityStat  { severity: string;  count: number; }
export interface BranchStat    { branch: string;    count: number; }
export interface ChannelStat   { channel: string;   count: number; icon?: string; }
export interface TrendStat     { month: string;     count: number; }

export interface DuplicatePair {
  complaint_id_1: string;
  complaint_id_2: string;
  text_1?: string;
  text_2?: string;
  category?: string;
  similarity_score: number;
  is_known_dup?: boolean;
}

export interface AnalyzeResult {
  predicted_category: string;
  predicted_sentiment: string;
  predicted_severity: string;
  category_confidence: number;
  sentiment_confidence: number;
  severity_confidence: number;
  similar_complaints: { complaint_id: string; complaint_text: string; similarity: number }[];
  duplicate_found: boolean;
  suggested_department: string;
  suggested_sla: string;
}

export interface SLAInfo {
  sla_hours: number;
  due_date: string;
  hours_remaining: number;
  is_breached: boolean;
  sla_status: "On Track" | "At Risk" | "Breached";
  completion_pct: number;
}

export interface SLASummary {
  total_open: number;
  on_track: number;
  at_risk: number;
  breached: number;
  compliance_rate: number;
  sla_config: Record<string, number>;
}

export interface CommunicationMessage {
  sender: "agent" | "customer" | "system";
  message: string;
  channel: string;
  timestamp: string;
  type?: string;
}

export interface EscalationInfo {
  complaint_id: string;
  escalation_level: string;
  reason: string;
  escalated_to: string;
  escalated_by: string;
  escalated_at: string;
  status: string;
}

export interface RegulatoryReport {
  report_date: string;
  reporting_period: string;
  bank_name: string;
  total_complaints: number;
  total_resolved: number;
  total_pending: number;
  total_escalated: number;
  critical_complaints: number;
  overall_resolution_rate: number;
  category_wise_report: {
    category: string;
    total: number;
    resolved: number;
    escalated: number;
    critical: number;
    resolution_rate: number;
  }[];
  channel_wise_report: { channel: string; count: number }[];
  branch_wise_report: { branch: string; count: number }[];
  rbi_compliance_note: string;
}

// ─── API CALLS ────────────────────────────────────────────

export const api = {

  // ── Core ──
  getOverview: () =>
    fetchJSON<any>("/stats/overview").then((res) => ({
      total_complaints   : res.total_complaints ?? 0,
      open               : res.open ?? 0,
      in_progress        : res.in_progress ?? 0,
      resolved           : res.resolved ?? 0,
      escalated          : res.escalated ?? 0,
      critical_count     : res.critical_count ?? 0,
      duplicate_count    : res.duplicate_count ?? 0,
      sla_breached       : res.sla_breached ?? 0,
      sla_at_risk        : res.sla_at_risk ?? 0,
      sla_compliance_rate: res.sla_compliance_rate ?? 100,
      active_escalations : res.active_escalations ?? 0,
      avg_resolution_days: res.avg_resolution_days ?? 0,
    } as StatsOverview)),

  getComplaints: (limit = 50) =>
    fetchJSON<{ total: number; complaints: Complaint[] }>(`/complaints?limit=${limit}`)
      .then((res) => res.complaints),

  getFilterOptions: () => fetchJSON<FilterOptions>("/filters/options"),

  draftResponse: (text: string, customerName?: string, channel?: string) =>
    fetchJSON<DraftResponse>("/complaints/draft-response", {
      method: "POST",
      body: JSON.stringify({
        complaint_text: text,
        customer_name : customerName ?? "Customer",
        channel       : channel ?? "Web Portal",
      }),
    }),

  // ── Stats ──
  getByCategory : () => fetchJSON<CategoryStat[]>("/stats/by-category"),
  getBySentiment: () => fetchJSON<SentimentStat[]>("/stats/by-sentiment"),
  getBySeverity : () => fetchJSON<SeverityStat[]>("/stats/by-severity"),
  getByBranch   : () => fetchJSON<BranchStat[]>("/stats/by-branch"),
  getByChannel  : () => fetchJSON<ChannelStat[]>("/stats/by-channel"),
  getTrend      : () => fetchJSON<TrendStat[]>("/stats/trend"),

  getDuplicates: () =>
    fetchJSON<{ total_pairs: number; pairs: DuplicatePair[] }>("/duplicates")
      .then((res) => res.pairs),

  analyzeComplaint: (text: string) =>
    fetchJSON<AnalyzeResult>("/complaints/analyze", {
      method: "POST",
      body: JSON.stringify({ complaint_text: text }),
    }),

  // ── SLA ──
  getSLASummary: () => fetchJSON<SLASummary>("/sla/summary"),

  getSLABreached: () =>
    fetchJSON<{ total_breached: number; complaints: any[] }>("/sla/breached"),

  getSLAAtRisk: () =>
    fetchJSON<{ total_at_risk: number; complaints: any[] }>("/sla/at-risk"),

  getComplaintSLA: (complaintId: string) =>
    fetchJSON<SLAInfo>(`/complaints/${complaintId}/sla`),

  extendSLA: (complaintId: string, extendHours: number, reason: string) =>
    fetchJSON<any>("/complaints/sla/extend", {
      method: "POST",
      body: JSON.stringify({
        complaint_id : complaintId,
        extend_hours : extendHours,
        reason,
      }),
    }),

  // ── Communications ──
  getCommunications: (complaintId: string) =>
    fetchJSON<{ complaint_id: string; total_messages: number; communications: CommunicationMessage[] }>(
      `/complaints/${complaintId}/communications`
    ),

  addCommunication: (complaintId: string, sender: string, message: string, channel = "Internal") =>
    fetchJSON<any>("/complaints/communicate", {
      method: "POST",
      body: JSON.stringify({
        complaint_id: complaintId,
        sender,
        message,
        channel,
      }),
    }),

  // ── Escalations ──
  escalateComplaint: (
    complaintId: string,
    escalationLevel: string,
    reason: string,
    escalatedTo: string,
    escalatedBy = "Agent"
  ) =>
    fetchJSON<any>("/complaints/escalate", {
      method: "POST",
      body: JSON.stringify({
        complaint_id      : complaintId,
        escalation_level  : escalationLevel,
        reason,
        escalated_to      : escalatedTo,
        escalated_by      : escalatedBy,
      }),
    }),

  getEscalation: (complaintId: string) =>
    fetchJSON<any>(`/complaints/${complaintId}/escalation`),

  getActiveEscalations: () =>
    fetchJSON<{ total: number; escalations: EscalationInfo[] }>("/escalations/active"),

  getEscalationSummary: () =>
    fetchJSON<{ total_escalated: number; by_level: Record<string, number>; escalation_rate: number }>(
      "/escalations/summary"
    ),

  // ── Regulatory ──
  getRegulatoryReport: () => fetchJSON<RegulatoryReport>("/regulatory/summary"),

  getRBIFlags: () =>
    fetchJSON<{ total_flagged: number; complaints: any[] }>("/regulatory/rbi-flags"),

  exportRegulatoryData: () =>
    fetchJSON<{ export_date: string; total_records: number; data: any[] }>("/regulatory/export"),
};