"""
Test script for Gmail MCP Server
Tests API connectivity and MCP tools
"""

#Author: Biniam Gashaw
#Class: CS425: Software Engineering

import asyncio
import json
from main import get_gmail_service
import main

#shpould work regardless of user due to the oauth, however only agendaai is allowed as a test user.
async def test_gmail_connection():
    """Test Gmail API connection."""
    print("\n" + "="*60)
    print("TEST 1: Gmail API Connection")
    print("="*60)
    try:
        service = get_gmail_service()
        profile = service.users().getProfile(userId="me").execute()
        print(f" Connected to Gmail")
        print(f"   Email: {profile.get('emailAddress')}")
        print(f"   Total Messages: {profile.get('messagesTotal')}")
        return True
    except Exception as e:
        print(f" Connection failed: {e}")
        return False

async def test_list_tools():
    """Test that tools are registered correctly."""
    print("\n" + "="*60)
    print("TEST 2: List Available Tools")
    print("="*60)
    try:
        tools = await main.list_tools()
        tool_names = [t.name for t in tools]
        print(f" Found {len(tools)} tools:")
        for name in tool_names:
            print(f"   - {name}")
        
        assert "list_unread_emails" in tool_names
        assert "search_emails" in tool_names
        return True
    except Exception as e:
        print(f" Failed: {e}")
        return False

async def test_list_unread_emails():
    """Test list_unread_emails tool."""
    print("\n" + "="*60)
    print("TEST 3: List Unread Emails")
    print("="*60)
    try:
        result = await main.call_tool("list_unread_emails", {"max_results": 5})
        emails = json.loads(result[0].text)
        print(f" Retrieved {len(emails)} unread emails")
        
        if emails:
            print("\nFirst email:")
            print(f"   Subject: {emails[0].get('subject')}")
            print(f"   From: {emails[0].get('from')}")
            print(f"   Snippet: {emails[0].get('snippet', '')[:50]}...")
        else:
            print("   No unread emails found")
        return True
    except Exception as e:
        print(f" Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_search_emails():
    """Test search_emails tool."""
    print("\n" + "="*60)
    print("TEST 4: Search Emails")
    print("="*60)
    try:
        #Search for emails from the last week
        result = await main.call_tool("search_emails", {
            "query": "newer_than:7d",
            "max_results": 3
        })
        emails = json.loads(result[0].text)
        print(f" Found {len(emails)} emails from last 7 days")
        
        for i, email in enumerate(emails[:3], 1):
            print(f"\n   Email {i}:")
            print(f"   Subject: {email.get('subject')}")
            print(f"   From: {email.get('from')}")
            print(f"   Date: {email.get('date')}")
        return True
    except Exception as e:
        print(f" Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_unknown_tool():
    """Test error handling for unknown tools."""
    print("\n" + "="*60)
    print("TEST 5: Unknown Tool Handling")
    print("="*60)
    try:
        result = await main.call_tool("nonexistent_tool", {})
        assert "Unknown tool" in result[0].text
        print(" Unknown tool handled correctly")
        return True
    except Exception as e:
        print(f" Failed: {e}")
        return False

async def run_all_tests():
    """Run all tests sequentially."""
    print("\n" + "="*60)
    print("Gmail MCP Server Test Suite")
    print("="*60)
    
    results = []
    
    #Test 1: Connection
    results.append(await test_gmail_connection())
    
    #Test 2: List tools
    results.append(await test_list_tools())
    
    #Test 3: List unread emails
    results.append(await test_list_unread_emails())
    
    #Test 4: Search emails
    results.append(await test_search_emails())
    
    #Test 5: Unknown tool
    results.append(await test_unknown_tool())
    
    #Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n All tests passed!")
    else:
        print("\n Some tests failed")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(run_all_tests())
