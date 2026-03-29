from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
import pickle
import faiss
import json
import time
import os
from datetime import datetime, timedelta
from sentence_transformers import SentenceTransformer
from google import genai
from google.genai import types
from dotenv import load_dotenv

# ─────────────────────────────────────────
# CONFIG — loaded from .env file
# ─────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MODEL_DIR      = os.getenv("MODEL_DIR", "nlp/models")
DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/complaints_classified.csv")

if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not found. Add it to your .env file.")

app = FastAPI(
    title="PS5 Complaint Dashboard API",
    description="iDEA Hackathon 2.0 — Union Bank of India",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# SLA CONFIGURATION (hours by severity)
# ─────────────────────────────────────────
SLA_HOURS = {
    "Critical": 4,
    "High"    : 24,
    "Medium"  : 72,
    "Low"     : 168
}

ESCALATION_DEPARTMENTS = {
    "ATM / Debit Card"              : "ATM & Card Operations Team",
    "Credit Card"                   : "Credit Card Disputes Team",
    "Fund Transfer / NEFT / RTGS"   : "NEFT/RTGS Operations Team",
    "Internet Banking"              : "Digital Banking Support",
    "Mobile Banking App"            : "Mobile Banking Dev Team",
    "KYC / Documentation"           : "KYC Compliance Team",
    "Loan Services"                 : "Loan Operations Department",
    "Customer Service"              : "Branch Service Quality Team",
    "Account Opening"               : "Account Services Team",
    "Fixed Deposit"                 : "Deposits & Treasury Team"
}

# ─────────────────────────────────────────
# LOAD MODELS
# ─────────────────────────────────────────
print("🔄 Loading models...")

df = pd.read_csv(DATA_PATH)
df["created_date"] = pd.to_datetime(df["created_date"])

with open(f"{MODEL_DIR}/tfidf_models.pkl", "rb") as f:
    tfidf_models = pickle.load(f)
with open(f"{MODEL_DIR}/label_encoders.pkl", "rb") as f:
    label_encoders = pickle.load(f)

embeddings = np.load(f"{MODEL_DIR}/embeddings.npy").astype("float32")
faiss.normalize_L2(embeddings)
faiss_index = faiss.read_index(f"{MODEL_DIR}/faiss_index.bin")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# ─────────────────────────────────────────
# IN-MEMORY STORES (for demo)
# ─────────────────────────────────────────
communication_store: dict = {}
escalation_store: dict = {}
sla_store: dict = {}

print(f"✅ All models loaded. {len(df)} complaints in database.\n")

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
def predict_complaint(text: str) -> dict:
    result = {}
    for name, mdl in tfidf_models.items():
        encoded = mdl.predict([text])[0]
        label   = label_encoders[name].inverse_transform([encoded])[0]
        proba   = mdl.predict_proba([text])[0].max()
        result[name]                 = label
        result[f"{name}_confidence"] = round(float(proba), 2)
    return result


def get_sla_info(complaint_id: str, severity: str, created_date) -> dict:
    hours = SLA_HOURS.get(severity, 72)
    if isinstance(created_date, str):
        created_date = pd.to_datetime(created_date)
    due_date = created_date + timedelta(hours=hours)
    now      = datetime.now()
    if complaint_id in sla_store:
        due_date = pd.to_datetime(sla_store[complaint_id]["due_date"])
    hours_remaining = (due_date - now).total_seconds() / 3600
    is_breached     = hours_remaining < 0
    return {
        "sla_hours"      : hours,
        "due_date"       : due_date.strftime("%Y-%m-%d %H:%M"),
        "hours_remaining": round(hours_remaining, 1),
        "is_breached"    : is_breached,
        "sla_status"     : "Breached" if is_breached else ("At Risk" if hours_remaining < hours * 0.2 else "On Track"),
        "completion_pct" : min(100, round((1 - hours_remaining / hours) * 100, 1)) if not is_breached else 100
    }


def find_similar_complaints(text: str, top_k: int = 3, threshold: float = 0.75, exclude_id: str = None):
    vec = embedder.encode([text], convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(vec)
    scores, indices = faiss_index.search(vec, top_k + 10)
    results = []
    seen_ids   = set()
    seen_texts = set()
    if exclude_id:
        seen_ids.add(exclude_id)
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1 or score >= 0.9999 or score < threshold:
            continue
        row  = df.iloc[idx]
        cid  = row["complaint_id"]
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        text_key = row["complaint_text"][:60].strip().lower()
        if text_key in seen_texts:
            continue
        seen_texts.add(text_key)
        results.append({
            "complaint_id"  : cid,
            "complaint_text": row["complaint_text"][:120] + "...",
            "category"      : row["category"],
            "severity"      : row["severity"],
            "similarity"    : round(float(score), 3)
        })
        if len(results) >= top_k:
            break
    return results


def find_all_duplicate_pairs(threshold: float = 0.82):
    pairs = []
    seen_pairs = set()
    scores_all, indices_all = faiss_index.search(embeddings, 6)
    for i in range(len(df)):
        row_i = df.iloc[i]
        cid_i = row_i["complaint_id"]
        for j_pos in range(1, 6):
            j   = int(indices_all[i][j_pos])
            sim = float(scores_all[i][j_pos])
            if j == -1 or j == i or sim >= 0.9999 or sim < threshold:
                continue
            row_j = df.iloc[j]
            cid_j = row_j["complaint_id"]
            if cid_i == cid_j:
                continue
            pair_key = tuple(sorted([cid_i, cid_j]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            pairs.append({
                "complaint_id_1"  : cid_i,
                "complaint_id_2"  : cid_j,
                "text_1"          : row_i["complaint_text"][:80] + "...",
                "text_2"          : row_j["complaint_text"][:80] + "...",
                "category"        : row_i["category"],
                "similarity_score": round(sim, 3),
                "is_known_dup"    : bool(row_j["is_duplicate"])
            })
    if not pairs:
        return pd.DataFrame()
    pairs_df = pd.DataFrame(pairs)
    pairs_df = pairs_df[pairs_df["complaint_id_1"] != pairs_df["complaint_id_2"]]
    return pairs_df.sort_values("similarity_score", ascending=False)


def call_gemini(prompt: str) -> dict:
    time.sleep(13)
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)


# ─────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────
class ComplaintRequest(BaseModel):
    complaint_text: str
    customer_name : Optional[str] = "Customer"
    channel       : Optional[str] = "Web Portal"

class AnalyzeRequest(BaseModel):
    complaint_text: str

class CommunicationMessage(BaseModel):
    complaint_id: str
    sender      : str
    message     : str
    channel     : Optional[str] = "Internal"

class EscalationRequest(BaseModel):
    complaint_id      : str
    escalation_level  : str
    reason            : str
    escalated_to      : str
    escalated_by      : Optional[str] = "Agent"

class SLAUpdateRequest(BaseModel):
    complaint_id: str
    extend_hours: int
    reason      : str


# ─────────────────────────────────────────
# CORE ROUTES
# ─────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "PS5 Complaint Dashboard API v2.0", "status": "running", "docs": "/docs"}


@app.get("/complaints")
def get_complaints(
    category : Optional[str] = None,
    sentiment: Optional[str] = None,
    severity : Optional[str] = None,
    status   : Optional[str] = None,
    limit    : int = 50
):
    filtered = df[df["is_duplicate"] == False].copy()
    if category:  filtered = filtered[filtered["category"] == category]
    if sentiment: filtered = filtered[filtered["sentiment"] == sentiment]
    if severity:  filtered = filtered[filtered["severity"] == severity]
    if status:    filtered = filtered[filtered["status"] == status]
    filtered = filtered.head(limit)
    filtered["created_date"] = filtered["created_date"].astype(str)
    filtered = filtered.fillna("")
    return {"total": len(filtered), "complaints": filtered.to_dict(orient="records")}


@app.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    row = df[df["complaint_id"] == complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    record = row.iloc[0].to_dict()
    record["created_date"] = str(record["created_date"])
    record = {k: ("" if pd.isna(v) else v) for k, v in record.items()}
    record["sla"]            = get_sla_info(complaint_id, record.get("severity", "Medium"), record["created_date"])
    record["communications"] = communication_store.get(complaint_id, [])
    record["escalation"]     = escalation_store.get(complaint_id, None)
    return record


@app.post("/complaints/analyze")
def analyze_complaint(req: AnalyzeRequest):
    predictions = predict_complaint(req.complaint_text)
    similar     = find_similar_complaints(req.complaint_text, top_k=3, threshold=0.75)
    return {
        "complaint_text"      : req.complaint_text,
        "predicted_category"  : predictions["category"],
        "predicted_sentiment" : predictions["sentiment"],
        "predicted_severity"  : predictions["severity"],
        "category_confidence" : predictions["category_confidence"],
        "sentiment_confidence": predictions["sentiment_confidence"],
        "severity_confidence" : predictions["severity_confidence"],
        "similar_complaints"  : similar,
        "duplicate_found"     : len(similar) > 0 and similar[0]["similarity"] > 0.88,
        "suggested_department": ESCALATION_DEPARTMENTS.get(predictions["category"], "Customer Service Team"),
        "suggested_sla"       : f"{SLA_HOURS.get(predictions['severity'], 72)} hours"
    }


@app.post("/complaints/draft-response")
def draft_response(req: ComplaintRequest):
    predictions = predict_complaint(req.complaint_text)
    similar     = find_similar_complaints(req.complaint_text, top_k=2, threshold=0.75)
    prompt = f"""
You are a senior customer service officer at Union Bank of India.
Customer name: {req.customer_name}
Channel: {req.channel}
COMPLAINT: {req.complaint_text}
METADATA:
- Category : {predictions['category']}
- Sentiment: {predictions['sentiment']}
- Severity : {predictions['severity']}
Return a JSON object:
{{
  "draft_response": "Professional empathetic 3-4 sentence response. Start with Dear {req.customer_name}.",
  "root_cause": "1-2 sentence root cause analysis from banking operations perspective.",
  "action_items": ["action 1", "action 2", "action 3"],
  "escalate_to": "{ESCALATION_DEPARTMENTS.get(predictions['category'], 'Customer Service Team')}",
  "resolution_sla": "{SLA_HOURS.get(predictions['severity'], 72)} hours",
  "priority_score": 8,
  "customer_tone_tip": "Short tip for agent on handling this customer emotion",
  "regulatory_flag": true or false,
  "regulatory_reason": "Reason if regulatory_flag is true, else empty string"
}}
"""
    try:
        result = call_gemini(prompt)
        return {
            **result,
            "predicted_category" : predictions["category"],
            "predicted_sentiment": predictions["sentiment"],
            "predicted_severity" : predictions["severity"],
            "similar_complaints" : similar,
            "duplicate_found"    : len(similar) > 0 and similar[0]["similarity"] > 0.88
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# SLA ROUTES
# ─────────────────────────────────────────
@app.get("/complaints/{complaint_id}/sla")
def get_sla(complaint_id: str):
    row = df[df["complaint_id"] == complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    record = row.iloc[0]
    return get_sla_info(complaint_id, record["severity"], record["created_date"])


@app.post("/complaints/sla/extend")
def extend_sla(req: SLAUpdateRequest):
    row = df[df["complaint_id"] == req.complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    record   = row.iloc[0]
    hours    = SLA_HOURS.get(record["severity"], 72)
    created  = record["created_date"]
    if isinstance(created, str):
        created = pd.to_datetime(created)
    new_due = created + timedelta(hours=hours) + timedelta(hours=req.extend_hours)
    sla_store[req.complaint_id] = {"due_date": new_due.isoformat(), "extended_by": req.extend_hours, "reason": req.reason, "extended_at": datetime.now().isoformat()}
    if req.complaint_id not in communication_store:
        communication_store[req.complaint_id] = []
    communication_store[req.complaint_id].append({"sender": "system", "message": f"SLA extended by {req.extend_hours} hours. Reason: {req.reason}. New due: {new_due.strftime('%Y-%m-%d %H:%M')}", "channel": "System", "timestamp": datetime.now().isoformat()})
    return {"message": "SLA extended", "new_due_date": new_due.isoformat()}


@app.get("/sla/breached")
def get_breached_complaints():
    orig = df[df["is_duplicate"] == False].copy()
    breached = []
    for _, row in orig.iterrows():
        sla = get_sla_info(row["complaint_id"], row["severity"], row["created_date"])
        if sla["is_breached"] and row["status"] not in ["Resolved"]:
            breached.append({"complaint_id": row["complaint_id"], "category": row["category"], "severity": row["severity"], "status": row["status"], "branch": row["branch"], "created_date": str(row["created_date"]), "sla": sla})
    return {"total_breached": len(breached), "complaints": breached[:50]}


@app.get("/sla/at-risk")
def get_at_risk_complaints():
    orig = df[df["is_duplicate"] == False].copy()
    at_risk = []
    for _, row in orig.iterrows():
        sla = get_sla_info(row["complaint_id"], row["severity"], row["created_date"])
        if sla["sla_status"] == "At Risk" and row["status"] not in ["Resolved"]:
            at_risk.append({"complaint_id": row["complaint_id"], "category": row["category"], "severity": row["severity"], "status": row["status"], "branch": row["branch"], "hours_remaining": sla["hours_remaining"], "sla": sla})
    return {"total_at_risk": len(at_risk), "complaints": at_risk[:50]}


@app.get("/sla/summary")
def get_sla_summary():
    orig = df[(df["is_duplicate"] == False) & (df["status"] != "Resolved")].copy()
    on_track = at_risk = breached = 0
    for _, row in orig.iterrows():
        sla = get_sla_info(row["complaint_id"], row["severity"], row["created_date"])
        if sla["sla_status"] == "Breached":   breached += 1
        elif sla["sla_status"] == "At Risk":  at_risk  += 1
        else:                                  on_track += 1
    total = on_track + at_risk + breached
    return {"total_open": total, "on_track": on_track, "at_risk": at_risk, "breached": breached, "compliance_rate": round((on_track / total * 100), 1) if total > 0 else 100, "sla_config": SLA_HOURS}


# ─────────────────────────────────────────
# COMMUNICATION ROUTES
# ─────────────────────────────────────────
@app.get("/complaints/{complaint_id}/communications")
def get_communications(complaint_id: str):
    row = df[df["complaint_id"] == complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    record  = row.iloc[0]
    history = communication_store.get(complaint_id, [])
    original = {"sender": "customer", "message": record["complaint_text"], "channel": record["channel"], "timestamp": str(record["created_date"]), "type": "original_complaint"}
    return {"complaint_id": complaint_id, "total_messages": len(history) + 1, "communications": [original] + history}


@app.post("/complaints/communicate")
def add_communication(msg: CommunicationMessage):
    row = df[df["complaint_id"] == msg.complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if msg.complaint_id not in communication_store:
        communication_store[msg.complaint_id] = []
    entry = {"sender": msg.sender, "message": msg.message, "channel": msg.channel, "timestamp": datetime.now().isoformat()}
    communication_store[msg.complaint_id].append(entry)
    return {"message": "Communication added", "entry": entry, "total_messages": len(communication_store[msg.complaint_id]) + 1}


# ─────────────────────────────────────────
# ESCALATION ROUTES
# ─────────────────────────────────────────
@app.post("/complaints/escalate")
def escalate_complaint(req: EscalationRequest):
    row = df[df["complaint_id"] == req.complaint_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Complaint not found")
    escalation_info = {"complaint_id": req.complaint_id, "escalation_level": req.escalation_level, "reason": req.reason, "escalated_to": req.escalated_to, "escalated_by": req.escalated_by, "escalated_at": datetime.now().isoformat(), "status": "Active"}
    escalation_store[req.complaint_id] = escalation_info
    if req.complaint_id not in communication_store:
        communication_store[req.complaint_id] = []
    communication_store[req.complaint_id].append({"sender": "system", "message": f"Complaint escalated to {req.escalation_level} — {req.escalated_to}. Reason: {req.reason}", "channel": "System", "timestamp": datetime.now().isoformat(), "type": "escalation"})
    return {"message": "Complaint escalated successfully", "escalation": escalation_info}


@app.get("/complaints/{complaint_id}/escalation")
def get_escalation(complaint_id: str):
    if complaint_id not in escalation_store:
        return {"complaint_id": complaint_id, "escalated": False}
    return {"complaint_id": complaint_id, "escalated": True, **escalation_store[complaint_id]}


@app.get("/escalations/active")
def get_active_escalations():
    return {"total": len(escalation_store), "escalations": list(escalation_store.values())}


@app.get("/escalations/summary")
def get_escalation_summary():
    levels = {}
    for esc in escalation_store.values():
        level = esc.get("escalation_level", "Unknown")
        levels[level] = levels.get(level, 0) + 1
    return {"total_escalated": len(escalation_store), "by_level": levels, "escalation_rate": round(len(escalation_store) / max(len(df[df["is_duplicate"]==False]), 1) * 100, 2)}


# ─────────────────────────────────────────
# REGULATORY ROUTES
# ─────────────────────────────────────────
@app.get("/regulatory/summary")
def get_regulatory_summary():
    orig = df[df["is_duplicate"] == False]
    category_report = orig.groupby("category").agg(total=("complaint_id", "count"), resolved=("status", lambda x: (x == "Resolved").sum()), escalated=("status", lambda x: (x == "Escalated").sum()), critical=("severity", lambda x: (x == "Critical").sum())).reset_index()
    category_report["resolution_rate"] = (category_report["resolved"] / category_report["total"] * 100).round(1)
    total_resolved = len(orig[orig["status"] == "Resolved"])
    return {
        "report_date": datetime.now().strftime("%Y-%m-%d"), "reporting_period": "FY 2024-25", "bank_name": "Union Bank of India",
        "total_complaints": int(len(orig)), "total_resolved": int(total_resolved), "total_pending": int(len(orig[orig["status"] != "Resolved"])),
        "total_escalated": int(len(orig[orig["status"] == "Escalated"])), "critical_complaints": int(len(orig[orig["severity"] == "Critical"])),
        "overall_resolution_rate": round(total_resolved / len(orig) * 100, 1),
        "category_wise_report": category_report.to_dict(orient="records"),
        "channel_wise_report": orig.groupby("channel").size().reset_index(name="count").to_dict(orient="records"),
        "branch_wise_report": orig.groupby("branch").size().reset_index(name="count").sort_values("count", ascending=False).to_dict(orient="records"),
        "rbi_compliance_note": "This report is generated as per RBI Banking Ombudsman Scheme guidelines."
    }


@app.get("/regulatory/export")
def export_regulatory_report():
    orig = df[df["is_duplicate"] == False].copy()
    orig["created_date"] = orig["created_date"].astype(str)
    orig = orig.fillna("")
    records = []
    for _, row in orig.iterrows():
        sla = get_sla_info(row["complaint_id"], row["severity"], row["created_date"])
        record = row.to_dict()
        record["sla_status"]       = sla["sla_status"]
        record["sla_due_date"]     = sla["due_date"]
        record["sla_breached"]     = sla["is_breached"]
        record["escalated"]        = row["complaint_id"] in escalation_store
        record["escalation_level"] = escalation_store.get(row["complaint_id"], {}).get("escalation_level", "None")
        records.append(record)
    return {"export_date": datetime.now().isoformat(), "total_records": len(records), "data": records[:200]}


@app.get("/regulatory/rbi-flags")
def get_rbi_flags():
    orig = df[df["is_duplicate"] == False]
    flagged = []
    for _, row in orig.iterrows():
        sla = get_sla_info(row["complaint_id"], row["severity"], row["created_date"])
        if row["severity"] == "Critical" or sla["is_breached"]:
            flagged.append({"complaint_id": row["complaint_id"], "category": row["category"], "severity": row["severity"], "status": row["status"], "branch": row["branch"], "created_date": str(row["created_date"]), "sla_breached": sla["is_breached"], "flag_reason": "Critical severity" if row["severity"] == "Critical" else "SLA breached"})
    return {"total_flagged": len(flagged), "complaints": flagged[:100]}


# ─────────────────────────────────────────
# STATS ROUTES
# ─────────────────────────────────────────
@app.get("/stats/overview")
def get_overview():
    orig    = df[df["is_duplicate"] == False]
    sla_sum = get_sla_summary()
    return {
        "total_complaints"   : int(len(orig)),
        "open"               : int(len(orig[orig["status"] == "Open"])),
        "in_progress"        : int(len(orig[orig["status"] == "In Progress"])),
        "resolved"           : int(len(orig[orig["status"] == "Resolved"])),
        "escalated"          : int(len(orig[orig["status"] == "Escalated"])),
        "critical_count"     : int(len(orig[orig["severity"] == "Critical"])),
        "high_count"         : int(len(orig[orig["severity"] == "High"])),
        "duplicate_count"    : int(df["is_duplicate"].sum()),
        "avg_resolution_days": round(float(df["resolution_days"].mean()), 1),
        "sla_breached"       : sla_sum["breached"],
        "sla_at_risk"        : sla_sum["at_risk"],
        "sla_compliance_rate": sla_sum["compliance_rate"],
        "active_escalations" : len(escalation_store)
    }


@app.get("/stats/by-category")
def stats_by_category():
    orig = df[df["is_duplicate"] == False]
    return orig.groupby("category").size().reset_index(name="count").sort_values("count", ascending=False).to_dict(orient="records")


@app.get("/stats/by-sentiment")
def stats_by_sentiment():
    orig = df[df["is_duplicate"] == False]
    return orig.groupby("sentiment").size().reset_index(name="count").to_dict(orient="records")


@app.get("/stats/by-severity")
def stats_by_severity():
    orig = df[df["is_duplicate"] == False]
    return orig.groupby("severity").size().reset_index(name="count").to_dict(orient="records")


@app.get("/stats/by-branch")
def stats_by_branch():
    orig = df[df["is_duplicate"] == False]
    return orig.groupby("branch").size().reset_index(name="count").sort_values("count", ascending=False).head(10).to_dict(orient="records")


@app.get("/stats/by-channel")
def stats_by_channel():
    orig   = df[df["is_duplicate"] == False]
    counts = orig.groupby("channel").size().reset_index(name="count").sort_values("count", ascending=False)
    icons  = {"Email": "📧", "Branch Visit": "🏦", "Phone Call": "📞", "Mobile App": "📱", "Web Portal": "🌐", "Social Media": "📣"}
    counts["icon"] = counts["channel"].map(icons).fillna("📋")
    return counts.to_dict(orient="records")


@app.get("/stats/trend")
def stats_trend():
    orig = df[df["is_duplicate"] == False].copy()
    orig["month"] = orig["created_date"].dt.to_period("M").astype(str)
    return orig.groupby("month").size().reset_index(name="count").sort_values("month").to_dict(orient="records")


@app.get("/stats/heatmap")
def stats_heatmap():
    orig = df[df["is_duplicate"] == False]
    return orig.groupby(["category", "branch"]).size().reset_index(name="count").to_dict(orient="records")


@app.get("/stats/trend-summary")
def get_trend_summary():
    orig = df[df["is_duplicate"] == False]
    prompt = f"""
You are a banking analytics officer at Union Bank of India.
Data: total={len(orig)}, by_category={json.dumps(orig['category'].value_counts().to_dict())},
by_sentiment={json.dumps(orig['sentiment'].value_counts().to_dict())},
by_severity={json.dumps(orig['severity'].value_counts().to_dict())},
top_branches={json.dumps(orig['branch'].value_counts().head(5).to_dict())}
Return JSON:
{{
  "executive_summary": "3-4 sentence summary for bank management.",
  "top_concerns": ["concern 1", "concern 2", "concern 3"],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "risk_alert": "One sentence about critical risk.",
  "positive_note": "One positive observation.",
  "root_cause_analysis": "2-3 sentences identifying systemic root causes."
}}
"""
    try:
        return call_gemini(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/duplicates")
def get_duplicates():
    try:
        pairs_df = find_all_duplicate_pairs(threshold=0.82)
        if pairs_df.empty:
            return {"total_pairs": 0, "pairs": []}
        pairs_df = pairs_df.fillna("")
        return {"total_pairs": len(pairs_df), "pairs": pairs_df.head(50).to_dict(orient="records")}
    except Exception as e:
        return {"total_pairs": 0, "pairs": [], "error": str(e)}


@app.get("/filters/options")
def get_filter_options():
    orig = df[df["is_duplicate"] == False]
    return {
        "categories": sorted(orig["category"].unique().tolist()),
        "sentiments": sorted(orig["sentiment"].unique().tolist()),
        "severities": sorted(orig["severity"].unique().tolist()),
        "statuses"  : sorted(orig["status"].unique().tolist()),
        "branches"  : sorted(orig["branch"].unique().tolist()),
        "channels"  : sorted(orig["channel"].unique().tolist()),
    }