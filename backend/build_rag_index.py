import os
import glob
import json
import faiss
import PyPDF2
import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POLICIES_DIR = os.path.join(BASE_DIR, "..", "data", "policies")
MODEL_DIR = os.path.join(BASE_DIR, "..", "nlp", "models")

def build_rag_index():
    print("🔄 Initializing RAG Index Builder...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    
    chunks = []
    metadata = []
    
    for filepath in glob.glob(os.path.join(POLICIES_DIR, "*")):
        if not (filepath.endswith(".txt") or filepath.endswith(".pdf")):
            continue
            
        filename = os.path.basename(filepath)
        content = ""
        
        if filepath.endswith(".txt"):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        elif filepath.endswith(".pdf"):
            try:
                reader = PyPDF2.PdfReader(filepath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
            except Exception as e:
                print(f"Error reading PDF {filename}: {e}")
                continue
                
        # Basic chunking by double newline (paragraphs)
        paragraphs = [p.strip() for p in content.split("\n\n") if len(p.strip()) > 20]
        for idx, p in enumerate(paragraphs):
            chunks.append(p)
            metadata.append({
                "source": filename,
                "chunk_id": f"{filename}_{idx}",
                "text": p
            })
            
    if not chunks:
        print("⚠️ No policy documents found!")
        return

    print(f"📝 Found {len(chunks)} policy chunks. Generating embeddings...")
    embeddings = embedder.encode(chunks, convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(embeddings)
    
    # Build FAISS index using Inner Product (cosine similarity since vectors are normalized)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    faiss.write_index(index, os.path.join(MODEL_DIR, "policies_faiss.bin"))
    
    with open(os.path.join(MODEL_DIR, "policies_meta.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"✅ RAG Index built successfully with {len(chunks)} vectors.")
    print(f"Saved to {MODEL_DIR}/policies_faiss.bin")

if __name__ == "__main__":
    build_rag_index()
