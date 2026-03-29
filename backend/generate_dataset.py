import google.generativeai as genai
import pandas as pd
import json
import time
import random
from tqdm import tqdm

# ─────────────────────────────────────────
# CONFIG — paste your Gemini API key here
# ─────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyCVPqUcVEVpjvqpJSt4vrzb_FGlmuFknRk"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# ─────────────────────────────────────────
# COMPLAINT CATEGORIES & CHANNELS
# ─────────────────────────────────────────
CATEGORIES = [
    "Internet Banking",
    "ATM / Debit Card",
    "Loan Services",
    "Account Opening",
    "Fund Transfer / NEFT / RTGS",
    "Credit Card",
    "KYC / Documentation",
    "Fixed Deposit",
    "Mobile Banking App",
    "Customer Service"
]

CHANNELS = ["Email", "Branch Visit", "Phone Call", "Mobile App", "Web Portal", "Social Media"]
SENTIMENTS = ["Angry", "Frustrated", "Neutral", "Disappointed", "Urgent"]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
STATUSES = ["Open", "In Progress", "Resolved", "Escalated"]
BRANCHES = [
    "Mumbai - Andheri", "Delhi - Connaught Place", "Bangalore - Koramangala",
    "Chennai - T Nagar", "Hyderabad - Banjara Hills", "Pune - Shivajinagar",
    "Kolkata - Salt Lake", "Ahmedabad - Navrangpura", "Jaipur - Malviya Nagar",
    "Lucknow - Hazratganj"
]

# ─────────────────────────────────────────
# PROMPT TEMPLATE
# ─────────────────────────────────────────
def build_prompt(category, sentiment, severity):
    return f"""
You are generating realistic Indian bank customer complaint data for a hackathon dataset.

Generate exactly 5 unique customer complaints for the following:
- Category: {category}
- Sentiment: {sentiment}
- Severity: {severity}

Return ONLY a valid JSON array with exactly 5 objects. No explanation, no markdown, no backticks.
Each object must have these exact keys:
- "complaint_text": realistic complaint in 2-4 sentences, written like an Indian customer (mix of formal and informal tone is fine)
- "resolution_note": a short 1-2 sentence bank response/resolution

Example format:
[
  {{
    "complaint_text": "I tried to transfer money via NEFT but the amount got debited and never reached the beneficiary. It has been 3 days and no refund. This is very frustrating.",
    "resolution_note": "We apologize for the inconvenience. The amount will be reversed within 2 working days."
  }}
]

Generate for category: {category}, sentiment: {sentiment}, severity: {severity}
"""

# ─────────────────────────────────────────
# GENERATE DATASET
# ─────────────────────────────────────────
def generate_complaints(total_target=500):
    all_complaints = []
    complaint_id = 1001

    # Build combinations
    combinations = []
    for category in CATEGORIES:
        for sentiment in random.sample(SENTIMENTS, 2):       # 2 sentiments per category
            for severity in random.sample(SEVERITIES, 2):    # 2 severities per combo
                combinations.append((category, sentiment, severity))

    random.shuffle(combinations)

    print(f"Generating ~{len(combinations) * 5} complaints across {len(combinations)} combinations...\n")

    for category, sentiment, severity in tqdm(combinations):
        try:
            prompt = build_prompt(category, sentiment, severity)
            response = model.generate_content(prompt)
            raw = response.text.strip()

            # Clean response
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            items = json.loads(raw)

            for item in items:
                complaint_text = item.get("complaint_text", "").strip()
                resolution_note = item.get("resolution_note", "").strip()

                if not complaint_text:
                    continue

                all_complaints.append({
                    "complaint_id": f"CMP{complaint_id:04d}",
                    "complaint_text": complaint_text,
                    "category": category,
                    "sentiment": sentiment,
                    "severity": severity,
                    "channel": random.choice(CHANNELS),
                    "branch": random.choice(BRANCHES),
                    "status": random.choice(STATUSES),
                    "resolution_note": resolution_note,
                    "created_date": pd.Timestamp('2024-01-01') + pd.Timedelta(days=random.randint(0, 365)),
                    "resolution_days": random.randint(1, 15) if random.random() > 0.3 else None,
                    "is_duplicate": False  # will update below
                })
                complaint_id += 1

            time.sleep(0.5)  # avoid rate limiting

            if len(all_complaints) >= total_target:
                break

        except Exception as e:
            print(f"\n⚠️ Error on {category}/{sentiment}/{severity}: {e}")
            time.sleep(2)
            continue

    return all_complaints

# ─────────────────────────────────────────
# ADD DUPLICATE COMPLAINTS (for PS5 dedup feature)
# ─────────────────────────────────────────
def add_duplicates(complaints, num_duplicates=30):
    print(f"\nAdding {num_duplicates} duplicate complaints for dedup testing...")
    originals = random.sample(complaints, num_duplicates)
    complaint_id = 9001

    for orig in originals:
        dup = orig.copy()
        dup["complaint_id"] = f"CMP{complaint_id:04d}"
        dup["channel"] = random.choice(CHANNELS)  # same complaint, different channel
        dup["is_duplicate"] = True
        dup["duplicate_of"] = orig["complaint_id"]
        dup["created_date"] = orig["created_date"] + pd.Timedelta(days=random.randint(1, 3))
        complaints.append(dup)
        complaint_id += 1

    return complaints

# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("PS5 — Complaint Dataset Generator")
    print("iDEA Hackathon 2.0 | Union Bank of India")
    print("=" * 50 + "\n")

    complaints = generate_complaints(total_target=500)
    complaints = add_duplicates(complaints, num_duplicates=30)

    df = pd.DataFrame(complaints)
    df = df.sample(frac=1).reset_index(drop=True)  # shuffle

    # Save
    output_path = "data/complaints.csv"
    df.to_csv(output_path, index=False)

    print(f"\n✅ Dataset generated successfully!")
    print(f"   Total complaints : {len(df)}")
    print(f"   Duplicates added : {df['is_duplicate'].sum()}")
    print(f"   Categories       : {df['category'].nunique()}")
    print(f"   Saved to         : {output_path}")
    print(f"\nSample:")
    print(df[["complaint_id", "category", "sentiment", "severity", "channel"]].head(5).to_string(index=False))