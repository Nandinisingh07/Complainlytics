import json
import os
import faiss
import numpy as np
import asyncio
from datetime import datetime
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "..", "nlp", "models"))

class RagEngine:
    def __init__(self):
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        faiss_path = os.path.join(MODEL_DIR, "policies_faiss.bin")
        meta_path = os.path.join(MODEL_DIR, "policies_meta.json")
        
        self.index = None
        self.metadata = []
        
        if os.path.exists(faiss_path) and os.path.exists(meta_path):
            self.index = faiss.read_index(faiss_path)
            with open(meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            print(f"✅ RAG Engine loaded {len(self.metadata)} policies.")
        else:
            print("⚠️ RAG Engine: Index not found. Please run build_rag_index.py")

    def search_policies(self, query: str, top_k: int = 3):
        if not self.index:
            return []
        vec = self.embedder.encode([query], convert_to_numpy=True).astype("float32")
        faiss.normalize_L2(vec)
        scores, indices = self.index.search(vec, top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx]
            results.append({
                "source": meta["source"],
                "text": meta["text"],
                "similarity": float(score)
            })
        return results

rag_engine = RagEngine()

async def run_autonomous_resolution_agent(df, communication_store, call_gemini):
    print("🤖 Autonomous Resolution Agent started in background loop...")
    while True:
        try:
            keywords = ["upi", "pending", "failed", "atm", "withdrawal", "balance"]
            
            mask = (df["is_duplicate"] == False) & (df["status"].isin(["Open", "In Progress"]))
            candidates = df[mask]
            
            for _, row in candidates.iterrows():
                cid = row["complaint_id"]
                text = str(row["complaint_text"]).lower()
                
                if any(kw in text for kw in keywords) and row["severity"] in ["Low", "Medium"]:
                    policies = rag_engine.search_policies(text, top_k=2)
                    policy_context = "\n".join([p["text"] for p in policies])
                    
                    prompt = f"""
                    You are an Autonomous Bank Agent. 
                    Complaint: {text}
                    Category: {row['category']}
                    
                    Policies:
                    {policy_context}
                    
                    Simulate a system check. Can this be auto-resolved? If it's a failed ATM or pending UPI, assume the system check confirms it's a known network glitch and the reversal will happen within T+1 day.
                    Respond in JSON:
                    {{
                      "auto_resolve": true,
                      "resolution_note": "Explain the resolution and regulatory timeline",
                      "audit_reasoning": "Explain why this was auto-resolved using policy citations"
                    }}
                    """
                    
                    response = call_gemini(prompt)
                    
                    if response.get("auto_resolve"):
                        df.loc[df["complaint_id"] == cid, "status"] = "Resolved"
                        df.loc[df["complaint_id"] == cid, "resolution_days"] = 1
                        df.loc[df["complaint_id"] == cid, "resolution_note"] = response["resolution_note"]
                        
                        if cid not in communication_store:
                            communication_store[cid] = []
                            
                        communication_store[cid].append({
                            "sender": "system",
                            "message": f"🤖 Autonomous Agent auto-resolved this ticket.\nReasoning: {response['audit_reasoning']}",
                            "channel": "AI Agent",
                            "timestamp": datetime.now().isoformat()
                        })
                        print(f"✅ Auto-resolved {cid}")
                        
        except Exception as e:
            print(f"⚠️ Autonomous Agent error: {e}")
            
        await asyncio.sleep(60)
