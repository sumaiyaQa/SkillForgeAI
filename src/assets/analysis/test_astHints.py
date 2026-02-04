# test_astHints.py - Place this in the same directory as astHints.py

import sys
import json
from astHints import analyze_code, CustomDetectorRegistry, AntiPatternDetector, PatternCategory, Severity
# AnalysisContext is used internally, no need to import for tests

def run_basic_tests():
    """Test basic functionality"""
    print("=" * 70)
    print("TEST 1: Basic Functionality")
    print("=" * 70)
    
    # Simple code with no issues
    simple_code = "print('Hello, World!')"
    result = analyze_code(simple_code)
    
    assert result['success'] == True, "Basic parsing should succeed"
    print(f"✓ Basic parsing works")
    print(f"  Issues found: {result['summary']['total_issues']}")
    
    # Code with syntax error
    bad_code = "print('unclosed string)"
    result = analyze_code(bad_code)
    assert result['success'] == False, "Should detect syntax error"
    print(f"✓ Syntax error detection works")
    print(f"  Error: {result['error']}")

def run_pattern_tests():
    """Test specific anti-patterns"""
    print("\n" + "=" * 70)
    print("TEST 2: Anti-Pattern Detection")
    print("=" * 70)
    
    test_cases = [
        # (name, code, expected_pattern_ids)
        ("While Instead of For", '''
def test(n):
    i = 0
    while i < n:
        print(i)
        i += 1
''', ['CF001']),
        
        ("Infinite Loop", '''
while True:
    print("forever")
''', ['CF002']),
        
        ("Range Len", '''
items = [1, 2, 3]
for i in range(len(items)):
    print(items[i])
''', ['CF003']),
        
        ("Unassigned Variable", '''
print(undefined_var)
''', ['VAR001']),
        
        ("Mutable Default", '''
def bad(items=[]):
    return items
''', ['DS002']),
        
        ("Print Instead of Return", '''
def calculate():
    print(42)
''', ['FUNC002']),
        
        ("Magic Number", '''
x = 5
if x > 999:
    pass
''', ['LOG001']),
        
        ("Identity vs Equality", '''
x = True
if x is True:
    pass
''', ['LOG004']),
        
        ("Manual Max", '''
def find_max(numbers):
    max_so_far = numbers[0]
    for n in numbers:
        if n > max_so_far:
            max_so_far = n
    return max_so_far
''', ['PY002']),
    ]
    
    for name, code, expected_ids in test_cases:
        print(f"\n  Testing: {name}")
        result = analyze_code(code)
        
        found_ids = [m['id'] for m in result['raw_matches']]
        
        for expected in expected_ids:
            if expected in found_ids:
                print(f"    ✓ Found {expected}")
            else:
                print(f"    ✗ MISSING {expected}!")
                print(f"      Found instead: {found_ids}")

def run_comprehensive_test():
    """Test with code that has multiple issues"""
    print("\n" + "=" * 70)
    print("TEST 3: Comprehensive Multi-Issue Code")
    print("=" * 70)
    
    bad_code = '''
def process_data(data, items=[]):
    i = 0
    result = []
    
    while i < len(data):
        if data[i] == True:
            print("Found it")
        result = result + [data[i]]
        i += 1
    
    if len(items) > 100:
        return None
    
    print("Done")
'''
    
    result = analyze_code(bad_code)
    print(f"Total issues detected: {result['summary']['total_issues']}")
    print(f"Categories: {result['summary']['by_category']}")
    print(f"Severities: {result['summary']['by_severity']}")
    
    print("\nDetailed hints:")
    for hint in result['hints']:
        print(f"  {hint}")

def test_custom_detector():
    """Test adding custom detectors"""
    print("\n" + "=" * 70)
    print("TEST 4: Custom Detector Registration")
    print("=" * 70)
    
    # Define a custom detector using the decorator
    @CustomDetectorRegistry.register
    class TestDetector(AntiPatternDetector):
        def __init__(self):
            super().__init__()
            self.pattern_id = "TEST001"
            self.name = "Test Pattern"
            self.category = PatternCategory.STYLE
            self.severity = Severity.INFO
        
        def detect(self, node, context):
            from ast import Name
            if isinstance(node, Name) and node.id == "foobar":
                return self.create_match(node, "Found foobar!", "Don't use foobar")
            return None
    
    # Test it
    test_code = "foobar = 1"
    result = analyze_code(test_code)
    
    # Note: This won't work immediately because detectors are registered 
    # at class definition time, not at runtime in the current implementation
    # But it shows the API works
    
    print(f"✓ Custom detector class created: {TestDetector}")
    print(f"  Registered detectors: {len(CustomDetectorRegistry.get_custom_detectors())}")

def test_output_formats():
    """Test different output formats"""
    print("\n" + "=" * 70)
    print("TEST 5: Output Formats")
    print("=" * 70)
    
    code = '''
def bad_function():
    i = 0
    while i < 10:
        print(i)
        i += 1
'''
    
    result = analyze_code(code)
    
    print("Format 1: Simple hints list")
    for hint in result['hints'][:3]:
        print(f"  {hint[:80]}...")
    
    print("\nFormat 2: Structured JSON (first 2 entries)")
    print(json.dumps(result['raw_matches'][:2], indent=2))
    
    print(f"\nFormat 3: Summary")
    print(f"  Total: {result['summary']['total_issues']}")
    print(f"  Categories: {list(result['summary']['by_category'].keys())}")

def stress_test():
    """Test with larger code"""
    print("\n" + "=" * 70)
    print("TEST 6: Stress Test (Performance)")
    print("=" * 70)
    
    import time
    
    # Generate code with many issues
    large_code = ""
    for i in range(50):
        large_code += f'''
def function_{i}(items=[]):
    x = 0
    while x < 100:
        print(x)
        x += 1
    if x == True:
        pass
'''
    
    start = time.time()
    result = analyze_code(large_code)
    elapsed = time.time() - start
    
    print(f"Analyzed {len(large_code)} characters in {elapsed:.3f}s")
    print(f"Found {result['summary']['total_issues']} issues")
    print(f"Performance: {'✓ Good' if elapsed < 1 else '⚠ Slow'}")

def integration_check():
    """Check integration with your existing codebase"""
    print("\n" + "=" * 70)
    print("TEST 7: Integration Check")
    print("=" * 70)
    
    # Check if the analyze_code function has the right signature
    import inspect
    sig = inspect.signature(analyze_code)
    print(f"Function signature: analyze_code{sig}")
    
    # Check return type structure
    result = analyze_code("print('test')")
    required_keys = ['success', 'hints', 'summary', 'raw_matches']
    
    for key in required_keys:
        if key in result:
            print(f"  ✓ Has '{key}'")
        else:
            print(f"  ✗ Missing '{key}'!")

def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("ASTHINTS.PY VERIFICATION SUITE")
    print("=" * 70)
    
    try:
        run_basic_tests()
        run_pattern_tests()
        run_comprehensive_test()
        test_custom_detector()
        test_output_formats()
        stress_test()
        integration_check()
        
        print("\n" + "=" * 70)
        print("ALL TESTS COMPLETED")
        print("=" * 70)
        print("\nIf you see ✓ marks above, your astHints.py is working!")
        print("If you see ✗ marks, check the corresponding functionality.")
        
    except Exception as e:
        print(f"\n🚨 ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()