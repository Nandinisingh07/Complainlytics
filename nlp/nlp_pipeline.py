import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
DATA_PATH    = "data/complaints.csv"
MODEL_DIR    = "nlp/models"
os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────
# STEP 1 — LOAD DATA
# ─────────────────────────────────────────
print("=" * 55)
print("PS5 — NLP Classification Pipeline")
print("iDEA Hackathon 2.0 | Union Bank of India")
print("=" * 55)

df = pd.read_csv(DATA_PATH)
print(f"\n✅ Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"   Non-duplicate complaints : {df[df['is_duplicate']==False].shape[0]}")
print(f"   Duplicate complaints     : {df[df['is_duplicate']==True].shape[0]}")

# Use only original complaints for training
train_df = df[df["is_duplicate"] == False].copy()
train_df = train_df.dropna(subset=["complaint_text"])
print(f"   Training samples         : {train_df.shape[0]}\n")

# ─────────────────────────────────────────
# STEP 2 — LABEL ENCODING
# ─────────────────────────────────────────
label_encoders = {}
for col in ["category", "sentiment", "severity"]:
    le = LabelEncoder()
    train_df[f"{col}_encoded"] = le.fit_transform(train_df[col])
    label_encoders[col] = le
    print(f"   {col} classes: {list(le.classes_)}")

# ─────────────────────────────────────────
# STEP 3 — TF-IDF + LOGISTIC REGRESSION
# ─────────────────────────────────────────
print("\n🔄 Training TF-IDF classifiers...")

targets = {
    "category" : "category_encoded",
    "sentiment": "sentiment_encoded",
    "severity" : "severity_encoded"
}

tfidf_models = {}

for name, target_col in targets.items():
    X = train_df["complaint_text"]
    y = train_df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=5.0,
            class_weight="balanced"
        ))
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    tfidf_models[name] = pipeline
    print(f"\n   [{name.upper()}] Accuracy: {acc:.2%}")
    print(classification_report(
        y_test, y_pred,
        target_names=label_encoders[name].classes_,
        zero_division=0
    ))

# Save TF-IDF models
with open(f"{MODEL_DIR}/tfidf_models.pkl", "wb") as f:
    pickle.dump(tfidf_models, f)
with open(f"{MODEL_DIR}/label_encoders.pkl", "wb") as f:
    pickle.dump(label_encoders, f)

print("✅ TF-IDF models saved!")

# ─────────────────────────────────────────
# STEP 4 — SENTENCE EMBEDDINGS FOR DEDUP
# ─────────────────────────────────────────
print("\n🔄 Generating sentence embeddings for duplicate detection...")
print("   (This may take 2-3 minutes on first run — downloading model)")

embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Generate embeddings for ALL complaints (including duplicates)
all_texts = df["complaint_text"].fillna("").tolist()
embeddings = embedder.encode(
    all_texts,
    batch_size=32,
    show_progress_bar=True,
    convert_to_numpy=True
)

# Save embeddings + complaint IDs for FAISS in next step
np.save(f"{MODEL_DIR}/embeddings.npy", embeddings)
df[["complaint_id", "complaint_text", "is_duplicate"]].to_csv(
    f"{MODEL_DIR}/embedding_index.csv", index=False
)

print(f"\n✅ Embeddings saved! Shape: {embeddings.shape}")

# ─────────────────────────────────────────
# STEP 5 — QUICK INFERENCE TEST
# ─────────────────────────────────────────
print("\n" + "=" * 55)
print("🧪 Quick Inference Test")
print("=" * 55)

sample_complaints = [
    "I tried to transfer money via NEFT but amount got debited and never reached. It has been 3 days.",
    "My ATM card was blocked suddenly without any notice. I am unable to withdraw cash.",
    "The mobile banking app keeps crashing whenever I try to check my balance.",
    "My KYC documents were submitted 2 weeks ago but account is still not activated.",
    "I was charged twice for the same credit card transaction. Please refund immediately."
]

def predict_complaint(text, models, encoders):
    result = {"complaint_text": text}
    for name, model in models.items():
        encoded = model.predict([text])[0]
        label   = encoders[name].inverse_transform([encoded])[0]
        proba   = model.predict_proba([text])[0].max()
        result[name]              = label
        result[f"{name}_confidence"] = f"{proba:.0%}"
    return result

print()
for complaint in sample_complaints:
    pred = predict_complaint(complaint, tfidf_models, label_encoders)
    print(f"  Complaint : {complaint[:65]}...")
    print(f"  Category  : {pred['category']} ({pred['category_confidence']})")
    print(f"  Sentiment : {pred['sentiment']} ({pred['sentiment_confidence']})")
    print(f"  Severity  : {pred['severity']} ({pred['severity_confidence']})")
    print()

# ─────────────────────────────────────────
# STEP 6 — SAVE FULL CLASSIFIED DATASET
# ─────────────────────────────────────────
print("🔄 Generating predictions for full dataset...")

df["predicted_category"] = tfidf_models["category"].predict(
    df["complaint_text"].fillna("")
)
df["predicted_category"] = label_encoders["category"].inverse_transform(
    df["predicted_category"]
)

df["predicted_sentiment"] = tfidf_models["sentiment"].predict(
    df["complaint_text"].fillna("")
)
df["predicted_sentiment"] = label_encoders["sentiment"].inverse_transform(
    df["predicted_sentiment"]
)

df["predicted_severity"] = tfidf_models["severity"].predict(
    df["complaint_text"].fillna("")
)
df["predicted_severity"] = label_encoders["severity"].inverse_transform(
    df["predicted_severity"]
)

df.to_csv("data/complaints_classified.csv", index=False)

print("✅ Full classified dataset saved to data/complaints_classified.csv")
print("\n" + "=" * 55)
print("🎉 NLP Pipeline Complete!")
print("   Models saved in  : nlp/models/")
print("   Next step        : Step 3 — Duplicate Detection (FAISS)")
print("=" * 55)