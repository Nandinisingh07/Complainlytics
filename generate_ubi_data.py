import pandas as pd
import numpy as np
import random
import datetime

# Configuration
NUM_ROWS = 1000
START_DATE = datetime.date(2023, 1, 1)
END_DATE = datetime.date(2024, 12, 31)

branches = [
    "Nariman Point Mumbai", "Connaught Place Delhi", "MG Road Bangalore", 
    "T Nagar Chennai", "Salt Lake Kolkata", "Banjara Hills Hyderabad", 
    "Hazratganj Lucknow", "Shivajinagar Pune", "Navrangpura Ahmedabad", "Malviya Nagar Jaipur"
]

templates = {
    "Mobile Banking App": [
        "The Vyom app keeps crashing when I try to login.",
        "Unable to register on Vyom app using my Aadhaar.",
        "U-Mobile app is very slow, transferring funds via UPI fails.",
        "Vyom app shows 'server error' during NEFT transfer.",
        "Cannot reset my MPIN on the Union Bank Vyom app."
    ],
    "Internet Banking": [
        "Union Bank net banking portal is down for the last 3 days.",
        "Not able to add beneficiary in retail internet banking.",
        "My net banking password got locked and online reset is not working.",
        "Corporate internet banking transaction password is not arriving via SMS.",
        "Session expires too fast on Union Bank internet banking."
    ],
    "ATM / Debit Card": [
        "My Union Bank Rupay Platinum debit card was declined at a merchant.",
        "ATM dispensed less cash but full amount deducted from my UBI account.",
        "Requested a new debit card via Vyom app, haven't received it in 20 days.",
        "Contactless payment is not working on my Union Bank Visa card.",
        "Debit card got stuck in the Union Bank ATM at {branch}."
    ],
    "Credit Card": [
        "Union Miles credit card reward points are not credited properly.",
        "Charged an annual fee for my Union Bank lifetime free credit card.",
        "Want to upgrade my credit card to Union Premier but no response.",
        "Credit card limit was reduced without any prior notice.",
        "Bill payment done via NEFT is not reflecting in my credit card statement."
    ],
    "Loan Services": [
        "Union Home loan EMI deducted twice this month.",
        "Prepayment of my Union Education loan is not updated in the portal.",
        "Applied for Union Vehicle loan 2 weeks ago, no update from {branch}.",
        "Interest rate on my home loan was not reduced despite repo rate cut.",
        "Branch manager at {branch} is not releasing property documents after loan closure."
    ],
    "Customer Service": [
        "Toll free customer care number is always busy.",
        "Sent an email to customercare@unionbankofindia.com but no reply.",
        "Staff at {branch} were very rude when I went to update my passbook.",
        "Grievance redressal officer is not responding to my escalated complaint.",
        "Waited for 2 hours at {branch} just to submit a KYC form."
    ],
    "KYC / Documentation": [
        "Submitted Aadhaar and PAN at {branch} but KYC is still pending.",
        "My account is frozen due to pending KYC despite submitting documents online.",
        "Vyom app e-KYC video call disconnected and now I can't retry.",
        "Name mismatch issue in CKYC is not being resolved by the branch.",
        "Need to update my signature but branch says system is down."
    ],
    "Fixed Deposit": [
        "Union Bank tax saver FD receipt is not downloading.",
        "Premature withdrawal of FD through net banking is throwing an error.",
        "Interest rate applied on my senior citizen FD is incorrect.",
        "My FD matured but the amount is not credited to my savings account.",
        "Cannot link my FD to my savings account for overdraft facility."
    ],
    "Account Opening": [
        "Opened a digital savings account via Vyom app but account is inactive.",
        "Salary account opened at {branch} but welcome kit not received.",
        "Unable to complete video KYC for new Union Bank account.",
        "My minor account was not converted to major despite submitting PAN.",
        "Initial funding failed but money was deducted during account opening."
    ],
    "Fund Transfer / NEFT / RTGS": [
        "IMPS transfer failed but money debited from my UBI account.",
        "NEFT transfer to SBI is pending for over 24 hours.",
        "RTGS transaction rejected but refund not received.",
        "UPI payment via Vyom app is failing continuously.",
        "Beneficiary received money but my account shows 'transaction failed'."
    ]
}

resolutions = [
    "We apologize for the inconvenience. The issue has been resolved.",
    "Your complaint has been forwarded to the technical team.",
    "We have processed the refund. It will reflect in 3-5 working days.",
    "Please visit your base branch with original KYC documents.",
    "The technical glitch in Vyom app has been fixed in the latest update.",
    "Your request is in progress and will be completed within 48 hours.",
    "We regret the delay. The card has been dispatched via Speed Post."
]

data = []
complaint_id_counter = 1000

for i in range(NUM_ROWS):
    cat = random.choice(list(templates.keys()))
    text = random.choice(templates[cat])
    branch = random.choice(branches)
    text = text.format(branch=branch)
    
    sentiment = random.choice(["Angry", "Frustrated", "Disappointed", "Neutral", "Urgent"])
    severity = random.choice(["Low", "Medium", "High", "Critical"])
    channel = random.choice(["Mobile App", "Web Portal", "Phone Call", "Branch Visit", "Social Media", "Email"])
    status = random.choice(["Open", "In Progress", "Escalated", "Resolved"])
    
    if status == "Resolved":
        resolution_note = random.choice(resolutions)
        resolution_days = random.randint(1, 15)
    else:
        resolution_note = ""
        resolution_days = ""
        
    date_delta = END_DATE - START_DATE
    random_days = random.randrange(date_delta.days)
    created_date = START_DATE + datetime.timedelta(days=random_days)
    
    is_duplicate = False
    duplicate_of = ""
    if random.random() < 0.05:
        is_duplicate = True
        duplicate_of = f"CMP{random.randint(1000, complaint_id_counter)}"
        
    data.append({
        "complaint_id": f"CMP{complaint_id_counter}",
        "complaint_text": text,
        "category": cat,
        "sentiment": sentiment,
        "severity": severity,
        "channel": channel,
        "branch": branch,
        "status": status,
        "resolution_note": resolution_note,
        "created_date": created_date.strftime("%Y-%m-%d"),
        "resolution_days": resolution_days,
        "is_duplicate": is_duplicate,
        "duplicate_of": duplicate_of,
        "predicted_category": cat,
        "predicted_sentiment": sentiment,
        "predicted_severity": severity,
        "source": "Synthetic_UBI"
    })
    complaint_id_counter += 1

df = pd.DataFrame(data)

# Save both versions for safety
df_base = df.drop(columns=["predicted_category", "predicted_sentiment", "predicted_severity", "source"])
df_base.to_csv("data/complaints.csv", index=False)
df.to_csv("data/complaints_classified.csv", index=False)
print(f"Generated {len(df)} synthetic Union Bank of India complaints!")
