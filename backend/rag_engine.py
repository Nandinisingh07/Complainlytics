import os
import faiss
import json
import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "nlp", "models")

class RAGEngine:
    def __init__(self):
        print("Loading RAG Engine...")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        index_path = os.path.join(MODEL_DIR, "policies_faiss.bin")
        meta_path = os.path.join(MODEL_DIR, "policies_meta.json")
        
        if not os.path.exists(index_path) or not os.path.exists(meta_path):
            print("Warning: RAG Index not found. Please run build_rag_index.py first.")
            self.index = None
            self.metadata = []
            return
            
        self.index = faiss.read_index(index_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
            
        print(f"Success: RAG Engine loaded with {len(self.metadata)} chunks.")

    def search_policies(self, query: str, top_k: int = 3):
        if self.index is None:
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

rag_engine = RAGEngine()
