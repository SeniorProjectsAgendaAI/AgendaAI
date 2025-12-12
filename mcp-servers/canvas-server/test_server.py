"""
Comprehensive test script for Canvas MCP Server
Tests all 5 MCP tools defined in main.py
Disclaimer*" This test script is customized and tailored to Biniam Gashaw's classes, change the class names to test on your own

"""

#Author: Biniam Gashaw
#Class: CS425: Software Engineering

import asyncio
import json
from main import canvas, app

async def test_connection():
    """Test Canvas API connection."""
    print("\n" + "="*60)
    print("TEST 1: Canvas API Connection")
    print("="*60)
    try:
        user = canvas.get_current_user()
        print(f" Connected as: {user.name}")
        print(f"   User ID: {user.id}")
        print(f"   Email: {getattr(user, 'primary_email', 'N/A')}")
        return True
    except Exception as e:
        print(f" Connection failed: {e}")
        return False

async def test_get_courses():
    """Test get_courses MCP tool."""
    print("\n" + "="*60)
    print("TEST 2: get_courses Tool")
    print("="*60)
    try:
        #Call the tool directly
        from main import call_tool
        result = await call_tool("get_courses", {})
        
        courses_data = json.loads(result[0].text)
        print(f" Retrieved {len(courses_data)} courses")
        print("\nFirst 3 courses:")
        for course in courses_data[:3]:
            print(f"   - ID: {course['id']}")
            print(f"     Name: {course['name']}")
            print(f"     Code: {course['course_code']}")
        
        return courses_data[0]['id'] if courses_data else None
    except Exception as e:
        print(f" get_courses failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_get_assignments(course_id):
    """Test get_assignments MCP tool with real course data."""
    print("\n" + "="*60)
    print("TEST 3: get_assignments Tool")
    print("="*60)
    
    try:
        from main import call_tool
        
        #Get all courses to test real data
        result = await call_tool("get_courses", {})
        courses = json.loads(result[0].text)
        
        #Find courses with likely assignments
        target_courses = []
        for course in courses:
            if any(x in course['name'] or x in course['course_code'] 
                for x in ["CS 422", "CS 425", "CPE 400", "STAT 461"]):
                    target_courses.append((course['id'], course['name']))
        
        if not target_courses:
            print("  No target courses found")
            return False
        
        total_assignments = 0
        for cid, cname in target_courses[:2]:  #test first 2 courses
            result = await call_tool("get_assignments", {"course_id": str(cid)})
            assignments_data = json.loads(result[0].text)
            total_assignments += len(assignments_data)
            
            print(f"\n {cname}: {len(assignments_data)} assignments")
            if assignments_data:
                for assignment in assignments_data[:2]:  #show first 2
                    print(f"   - {assignment['title']}")
                    print(f"     Due: {assignment['due_at'] or 'No due date'}")
                    print(f"     Points: {assignment['points_possible']}")
        
        print(f"\n Total: Retrieved {total_assignments} assignments across courses")
        return True
    except Exception as e:
        print(f" get_assignments failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_get_upcoming_assignments():
    """Test get_upcoming_assignments MCP tool with multiple date ranges."""
    print("\n" + "="*60)
    print("TEST 4: get_upcoming_assignments Tool")
    print("="*60)
    try:
        from main import call_tool
        
        #Test with multiple date ranges to show real upcoming work
        for days in [7, 14, 30]:
            result = await call_tool("get_upcoming_assignments", {"days": days})
            upcoming_data = json.loads(result[0].text)
            
            print(f"\n Next {days} days: {len(upcoming_data)} assignments")
            
            if upcoming_data:
                #Show all assignments for this range
                for assignment in upcoming_data[:5]:  #Show up to 5
                    print(f"   - {assignment['assignment_name']}")
                    print(f"     Course: {assignment['course_name']}")
                    print(f"     Due: {assignment['due_at']}")
                    print(f"     Points: {assignment['points_possible']}")
        
        return True
    except Exception as e:
        print(f" get_upcoming_assignments failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_get_announcements(course_id):
    """Test get_announcements MCP tool with real course data."""
    print("\n" + "="*60)
    print("TEST 5: get_announcements Tool")
    print("="*60)
    
    try:
        from main import call_tool
        
        #Get courses and test announcements from real courses
        result = await call_tool("get_courses", {})
        courses = json.loads(result[0].text)
        
        target_courses = []
        for course in courses:
            if any(x in course['name'] or x in course['course_code'] 
                for x in ["CS 422", "CS 425", "CPE 400"]): #specific to the user biniam gashaw
                    target_courses.append((course['id'], course['name']))
        
        if not target_courses:
            print("  No target courses found")
            return False
        
        total_announcements = 0
        for cid, cname in target_courses[:2]:  #Test first 2 courses
            result = await call_tool("get_announcements", {
                "course_id": str(cid),
                "limit": 3
            })
            announcements_data = json.loads(result[0].text)
            total_announcements += len(announcements_data)
            
            print(f"\n {cname}: {len(announcements_data)} announcements")
            if announcements_data:
                for announcement in announcements_data[:2]:  #show first 2
                    print(f"   - {announcement['title']}")
                    print(f"     Posted: {announcement['posted_at']}")
        
        print(f"\n Total: Retrieved {total_announcements} announcements")
        return True
    except Exception as e:
        print(f" get_announcements failed: {e}")
        return False

async def test_get_grades(course_id):
    """Test get_grades MCP tool."""
    print("\n" + "="*60)
    print("TEST 6: get_grades Tool")
    print("="*60)
    if not course_id:
        print("  Skipped - no course ID available")
        return
    
    try:
        from main import call_tool
        result = await call_tool("get_grades", {"course_id": str(course_id)})
        
        grades_data = json.loads(result[0].text)
        print(f" Retrieved grades for course {course_id}")
        
        if grades_data:
            for grade in grades_data:
                print(f"\n   Course: {grade['course_name']}")
                print(f"   Current Score: {grade['current_score']}")
                print(f"   Current Grade: {grade['current_grade']}")
                print(f"   Final Score: {grade['final_score']}")
                print(f"   Final Grade: {grade['final_grade']}")
        else:
            print("   No grade information available")
        
        return True
    except Exception as e:
        print(f" get_grades failed: {e}")
        return False

async def test_list_tools():
    """Test list_tools MCP endpoint."""
    print("\n" + "="*60)
    print("TEST 7: MCP list_tools")
    print("="*60)
    try:
        from main import list_tools
        tools = await list_tools()
        
        print(f" MCP Server exposes {len(tools)} tools:")
        for tool in tools:
            print(f"\n   Tool: {tool.name}")
            print(f"   Description: {tool.description}")
            print(f"   Required params: {tool.inputSchema.get('required', [])}")
        
        return True
    except Exception as e:
        print(f" list_tools failed: {e}")
        return False

async def run_all_tests():
    """Run all tests sequentially."""
    print("\n" + "==" * 30)
    print("CANVAS MCP SERVER - COMPREHENSIVE TEST SUITE")
    print("==" * 30)
    
    results = {
        "connection": False,
        "get_courses": False,
        "get_assignments": False,
        "get_upcoming": False,
        "get_announcements": False,
        "get_grades": False,
        "list_tools": False
    }
    
    #Test 1: Connection
    results["connection"] = await test_connection()
    if not results["connection"]:
        print("\n Connection failed - aborting remaining tests")
        return results
    
    #Test 2: Get courses 
    course_id = await test_get_courses()
    results["get_courses"] = course_id is not None
    
    #Find courses with actual data for comprehensive testing
    test_courses = []
    if course_id:
        from main import call_tool
        result = await call_tool("get_courses", {})
        import json
        courses = json.loads(result[0].text)
        #Look for CS, CPE, STAT courses that likely have assignments/grades based from Biniam Gashaw
        for course in courses:
            if any(x in course['name'] or x in course['course_code'] 
                for x in ["CS 422", "CS 425", "CPE 400", "STAT 461", "CSE Senior", "Senior Projects"]):
                    test_courses.append(course['id'])
        
        if test_courses:
            course_id = test_courses[0]  #Use first found course
            print(f"\n   Found {len(test_courses)} courses with data for testing...")
            print(f"   Primary test course ID: {course_id}")
    
    #Test 3: Get assignments
    results["get_assignments"] = await test_get_assignments(course_id)
    
    #Test 4: Get upcoming assignments
    results["get_upcoming"] = await test_get_upcoming_assignments()
    
    #Test 5: Get announcements
    results["get_announcements"] = await test_get_announcements(course_id)
    
    #Test 6: Get grades - test all courses with data
    if test_courses:
        print("\n" + "="*60)
        print("BONUS: Testing grades across all relevant courses")
        print("="*60)
        for cid in test_courses[:5]:  #Test up to 5 courses
            results["get_grades"] = await test_get_grades(cid)
    else:
        results["get_grades"] = await test_get_grades(course_id)
    
    #Test 7: List tools
    results["list_tools"] = await test_list_tools()
    
    #Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = " PASS" if passed_test else " FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{passed}/{total} tests passed")
    print("="*60 + "\n")
    
    return results

if __name__ == "__main__":
    asyncio.run(run_all_tests())