import json
import sys
from backend.app import assistant_query, AssistantQueryRequest

def test_query():
    req = AssistantQueryRequest(
        query="What is the SLA for an ATM dispute that resulted in account debit without cash dispensing?",
        complaint_id="1005"
    )
    print("Testing Assistant API...")
    res = assistant_query(req)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    test_query()
