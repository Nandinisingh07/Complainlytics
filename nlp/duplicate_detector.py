import numpy as np
import pandas as pd
import faiss
import pickle
import os
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
MODEL_DIR  = "nlp/models"
DATA_PATH  = "data/complaints_classified.csv"

# ─────────────────────────────────────────
# LOAD EMBEDDINGS + DATA
# ─────────────────────────────────────────
print("=" * 55)
print("PS5 — Duplicate Detection (FAISS)")
print("iDEA Hackathon 2.0 | Union Bank of India")
print("=" * 55)

df = pd.read_csv(DATA_PATH)
embeddings = np.load(f"{MODEL_DIR}/embeddings.npy").astype("float32")

print(f"\n✅ Loaded {len(df)} complaints")
print(f"   Embedding shape : {embeddings.shape}")

# ─────────────────────────────────────────
# BUILD FAISS INDEX
# ─────────────────────────────────────────
print("\n🔄 Building FAISS index...")

# Normalize embeddings for cosine similarity
faiss.normalize_L2(embeddings)

# Build flat index (exact search — fine for <10k complaints)
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # Inner product = cosine similarity after normalization
index.add(embeddings)

print(f"✅ FAISS index built with {index.ntotal} vectors")

# Save index
faiss.write_index(index, f"{MODEL_DIR}/faiss_index.bin")
print(f"✅ FAISS index saved to {MODEL_DIR}/faiss_index.bin")

# ─────────────────────────────────────────
# DUPLICATE DETECTION FUNCTION
# ─────────────────────────────────────────
def find_duplicates(query_text, top_k=5, threshold=0.82, embedder=None):
    """
    Given a complaint text, find similar complaints in the index.
    Returns list of similar complaints with similarity scores.
    """
    if embedder is None:
        embedder = SentenceTransformer("all-MiniLM-L6-v2")

    # Encode query
    query_vec = embedder.encode([query_text], convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(query_vec)

    # Search
    scores, indices = index.search(query_vec, top_k + 1)  # +1 because first result is itself

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        if score >= threshold:
            match = df.iloc[idx]
            results.append({
                "complaint_id"  : match["complaint_id"],
                "complaint_text": match["complaint_text"],
                "category"      : match["category"],
                "sentiment"     : match["sentiment"],
                "severity"      : match["severity"],
                "similarity"    : round(float(score), 4),
                "is_duplicate"  : match["is_duplicate"]
            })

    # Remove exact self-match (similarity = 1.0)
    results = [r for r in results if r["similarity"] < 0.9999]
    return results[:top_k]


def find_all_duplicate_pairs(threshold=0.82):
    """
    Scan all complaints and find all near-duplicate pairs.
    Returns a DataFrame of duplicate pairs.
    """
    print(f"\n🔄 Scanning all {len(df)} complaints for duplicates (threshold={threshold})...")

    pairs = []
    seen = set()

    # Search top 3 neighbors for every complaint
    scores_all, indices_all = index.search(embeddings, 4)

    for i in range(len(df)):
        for j_pos in range(1, 4):  # skip position 0 (self)
            j   = indices_all[i][j_pos]
            sim = scores_all[i][j_pos]

            if j == -1 or sim < threshold:
                continue

            pair_key = tuple(sorted([i, j]))
            if pair_key in seen:
                continue
            seen.add(pair_key)

            pairs.append({
                "complaint_id_1"  : df.iloc[i]["complaint_id"],
                "complaint_id_2"  : df.iloc[j]["complaint_id"],
                "text_1"          : df.iloc[i]["complaint_text"][:80] + "...",
                "text_2"          : df.iloc[j]["complaint_text"][:80] + "...",
                "category"        : df.iloc[i]["category"],
                "similarity_score": round(float(sim), 4),
                "is_known_dup"    : bool(df.iloc[j]["is_duplicate"])
            })

    pairs_df = pd.DataFrame(pairs).sort_values("similarity_score", ascending=False)
    return pairs_df


# ─────────────────────────────────────────
# RUN DUPLICATE SCAN
# ─────────────────────────────────────────
pairs_df = find_all_duplicate_pairs(threshold=0.82)
pairs_df.to_csv("data/duplicate_pairs.csv", index=False)

print(f"\n✅ Found {len(pairs_df)} near-duplicate pairs")
print(f"   Known duplicates detected : {pairs_df['is_known_dup'].sum()}")
print(f"   New potential duplicates  : {(~pairs_df['is_known_dup']).sum()}")
print(f"\n   Saved to: data/duplicate_pairs.csv")

# ─────────────────────────────────────────
# QUICK INFERENCE TEST
# ─────────────────────────────────────────
print("\n" + "=" * 55)
print("🧪 Live Duplicate Detection Test")
print("=" * 55)

embedder = SentenceTransformer("all-MiniLM-L6-v2")

test_queries = [
    "My ATM card was blocked without notice and I cannot withdraw money from the machine.",
    "NEFT transfer successful on my side but beneficiary has not received the funds after 2 days.",
    "Mobile banking app is crashing on my phone after the latest update was installed.",
]

for query in test_queries:
    print(f"\n📋 Query: {query[:70]}...")
    results = find_duplicates(query, top_k=3, threshold=0.75, embedder=embedder)

    if results:
        print(f"   Found {len(results)} similar complaint(s):\n")
        for r in results:
            print(f"   [{r['complaint_id']}] Similarity: {r['similarity']:.0%}")
            print(f"   Category : {r['category']} | Severity: {r['severity']}")
            print(f"   Text     : {r['complaint_text'][:75]}...")
            print()
    else:
        print("   No similar complaints found above threshold.\n")

# ─────────────────────────────────────────
# SHOW TOP DUPLICATE PAIRS
# ─────────────────────────────────────────
print("=" * 55)
print("📊 Top 10 Most Similar Complaint Pairs")
print("=" * 55)
print(pairs_df[["complaint_id_1", "complaint_id_2", "category", "similarity_score", "is_known_dup"]].head(10).to_string(index=False))

print("\n" + "=" * 55)
print("🎉 Duplicate Detection Complete!")
print(f"   FAISS index saved  : {MODEL_DIR}/faiss_index.bin")
print(f"   Duplicate pairs    : data/duplicate_pairs.csv")
print(f"   Next step          : Step 4 — Gen-AI Response Drafter")
print("=" * 55)