from google import genai
from google.genai import types
import pandas as pd
import json
import os
import pickle
import time

# ─────────────────────────────────────────
# CONFIG — paste your Gemini API key here
# ─────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyD_6xFl2-33bq6keriR-xvla5k8CNdKjqA"

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL  = "gemini-2.5-flash"

MODEL_DIR = "nlp/models"
DATA_PATH = "data/complaints_classified.csv"
os.makedirs("genai", exist_ok=True)

# ─────────────────────────────────────────
# QUICK API TEST
# ─────────────────────────────────────────
print("=" * 55)
print("PS5 — Gen-AI Response Drafter")
print("iDEA Hackathon 2.0 | Union Bank of India")
print("=" * 55)

print("\n🔄 Testing Gemini API connection...")
try:
    test = client.models.generate_content(
        model=MODEL,
        contents="Reply with exactly one word: Connected"
    )
    print(f"✅ Gemini API connected: {test.text.strip()}\n")
except Exception as e:
    print(f"❌ API Error: {e}")
    print("   → Check your API key on line 8 of this file")
    exit(1)

# ─────────────────────────────────────────
# LOAD DATA + NLP MODELS
# ─────────────────────────────────────────
df = pd.read_csv(DATA_PATH)

with open(f"{MODEL_DIR}/tfidf_models.pkl", "rb") as f:
    tfidf_models = pickle.load(f)
with open(f"{MODEL_DIR}/label_encoders.pkl", "rb") as f:
    label_encoders = pickle.load(f)

print(f"✅ Loaded {len(df)} complaints and NLP models")

# ─────────────────────────────────────────
# PREDICT COMPLAINT METADATA
# ─────────────────────────────────────────
def predict_complaint(text):
    result = {}
    for name, mdl in tfidf_models.items():
        encoded = mdl.predict([text])[0]
        label   = label_encoders[name].inverse_transform([encoded])[0]
        proba   = mdl.predict_proba([text])[0].max()
        result[name]                 = label
        result[f"{name}_confidence"] = f"{proba:.0%}"
    return result

# ─────────────────────────────────────────
# GEMINI CALL HELPER
# ─────────────────────────────────────────
def call_gemini(prompt):
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    return json.loads(response.text)

# ─────────────────────────────────────────
# RESPONSE DRAFTER
# ─────────────────────────────────────────
def draft_response(complaint_text, metadata=None):
    if metadata is None:
        metadata = predict_complaint(complaint_text)

    prompt = f"""
You are a senior customer service officer at Union Bank of India.
A customer submitted this complaint:

COMPLAINT: {complaint_text}

METADATA:
- Category  : {metadata.get('category', 'General')}
- Sentiment : {metadata.get('sentiment', 'Neutral')}
- Severity  : {metadata.get('severity', 'Medium')}

Return a JSON object with these exact keys:
{{
  "draft_response": "Professional empathetic 3-4 sentence response. Address the specific issue, apologize sincerely, state action being taken, give resolution timeline.",
  "root_cause": "1-2 sentence analysis of likely root cause from banking operations perspective.",
  "action_items": ["action 1", "action 2", "action 3"],
  "escalate_to": "Department or team to escalate to",
  "resolution_sla": "e.g. 24 hours or 2-3 working days",
  "priority_score": 8,
  "customer_tone_tip": "Short tip for agent on handling this customer emotion"
}}
"""

    try:
        result = call_gemini(prompt)
        result["complaint_text"]      = complaint_text
        result["predicted_category"]  = metadata.get("category")
        result["predicted_sentiment"] = metadata.get("sentiment")
        result["predicted_severity"]  = metadata.get("severity")
        return result
    except Exception as e:
        return {
            "complaint_text"     : complaint_text,
            "draft_response"     : "We sincerely apologize for the inconvenience. Your complaint has been registered and our team will contact you within 2-3 working days.",
            "root_cause"         : "Unable to analyze.",
            "action_items"       : ["Register complaint", "Assign to department", "Follow up within SLA"],
            "escalate_to"        : "Customer Service Team",
            "resolution_sla"     : "2-3 working days",
            "priority_score"     : 5,
            "customer_tone_tip"  : "Be empathetic and professional.",
            "predicted_category" : metadata.get("category"),
            "predicted_sentiment": metadata.get("sentiment"),
            "predicted_severity" : metadata.get("severity"),
            "error"              : str(e)
        }

