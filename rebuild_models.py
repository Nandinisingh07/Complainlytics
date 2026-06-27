import pandas as pd
import numpy as np
import pickle
import faiss
import os
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
DATA_PATH = "data/complaints_classified.csv"
MODEL_DIR = "nlp/models"
os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────
print("📂 Loading data...")
df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=["complaint_text"])
print(f"✅ Loaded {len(df)} complaints")

X = df["complaint_text"].tolist()

# ─────────────────────────────────────────
# TRAIN CLASSIFICATION MODELS
# ─────────────────────────────────────────
tfidf_models   = {}
label_encoders = {}

for target in ["category", "sentiment", "severity"]:
    print(f"🔄 Training {target} model...")
    y_raw = df[target].tolist()
    le    = LabelEncoder()
    y     = le.fit_transform(y_raw)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ("clf",   LogisticRegression(max_iter=1000))
    ])
    pipeline.fit(X, y)

    tfidf_models[target]   = pipeline
    label_encoders[target] = le
    print(f"   ✅ {target} — classes: {list(le.classes_)}")

# Save classification models
with open(f"{MODEL_DIR}/tfidf_models.pkl", "wb") as f:
    pickle.dump(tfidf_models, f)
with open(f"{MODEL_DIR}/label_encoders.pkl", "wb") as f:
    pickle.dump(label_encoders, f)
print("\n✅ Classification models saved.")

# ─────────────────────────────────────────
# BUILD EMBEDDINGS + FAISS INDEX
# ─────────────────────────────────────────
print("\n🔄 Building sentence embeddings (this may take a few minutes)...")
embedder   = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = embedder.encode(X, convert_to_numpy=True, show_progress_bar=True).astype("float32")

# Normalize for cosine similarity
faiss.normalize_L2(embeddings)

# Build FAISS index
dimension   = embeddings.shape[1]
faiss_index = faiss.IndexFlatIP(dimension)  # Inner product = cosine after normalization
faiss_index.add(embeddings)

# Save embeddings and index
np.save(f"{MODEL_DIR}/embeddings.npy", embeddings)
faiss.write_index(faiss_index, f"{MODEL_DIR}/faiss_index.bin")

print(f"✅ FAISS index built with {faiss_index.ntotal} vectors")
print(f"✅ Embeddings shape: {embeddings.shape}")

# ─────────────────────────────────────────
# VERIFY DUPLICATES WORK
# ─────────────────────────────────────────
print("\n🔍 Testing duplicate detection...")
scores_all, indices_all = faiss_index.search(embeddings, 6)
pair_count = 0
for i in range(min(len(df), 100)):  # test first 100
    for j_pos in range(1, 6):
        j   = int(indices_all[i][j_pos])
        sim = float(scores_all[i][j_pos])
        if j != -1 and j != i and 0.82 <= sim < 0.9999:
            pair_count += 1
            break

print(f"✅ Found {pair_count} potential duplicate pairs in first 100 complaints")
print("\n🎉 All done! Now restart your server:")
print("   uvicorn backend.app:app --reload --port 8000")