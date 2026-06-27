import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_knowledge_assistant():
    print("\n" + "="*50)
    print("🤖 1. TESTING AI KNOWLEDGE ASSISTANT")
    print("="*50)
    payload = {
        "query": "What is the SLA for an ATM dispute that resulted in account debit without cash dispensing?",
        "complaint_id": "CMP-1234"
    }
    print(f"Query: {payload['query']}")
    try:
        res = requests.post(f"{BASE_URL}/api/assistant/query", json=payload)
        res.raise_for_status()
        data = res.json()
        print("\n✅ SUCCESS!")
        print(f"Policies Retrieved: {data.get('policies_retrieved')}")
        answer = data.get('response', {}).get('answer', '')
        print(f"Answer Preview: {answer[:150]}...")
        print(f"Citations: {data.get('response', {}).get('citations')}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        if 'res' in locals():
            print(res.text)

def test_draft_response_rbi_agent():
    print("\n" + "="*50)
    print("📝 2. TESTING RBI AGENT (DRAFT RESPONSE & RAG)")
    print("="*50)
    payload = {
        "complaint_text": "I tried to transfer 50,000 INR via NEFT yesterday but it is still pending. The money left my account.",
        "customer_name": "Nandini Singh",
        "channel": "Web Portal"
    }
    print(f"Complaint: {payload['complaint_text']}")
    try:
        res = requests.post(f"{BASE_URL}/complaints/draft-response", json=payload)
        res.raise_for_status()
        data = res.json()
        print("\n✅ SUCCESS!")
        print(f"Root Cause (with citations): {data.get('root_cause')}")
        print(f"Regulatory Flag: {data.get('regulatory_flag')}")
        print(f"Regulatory Reason: {data.get('regulatory_reason')}")
        print(f"Draft Response: {data.get('draft_response')}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        if 'res' in locals():
            print(res.text)

def check_autonomous_agent():
    print("\n" + "="*50)
    print("🔄 3. CHECKING AUTONOMOUS RESOLUTION AGENT")
    print("="*50)
    try:
        res = requests.get(f"{BASE_URL}/complaints?limit=200")
        res.raise_for_status()
        complaints = res.json().get('complaints', [])
        
        auto_resolved_count = 0
        for c in complaints:
            if c['status'] == 'Resolved':
                # Check communications for this complaint
                comm_res = requests.get(f"{BASE_URL}/complaints/{c['complaint_id']}/communications")
                if comm_res.ok:
                    comms = comm_res.json().get('communications', [])
                    for msg in comms:
                        if msg.get('type') == 'auto_resolution' or 'Autonomous Agent auto-resolved' in msg.get('message', ''):
                            if auto_resolved_count == 0:
                                print(f"✅ Found auto-resolved complaint: {c['complaint_id']}")
                                print(f"Reasoning: {msg.get('message')}")
                            auto_resolved_count += 1
                            break
        
        if auto_resolved_count > 0:
            print(f"\n✅ Total auto-resolved complaints found: {auto_resolved_count}")
        else:
            print("\n⏳ No auto-resolved complaints found yet. The agent runs in the background every 60s processing up to 2 complaints per run. Wait a minute and run the test again.")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    print("Waiting 15 seconds to clear API rate limit...")
    time.sleep(15)
    test_knowledge_assistant()
    time.sleep(2) # Prevent rate limiting
    test_draft_response_rbi_agent()
    time.sleep(2)
    check_autonomous_agent()
    print("\n🎉 ALL TESTS COMPLETED!")