# ─────────────────────────────────────────
# TREND ANALYSIS
# ─────────────────────────────────────────
def generate_trend_summary(df):
    category_counts  = df["category"].value_counts().to_dict()
    sentiment_counts = df["sentiment"].value_counts().to_dict()
    severity_counts  = df["severity"].value_counts().to_dict()
    branch_counts    = df["branch"].value_counts().head(5).to_dict()
    top_category     = max(category_counts, key=category_counts.get)
    top_branch       = max(branch_counts,   key=branch_counts.get)

    prompt = f"""
You are a banking analytics officer at Union Bank of India analyzing complaint trends.

Data summary:
- Total complaints   : {len(df)}
- By category        : {json.dumps(category_counts)}
- By sentiment       : {json.dumps(sentiment_counts)}
- By severity        : {json.dumps(severity_counts)}
- Top branches       : {json.dumps(branch_counts)}
- Highest volume     : {top_category} at {top_branch}

Return a JSON object with these exact keys:
{{
  "executive_summary": "3-4 sentence executive summary of complaint trends for bank management.",
  "top_concerns": ["concern 1", "concern 2", "concern 3"],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "risk_alert": "One sentence about the most critical risk needing immediate attention.",
  "positive_note": "One positive observation from the data."
}}
"""

    try:
        return call_gemini(prompt)
    except Exception as e:
        return {
            "executive_summary"   : f"Error: {e}",
            "top_concerns"        : [],
            "recommended_actions" : [],
            "risk_alert"          : "",
            "positive_note"       : ""
        }

# ─────────────────────────────────────────
# RUN TESTS
# ─────────────────────────────────────────
print("\n🔄 Drafting responses for sample complaints...\n")

test_complaints = [
    "I transferred Rs 50000 via NEFT to a beneficiary account but the money has not been credited even after 48 hours. Transaction shows successful on my end. Please resolve urgently.",
    "My credit card was charged twice for the same transaction at a restaurant. The duplicate charge of Rs 3500 needs to be reversed immediately.",
    "Mobile banking app keeps crashing after the latest update on my Android phone. I cannot access my account at all.",
    "My home loan EMI was debited twice this month causing financial difficulty. Please reverse the extra deduction.",
    "ATM card was blocked without any prior notice. I could not withdraw cash during a medical emergency."
]

drafted_responses = []

for i, complaint in enumerate(test_complaints, 1):
    print(f"📋 Complaint {i}: {complaint[:65]}...")
    result = draft_response(complaint)
    drafted_responses.append(result)

    print(f"   Category  : {result.get('predicted_category')} | Severity: {result.get('predicted_severity')}")
    print(f"   Priority  : {result.get('priority_score')}/10")
    print(f"   Escalate  : {result.get('escalate_to')}")
    print(f"   SLA       : {result.get('resolution_sla')}")
    print(f"   Response  : {str(result.get('draft_response',''))[:120]}...")
    print(f"   Root cause: {str(result.get('root_cause',''))[:100]}...")
    if "error" in result:
        print(f"   ⚠️  Error  : {result['error']}")
    print()
    time.sleep(0.3)

# ─────────────────────────────────────────
# TREND ANALYSIS
# ─────────────────────────────────────────
print("=" * 55)
print("📊 Generating Trend Analysis & Executive Summary...")
print("=" * 55)

trend = generate_trend_summary(df)
print(f"\n📌 Executive Summary:\n   {trend.get('executive_summary','')}")
print(f"\n⚠️  Risk Alert:\n   {trend.get('risk_alert','')}")
print(f"\n✅ Top Concerns:")
for c in trend.get("top_concerns", []):
    print(f"   • {c}")
print(f"\n🔧 Recommended Actions:")
for a in trend.get("recommended_actions", []):
    print(f"   • {a}")
print(f"\n💡 Positive Note:\n   {trend.get('positive_note','')}")

# ─────────────────────────────────────────
# SAVE OUTPUTS
# ─────────────────────────────────────────
with open("genai/sample_responses.json", "w") as f:
    json.dump(drafted_responses, f, indent=2)
with open("genai/trend_summary.json", "w") as f:
    json.dump(trend, f, indent=2)

print("\n" + "=" * 55)
print("🎉 Gen-AI Response Drafter Complete!")
print("   Sample responses : genai/sample_responses.json")
print("   Trend summary    : genai/trend_summary.json")
print("   Next step        : Step 5 — FastAPI Backend")
print("=" * 55)