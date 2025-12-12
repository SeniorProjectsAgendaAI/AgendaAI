"""
Test script for Google Calendar MCP Server
Tests API connectivity and MCP tools
"""

#Author: Biniam Gashaw
#Class: CS425: Software Engineering

import asyncio
import json
from datetime import datetime, timezone
from main import get_calendar_service
import main

#test is specific to the google calaender of Agendaai email but is interchangable due to ottu
async def test_calendar_connection():
    """Test Google Calendar API connection."""
    print("\n" + "="*60)
    print("TEST 1: Google Calendar API Connection")
    print("="*60)
    try:
        service = get_calendar_service()
        calendar = service.calendars().get(calendarId="primary").execute()
        print(f"Connected to Google Calendar")
        print(f"   Calendar: {calendar.get('summary')}")
        print(f"   Timezone: {calendar.get('timeZone')}")
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
        
        assert "list_upcoming_events" in tool_names
        assert "create_event" in tool_names
        return True
    except Exception as e:
        print(f" Failed: {e}")
        return False

async def test_list_upcoming_events():
    """Test list_upcoming_events tool."""
    print("\n" + "="*60)
    print("TEST 3: List Upcoming Events")
    print("="*60)
    try:
        result = await main.call_tool("list_upcoming_events", {"days_ahead": 7})
        events = json.loads(result[0].text)
        print(f" Retrieved {len(events)} upcoming events (next 7 days)")
        
        if events:
            print("\nUpcoming events:")
            for i, event in enumerate(events[:5], 1):
                start = event.get('start', {})
                start_time = start.get('dateTime', start.get('date', 'N/A'))
                print(f"\n   Event {i}:")
                print(f"   Summary: {event.get('summary')}")
                print(f"   Start: {start_time}")
                print(f"   Link: {event.get('htmlLink')}")
        else:
            print("   No upcoming events found")
        return True
    except Exception as e:
        print(f" Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_create_event():
    """Test create_event tool (creates a test event)."""
    print("\n" + "="*60)
    print("TEST 4: Create Event")
    print("="*60)
    try:
        #Creates a test event 2 hours from now
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        start_time = (now + timedelta(hours=2)).isoformat()
        end_time = (now + timedelta(hours=3)).isoformat()
        
        #Parameters for the test event
        result = await main.call_tool("create_event", {
            "summary": "MCP Test Event",
            "start_iso": start_time,
            "end_iso": end_time,
            "description": "This is a test event created by the MCP Calendar server test script"
        })
        
        event = json.loads(result[0].text)
        print(f" Event created successfully")
        print(f"   Event ID: {event.get('id')}")
        print(f"   Summary: {event.get('summary')}")
        print(f"   Link: {event.get('htmlLink')}")
        print("\n     Don't forget to delete this test event from your calendar!")
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
    print("Google Calendar MCP Server Test Suite")
    print("="*60)
    
    results = []
    
    #Test 1: Connection
    results.append(await test_calendar_connection())
    
    #Test 2: List tools
    results.append(await test_list_tools())
    
    #Test 3: List upcoming events
    results.append(await test_list_upcoming_events())
    
    #Test 4: Create event
    print("\n  Test 4 will create a test event in your calendar.")
    user_input = input("Run create event test? (y/n): ").lower()
    if user_input == 'y':
        results.append(await test_create_event())
    else:
        print("Skipping create event test")
        results.append(True)  # Count as passed
    
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
