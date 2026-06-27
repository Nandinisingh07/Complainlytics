import asyncio
import json
from datetime import datetime
from .rag_engine import rag_engine

async def run_autonomous_resolution_agent(df, communication_store, gemini_client, gemini_model="gemini-2.5-flash"):
    """
    Background worker that scans for Open complaints matching "low-risk" criteria,
    verifies resolution rules using RAG policies, and auto-resolves them.
    """
    print("🤖 Autonomous Resolution Agent started...")
    
    # Define "low-risk" categories
    low_risk_categories = ["Fund Transfer / NEFT / RTGS", "ATM / Debit Card"]

    while True:
        try:
            # Find open low-risk complaints
            open_low_risk = df[
                (df["is_duplicate"] == False) & 
                (df["status"] == "Open") & 
                (df["category"].isin(low_risk_categories)) &
                (df["severity"].isin(["Low", "Medium"]))
            ].copy().head(2) # Limit to 2 per run to prevent Gemini API quota exhaustion (HTTP 429)

            actions_taken = 0

            for idx, row in open_low_risk.iterrows():
                cid = row["complaint_id"]
                text = row["complaint_text"]
                
                # Check if it's already resolved in the mean time
                if df.at[idx, "status"] == "Resolved":
                    continue
                    
                # 1. Retrieve policy context
                policies = rag_engine.search_policies(text, top_k=2)
                context = "\n".join([f"- {p['source']}: {p['text']}" for p in policies])
                
                # 2. Ask Gemini to verify if it can be auto-resolved
                prompt = f"""
You are an autonomous AI agent for Union Bank of India.
Task: Determine if the following complaint can be auto-resolved based on standard policies.
Complaint: {text}
Category: {row['category']}

Relevant Policies:
{context}

Return a JSON object:
{{
  "can_auto_resolve": true/false,
  "reasoning": "Explain why based on policies",
  "resolution_message": "Message to customer if resolving, else empty"
}}
"""
                response = gemini_client.models.generate_content(
                    model=gemini_model,
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                
                result = json.loads(response.text)
                
                if result.get("can_auto_resolve"):
                    # Update status in dataframe
                    df.at[idx, "status"] = "Resolved"
                    
                    # Log to communication store
                    if cid not in communication_store:
                        communication_store[cid] = []
                        
                    communication_store[cid].append({
                        "sender": "system",
                        "message": f"🤖 Autonomous Agent auto-resolved this complaint. Reasoning: {result['reasoning']}",
                        "channel": "AI Agent",
                        "timestamp": datetime.now().isoformat(),
                        "type": "auto_resolution"
                    })
                    
                    actions_taken += 1
                    print(f"🤖 Auto-resolved {cid}")
                    
            if actions_taken > 0:
                print(f"✅ Autonomous Agent run complete — {actions_taken} actions taken")
                
        except Exception as e:
            print(f"⚠️ Autonomous Agent Error: {e}")
            
        # Run periodically (e.g., every 60 seconds)
        await asyncio.sleep(60)
