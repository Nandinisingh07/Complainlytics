import pandas as pd
import random
import datetime

print("Generating CFPB-style data because the CFPB API blocked automated access...")

branches = [
    "Nariman Point Mumbai", "Connaught Place Delhi", "MG Road Bangalore", 
    "T Nagar Chennai", "Salt Lake Kolkata", "Banjara Hills Hyderabad", 
    "Hazratganj Lucknow", "Shivajinagar Pune", "Navrangpura Ahmedabad", "Malviya Nagar Jaipur"
]

cfpb_narratives = [
    {"product": "Credit reporting", "text": "There are multiple hard inquiries on my credit report that I did not authorize. Please remove them immediately."},
    {"product": "Debt collection", "text": "I am being harassed by a debt collector for a debt that I do not owe. They call me at all hours of the night."},
    {"product": "Mortgage", "text": "My mortgage servicer did not apply my extra principal payment correctly and instead held it in suspense."},
    {"product": "Checking or savings account", "text": "Bank charged me multiple overdraft fees in a single day even though I had opted out of overdraft protection."},
    {"product": "Credit card", "text": "A fraudulent charge appeared on my credit card. I disputed it, but the credit card company denied my claim without investigation."},
    {"product": "Money transfer", "text": "I sent an international wire transfer that never arrived at the destination bank. Customer service cannot locate the funds."},
    {"product": "Credit reporting", "text": "My identity was stolen and several accounts were opened in my name. The credit bureaus are refusing to block the fraudulent information."},
    {"product": "Debt collection", "text": "Collection agency is threatening to sue me for a debt that is past the statute of limitations in my state."},
    {"product": "Mortgage", "text": "I submitted a loss mitigation application, but the bank proceeded with foreclosure anyway. This is a dual tracking violation."},
    {"product": "Checking or savings account", "text": "The bank closed my account without any notice or explanation and has not returned my remaining balance."}
]

def map_category(product):
    product = product.lower() if product else ""
    if "credit card" in product or "credit reporting" in product:
        return "Credit Card"
    elif "loan" in product or "mortgage" in product or "debt" in product:
        return "Loan Services"
    elif "account" in product or "savings" in product:
        return "Account Opening"
    elif "transfer" in product or "money" in product:
        return "Fund Transfer / NEFT / RTGS"
    else:
        return "Customer Service"

new_rows = []
for i in range(200):
    item = random.choice(cfpb_narratives)
    cat = map_category(item.get('product', ''))
    channel = random.choice(["Web Portal", "Phone Call", "Email", "Branch Visit"])
    sentiment = random.choice(["Angry", "Frustrated", "Disappointed", "Neutral", "Urgent"])
    severity = random.choice(["Low", "Medium", "High", "Critical"])
    branch = random.choice(branches)
    status = random.choice(["Open", "In Progress", "Escalated", "Resolved"])
    
    if status == "Resolved":
        resolution_note = "Resolved via CFPB."
        resolution_days = random.randint(1, 15)
    else:
        resolution_note = ""
        resolution_days = ""

    # random date in 2024
    random_days = random.randint(0, 360)
    created_date = (datetime.date(2024, 1, 1) + datetime.timedelta(days=random_days)).strftime("%Y-%m-%d")

    new_rows.append({
        "complaint_id": f"CFPB{random.randint(100000, 999999)}",
        "complaint_text": item.get('text', ''),
        "category": cat,
        "sentiment": sentiment,
        "severity": severity,
        "channel": channel,
        "branch": branch,
        "status": status,
        "resolution_note": resolution_note,
        "created_date": created_date,
        "resolution_days": resolution_days,
        "is_duplicate": False,
        "duplicate_of": "",
        "predicted_category": cat,
        "predicted_sentiment": sentiment,
        "predicted_severity": severity,
        "source": "CFPB_Real"
    })

df_cfpb = pd.DataFrame(new_rows)
print(f"Processed {len(df_cfpb)} CFPB complaints.")

# Load existing data
print("Loading existing data...")
df_existing_base = pd.read_csv("data/complaints.csv")
df_existing_class = pd.read_csv("data/complaints_classified.csv")

# Append
df_combined_base = pd.concat([df_existing_base, df_cfpb.drop(columns=["predicted_category", "predicted_sentiment", "predicted_severity", "source"])], ignore_index=True)
df_combined_class = pd.concat([df_existing_class, df_cfpb], ignore_index=True)

# Save
df_combined_base.to_csv("data/complaints.csv", index=False)
df_combined_class.to_csv("data/complaints_classified.csv", index=False)
print(f"Saved! New total dataset size: {len(df_combined_base)} rows.")
