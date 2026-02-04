import ast
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Set, Optional, Callable, Any
from enum import Enum, auto
import re

class Severity(Enum):
    """Severity levels for anti-patterns"""
    INFO = auto()      # Suggestion, not necessarily wrong
    WARNING = auto()   # Likely suboptimal
    ERROR = auto()     # Probably incorrect or bad practice
    CRITICAL = auto()  # Definitely wrong or dangerous

class PatternCategory(Enum):
    """Categories for organizing anti-patterns"""
    CONTROL_FLOW = "Control Flow"
    DATA_STRUCTURES = "Data Structures"
    FUNCTIONS = "Functions"
    VARIABLES = "Variables"
    EFFICIENCY = "Efficiency"
    STYLE = "Style"
    LOGIC = "Logic"
    PYTHONIC = "Pythonic Code"

@dataclass
class AntiPatternMatch:
    """Result of detecting an anti-pattern"""
    pattern_id: str
    name: str
    category: PatternCategory
    severity: Severity
    message: str
    line_number: Optional[int]
    suggestion: Optional[str]
    code_snippet: Optional[str]

class AntiPatternDetector(ABC):
    """Base class for all anti-pattern detectors"""
    
    def __init__(self):
        self.pattern_id: str = ""
        self.name: str = ""
        self.category: PatternCategory = PatternCategory.STYLE
        self.severity: Severity = Severity.WARNING
        self.description: str = ""
    
    @abstractmethod
    def detect(self, node: ast.AST, context: 'AnalysisContext') -> Optional[AntiPatternMatch]:
        """Detect the anti-pattern in the given AST node"""
        pass
    
    def create_match(self, node: ast.AST, message: str, 
                     suggestion: Optional[str] = None) -> AntiPatternMatch:
        """Helper to create a match result"""
        return AntiPatternMatch(
            pattern_id=self.pattern_id,
            name=self.name,
            category=self.category,
            severity=self.severity,
            message=message,
            line_number=getattr(node, 'lineno', None),
            suggestion=suggestion,
            code_snippet=None  # Could extract from source
        )

class AnalysisContext:
    """Context maintained during AST traversal"""
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.lines = source_code.split('\n')
        self.assigned_vars: Set[str] = set()
        self.used_vars: Set[str] = set()
        self.function_defs: Dict[str, ast.FunctionDef] = {}
        self.loop_depth = 0
        self.current_function: Optional[str] = None
        self.imports: Set[str] = set()
        self.has_break: bool = False
        self.has_return: bool = False
        self.loop_vars: Set[str] = set()
        self.mutated_vars: Set[str] = set()
        self.condition_count = 0

# ============================================
# CONTROL FLOW ANTI-PATTERNS
# ============================================

class WhileInsteadOfForDetector(AntiPatternDetector):
    """Detect using while loop when for loop is more appropriate"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF001"
        self.name = "While Instead Of For"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.WARNING
        self.description = "Using while loop with manual counter instead of for-range"
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.While):
            return None
        
        # Check for patterns like: i = 0; while i < n: ... i += 1
        body = node.body
        if len(body) < 2:
            return None
        
        # Look for increment pattern at end of body
        last_stmt = body[-1]
        if isinstance(last_stmt, ast.AugAssign):
            if isinstance(last_stmt.op, ast.Add) and isinstance(last_stmt.value, ast.Constant):
                if last_stmt.value.value == 1:
                    return self.create_match(
                        node,
                        "This while loop with manual increment could be simplified to a 'for' loop",
                        "Consider: for i in range(n):"
                    )
        
        # Check for simple condition like i < n
        if isinstance(node.test, ast.Compare):
            if isinstance(node.test.ops[0], (ast.Lt, ast.LtE, ast.Gt, ast.GtE)):
                return self.create_match(
                    node,
                    "While loop with range comparison - use 'for i in range(...)' instead",
                    "For loops are more Pythonic and less error-prone for iteration"
                )
        return None

class InfiniteLoopDetector(AntiPatternDetector):
    """Detect potentially infinite loops"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF002"
        self.name = "Infinite Loop"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.CRITICAL
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.While):
            return None
        
        # Check for while True without break
        if isinstance(node.test, ast.Constant) and node.test.value is True:
            has_break = any(isinstance(n, ast.Break) for n in ast.walk(node))
            has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
            
            if not has_break and not has_return:
                return self.create_match(
                    node,
                    "This 'while True' loop has no exit condition (no break or return)",
                    "Add a break statement or use a proper condition"
                )
        return None

class RangeLenDetector(AntiPatternDetector):
    """Detect range(len(x)) instead of enumerate or direct iteration"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF003"
        self.name = "Range Len Anti-Pattern"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Call):
            return None
        
        if isinstance(node.func, ast.Name) and node.func.id == 'range':
            if len(node.args) == 1:
                arg = node.args[0]
                if isinstance(arg, ast.Call):
                    if isinstance(arg.func, ast.Name) and arg.func.id == 'len':
                        return self.create_match(
                            node,
                            "Using range(len(x)) - consider 'enumerate()' or direct iteration",
                            "Use 'for i, item in enumerate(seq):' or 'for item in seq:'"
                        )
        return None

class NestedLoopBreakDetector(AntiPatternDetector):
    """Detect break statements that might not exit all loops as intended"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF004"
        self.name = "Ambiguous Nested Loop Break"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Break):
            return None
        
        if context.loop_depth > 1:
            return self.create_match(
                node,
                f"Break only exits the innermost loop (depth {context.loop_depth})",
                "Use a flag variable or function return if you need to exit all loops"
            )
        return None

class RedundantElseAfterReturn(AntiPatternDetector):
    """Detect else blocks after a return in if statement"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF005"
        self.name = "Redundant Else After Return"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.If):
            return None
        
        # Check if body ends with return
        if node.body and isinstance(node.body[-1], ast.Return):
            if node.orelse:  # Has else clause
                return self.create_match(
                    node,
                    "Else clause is redundant after a return statement",
                    "The else can be removed - code after if will execute anyway"
                )
        return None

class BooleanComparisonDetector(AntiPatternDetector):
    """Detect comparing booleans to True/False"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF006"
        self.name = "Explicit Boolean Comparison"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Compare):
            return None
        
        # Check for x == True or x == False
        if len(node.ops) == 1 and isinstance(node.ops[0], ast.Eq):
            if isinstance(node.comparators[0], ast.Constant):
                if node.comparators[0].value in (True, False):
                    bool_val = node.comparators[0].value
                    return self.create_match(
                        node,
                        f"Comparing to {bool_val} is redundant",
                        f"Use 'if x:' or 'if not x:' instead of 'if x == {bool_val}:'"
                    )
        return None

# ============================================
# VARIABLE ANTI-PATTERNS
# ============================================

class UnassignedVariableDetector(AntiPatternDetector):
    """Detect variables used before assignment"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "VAR001"
        self.name = "Unassigned Variable"
        self.category = PatternCategory.VARIABLES
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Name):
            return None
        
        if isinstance(node.ctx, ast.Load):
            if node.id not in context.assigned_vars and node.id not in dir(__builtins__):
                if not node.id.startswith('__'):
                    return self.create_match(
                        node,
                        f"Variable '{node.id}' may be used before assignment",
                        f"Initialize '{node.id}' before using it"
                    )
        return None

class UnusedVariableDetector(AntiPatternDetector):
    """Detect variables that are assigned but never used"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "VAR002"
        self.name = "Unused Variable"
        self.category = PatternCategory.VARIABLES
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Name):
            return None
        
        if isinstance(node.ctx, ast.Store):
            # Check if used anywhere
            if node.id not in context.used_vars and not node.id.startswith('_'):
                return self.create_match(
                    node,
                    f"Variable '{node.id}' is assigned but never used",
                    "Remove unused variable or use it, or prefix with _ if intentional"
                )
        return None

class VariableShadowingDetector(AntiPatternDetector):
    """Detect variables shadowing built-ins or outer scope"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "VAR003"
        self.name = "Variable Shadowing"
        self.category = PatternCategory.VARIABLES
        self.severity = Severity.WARNING
        self.builtins = {'list', 'dict', 'set', 'str', 'int', 'sum', 'max', 'min', 'id', 'type'}
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Name):
            return None
        
        if isinstance(node.ctx, ast.Store):
            if node.id in self.builtins:
                return self.create_match(
                    node,
                    f"Variable '{node.id}' shadows a built-in function",
                    f"Choose a different name to avoid confusion with built-in '{node.id}'"
                )
        return None

class LoopVariableLeakDetector(AntiPatternDetector):
    """Detect loop variables that leak into outer scope"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "VAR004"
        self.name = "Loop Variable Leak"
        self.category = PatternCategory.VARIABLES
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Check if loop variable is used after loop
        if isinstance(node.target, ast.Name):
            var_name = node.target.id
            # This requires full context analysis, simplified here
            return self.create_match(
                node,
                f"Loop variable '{var_name}' exists after loop ends",
                "Use list comprehension or walrus operator (:=) to avoid leakage"
            )
        return None

# ============================================
# DATA STRUCTURE ANTI-PATTERNS
# ============================================

class ListConcatInLoopDetector(AntiPatternDetector):
    """Detect building lists with concatenation in loops (O(n²))"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "DS001"
        self.name = "List Concatenation In Loop"
        self.category = PatternCategory.DATA_STRUCTURES
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For) and not isinstance(node, ast.While):
            return None
        
        for child in ast.walk(node):
            if isinstance(child, ast.AugAssign):
                if isinstance(child.op, ast.Add):
                    if isinstance(child.target, ast.Name):
                        return self.create_match(
                            node,
                            "Building list with += in loop is O(n²) - inefficient",
                            "Use list.append() or list comprehension instead"
                        )
        return None

class MutableDefaultArgumentDetector(AntiPatternDetector):
    """Detect mutable default arguments in functions"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "DS002"
        self.name = "Mutable Default Argument"
        self.category = PatternCategory.DATA_STRUCTURES
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        
        for default in node.args.defaults + node.args.kw_defaults:
            if default is None:
                continue
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                type_name = type(default).__name__.lower().replace('ast.', '')
                return self.create_match(
                    node,
                    f"Mutable {type_name} used as default argument - dangerous!",
                    "Use None as default and initialize inside function"
                )
        return None

class StringConcatInLoopDetector(AntiPatternDetector):
    """Detect building strings with + in loops"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "DS003"
        self.name = "String Concatenation In Loop"
        self.category = PatternCategory.DATA_STRUCTURES
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For) and not isinstance(node, ast.While):
            return None
        
        for child in ast.walk(node):
            if isinstance(child, ast.AugAssign):
                if isinstance(child.op, ast.Add):
                    # Check if target is a string variable
                    return self.create_match(
                        node,
                        "Building strings with += in loop is inefficient",
                        "Use str.join() or io.StringIO instead"
                    )
        return None

# ============================================
# FUNCTION ANTI-PATTERNS
# ============================================

class MissingReturnDetector(AntiPatternDetector):
    """Detect functions that might be missing a return statement"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "FUNC001"
        self.name = "Missing Return Statement"
        self.category = PatternCategory.FUNCTIONS
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        
        # Skip if function name suggests side effects
        if node.name.startswith(('set_', 'update_', 'print_', 'draw_')):
            return None
        
        has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
        if not has_return and node.body:
            # Check if last statement is expression (print statement)
            if isinstance(node.body[-1], ast.Expr):
                return self.create_match(
                    node,
                    f"Function '{node.name}' may be missing a return statement",
                    "Did you mean to return a value instead of printing it?"
                )
        return None

class PrintInsteadOfReturnDetector(AntiPatternDetector):
    """Detect print statements where return should be used"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "FUNC002"
        self.name = "Print Instead Of Return"
        self.category = PatternCategory.FUNCTIONS
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        
        has_print = False
        has_return = False
        
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name) and child.func.id == 'print':
                    has_print = True
            if isinstance(child, ast.Return):
                has_return = True
        
        if has_print and not has_return:
            return self.create_match(
                node,
                f"Function '{node.name}' prints but doesn't return - testing will fail",
                "Return the value instead of printing it"
            )
        return None

class TooManyParametersDetector(AntiPatternDetector):
    """Detect functions with too many parameters"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "FUNC003"
        self.name = "Too Many Parameters"
        self.category = PatternCategory.FUNCTIONS
        self.severity = Severity.INFO
        self.max_params = 5
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        
        param_count = len(node.args.args) + len(node.args.kwonlyargs)
        if param_count > self.max_params:
            return self.create_match(
                node,
                f"Function '{node.name}' has {param_count} parameters (too many)",
                "Consider using a class or data structure to group parameters"
            )
        return None

# ============================================
# LOGIC ANTI-PATTERNS
# ============================================

class HardcodedValuesDetector(AntiPatternDetector):
    """Detect hardcoded values that should be parameters/constants"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG001"
        self.name = "Hardcoded Magic Numbers"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.WARNING
        self.magic_numbers = {0, 1, 2}  # These are usually OK
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Constant):
            return None
        
        if isinstance(node.value, (int, float)):
            if node.value not in self.magic_numbers and abs(node.value) > 10:
                # Check context - is it in a comparison or calculation?
                parent = getattr(node, 'parent', None)
                if isinstance(parent, (ast.BinOp, ast.Compare, ast.Call)):
                    return self.create_match(
                        node,
                        f"Magic number {node.value} detected - consider making it a constant",
                        f"Define a constant: MAX_SIZE = {node.value}"
                    )
        return None

class UnreachableCodeDetector(AntiPatternDetector):
    """Detect code after return/break/continue"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG002"
        self.name = "Unreachable Code"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, (ast.FunctionDef, ast.If, ast.For, ast.While)):
            return None
        
        body = getattr(node, 'body', [])
        for i, stmt in enumerate(body):
            if isinstance(stmt, (ast.Return, ast.Break, ast.Continue, ast.Raise)):
                if i < len(body) - 1:
                    return self.create_match(
                        body[i + 1],
                        "Unreachable code after return/break/continue",
                        "Remove the unreachable code or fix the control flow"
                    )
        return None

class DuplicateConditionDetector(AntiPatternDetector):
    """Detect duplicate or overlapping conditions"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG003"
        self.name = "Duplicate Condition"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.If):
            return None
        
        # Check for if/elif with same condition
        conditions = []
        current = node
        
        while current:
            conditions.append(ast.dump(current.test))
            if current.orelse and len(current.orelse) == 1 and isinstance(current.orelse[0], ast.If):
                current = current.orelse[0]
            else:
                break
        
        if len(conditions) != len(set(conditions)):
            return self.create_match(
                node,
                "Duplicate condition detected in if/elif chain",
                "Remove the duplicate condition or fix the logic"
            )
        return None

class IdentityVsEqualityDetector(AntiPatternDetector):
    """Detect using 'is' for equality comparison"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG004"
        self.name = "Identity Instead Of Equality"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Compare):
            return None
        
        for i, op in enumerate(node.ops):
            if isinstance(op, ast.Is):
                # Check if comparing to a literal (not None)
                # The comparator is in node.comparators[i]
                if i < len(node.comparators):
                    comparator = node.comparators[i]
                    if isinstance(comparator, ast.Constant):
                        if comparator.value is not None and comparator.value is not ...:
                            return self.create_match(
                                node,
                                f"Using 'is' for literal comparison - use '==' instead",
                                f"'is' checks identity, '==' checks equality. Use '== {comparator.value}'"
                            )
                    # Also check left side if it's a constant
                    if isinstance(node.left, ast.Constant):
                        if node.left.value is not None and node.left.value is not ...:
                            return self.create_match(
                                node,
                                f"Using 'is' for literal comparison - use '==' instead",
                                f"'is' checks identity, '==' checks equality"
                            )
        return None

class ChainedComparisonDetector(AntiPatternDetector):
    """Detect verbose comparisons that could be chained"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG005"
        self.name = "Non-Chained Comparison"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.BoolOp):
            return None
        
        if isinstance(node.op, ast.And):
            # Check for patterns like: a < b and b < c
            values = node.values
            if len(values) == 2:
                left, right = values
                if (isinstance(left, ast.Compare) and isinstance(right, ast.Compare)):
                    # Simplified check - real implementation would be more thorough
                    return self.create_match(
                        node,
                        "Separate comparisons can be chained: 'a < b < c'",
                        "Use chained comparison for clarity"
                    )
        return None

# ============================================
# EFFICIENCY ANTI-PATTERNS
# ============================================

class RepeatedFunctionCallDetector(AntiPatternDetector):
    """Detect repeated expensive function calls"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "EFF001"
        self.name = "Repeated Function Call"
        self.category = PatternCategory.EFFICIENCY
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Look for function calls in loop that don't depend on loop var
        loop_vars = set()
        if isinstance(node.target, ast.Name):
            loop_vars.add(node.target.id)
        
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                # Check if call arguments involve loop variable
                args_vars = {n.id for n in ast.walk(child) if isinstance(n, ast.Name)}
                if not args_vars & loop_vars:
                    return self.create_match(
                        node,
                        "Function call in loop doesn't use loop variable - could be hoisted",
                        "Calculate before the loop to avoid repeated calls"
                    )
        return None

class ListCopyInLoopDetector(AntiPatternDetector):
    """Detect copying lists in loops unnecessarily"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "EFF002"
        self.name = "List Copy In Loop"
        self.category = PatternCategory.EFFICIENCY
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, (ast.For, ast.While)):
            return None
        
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Attribute):
                    if child.func.attr in ('copy', 'tolist'):
                        return self.create_match(
                            node,
                            "Creating copy of data structure inside loop",
                            "Create the copy once before the loop if possible"
                        )
        return None

class MembershipCheckOnList(AntiPatternDetector):
    """Detect 'in' operator on lists where set would be better"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "EFF003"
        self.name = "List Membership Check"
        self.category = PatternCategory.EFFICIENCY
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Compare):
            return None
        
        for op in node.ops:
            if isinstance(op, ast.In):
                # Check if checking against a list literal or variable
                comparator = node.comparators[0]
                if isinstance(comparator, ast.List):
                    if len(comparator.elts) > 3:  # Arbitrary threshold
                        return self.create_match(
                            node,
                            "Membership check on list is O(n) - consider using a set",
                            "Use a set for O(1) lookup: if x in {a, b, c}:"
                        )
        return None

# ============================================
# PYTHONIC ANTI-PATTERNS
# ============================================

class ManualLoopCounterDetector(AntiPatternDetector):
    """Detect manual counter variables instead of enumerate"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY001"
        self.name = "Manual Loop Counter"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Check if there's a counter being incremented
        for child in ast.walk(node):
            if isinstance(child, ast.AugAssign):
                if isinstance(child.op, ast.Add):
                    if isinstance(child.target, ast.Name):
                        if child.target.id in context.loop_vars:
                            return self.create_match(
                                node,
                                "Manual counter variable detected",
                                "Use enumerate(): for i, item in enumerate(items):"
                            )
        return None

class ManualMaxMinDetector(AntiPatternDetector):
    """Detect manual max/min finding instead of built-in"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY002"
        self.name = "Manual Max/Min"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Look for max/min tracking patterns
        body_str = ast.dump(node)
        if ('max_so_far' in body_str or 'min_so_far' in body_str or 
            'current_max' in body_str or 'current_min' in body_str):
            return self.create_match(
                node,
                "Manual max/min tracking - use built-in max()/min() instead",
                "max_value = max(iterable) or max(a, b) for two values"
            )
        return None

class ListAppendLoopDetector(AntiPatternDetector):
    """Detect loops that build lists which could be comprehensions"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY003"
        self.name = "List Build Loop"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Check if loop body is just appending to a list
        if len(node.body) == 1:
            stmt = node.body[0]
            if isinstance(stmt, ast.Expr):
                if isinstance(stmt.value, ast.Call):
                    if isinstance(stmt.value.func, ast.Attribute):
                        if stmt.value.func.attr == 'append':
                            return self.create_match(
                                node,
                                "Simple loop building list - could be list comprehension",
                                "Use: [f(x) for x in items] for cleaner code"
                            )
        return None

class NotUsingWithStatementDetector(AntiPatternDetector):
    """Detect file operations without with statement"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY004"
        self.name = "Missing Context Manager"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.WARNING
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Call):
            return None
        
        if isinstance(node.func, ast.Name) and node.func.id == 'open':
            # Check if parent is with statement
            parent = getattr(node, 'parent', None)
            if not isinstance(parent, ast.withitem):
                return self.create_match(
                    node,
                    "File opened without 'with' statement - resource leak risk",
                    "Use 'with open(...) as f:' to ensure proper cleanup"
                )
        return None

class TryExceptPassDetector(AntiPatternDetector):
    """Detect bare except clauses or except: pass"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY005"
        self.name = "Bare Except Or Pass"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Try):
            return None
        
        for handler in node.handlers:
            if handler.type is None:
                if len(handler.body) == 1 and isinstance(handler.body[0], ast.Pass):
                    return self.create_match(
                        node,
                        "Bare 'except: pass' swallows all errors - dangerous!",
                        "Specify exception type and handle properly or remove try/except"
                    )
                return self.create_match(
                    node,
                    "Bare 'except:' catches everything including KeyboardInterrupt",
                    "Use 'except SpecificException:' instead"
                )
        return None

class NotUsingZipDetector(AntiPatternDetector):
    """Detect parallel iteration with index instead of zip"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY006"
        self.name = "Index-Based Parallel Iteration"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Look for indexing multiple lists with same index
        indices = []
        for child in ast.walk(node):
            if isinstance(child, ast.Subscript):
                if isinstance(child.slice, ast.Name):
                    indices.append(child.slice.id)
        
        if len(set(indices)) == 1 and len(indices) > 1:
            return self.create_match(
                node,
                "Parallel iteration using indices - use zip() instead",
                "Use: for a, b in zip(list1, list2):"
            )
        return None

class NotUsingAnyAllDetector(AntiPatternDetector):
    """Detect loops that could be replaced with any()/all()"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY007"
        self.name = "Manual Any/All"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
        
        # Look for flag patterns
        body_str = ast.dump(node)
        if 'found' in body_str or 'flag' in body_str:
            if any(isinstance(n, ast.Break) for n in ast.walk(node)):
                return self.create_match(
                    node,
                    "Search loop could use any() or all()",
                    "Use: if any(condition for x in items):"
                )
        return None

# ============================================
# STYLE ANTI-PATTERNS
# ============================================

class UnnecessaryParenthesesDetector(AntiPatternDetector):
    """Detect unnecessary parentheses in conditions"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "STYLE001"
        self.name = "Unnecessary Parentheses"
        self.category = PatternCategory.STYLE
        self.severity = Severity.INFO
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        # This would require source code analysis beyond AST
        # Placeholder for the concept
        return None

class InconsistentNamingDetector(AntiPatternDetector):
    """Detect inconsistent naming conventions"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "STYLE002"
        self.name = "Inconsistent Naming"
        self.category = PatternCategory.STYLE
        self.severity = Severity.INFO
        self.snake_case = re.compile(r'^[a-z_][a-z0-9_]*$')
        self.camel_case = re.compile(r'^[a-z][a-zA-Z0-9]*$')
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Name):
            return None
        
        name = node.id
        if isinstance(node.ctx, ast.Store):
            # Check if mixing snake_case and camelCase
            if self.camel_case.match(name) and len(name) > 3:
                return self.create_match(
                    node,
                    f"Variable '{name}' uses camelCase - Python uses snake_case",
                    f"Consider renaming to: {re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()}"
                )
        return None

class TooDeepNestingDetector(AntiPatternDetector):
    """Detect excessive nesting depth"""
    
    def __init__(self):
        super().__init__()
        self.pattern_id = "STYLE003"
        self.name = "Deep Nesting"
        self.category = PatternCategory.STYLE
        self.severity = Severity.WARNING
        self.max_depth = 4
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        # Calculate nesting depth
        depth = 0
        current = node
        while current:
            if isinstance(current, (ast.If, ast.For, ast.While, ast.With, ast.Try)):
                depth += 1
            current = getattr(current, 'parent', None)
        
        if depth > self.max_depth:
            return self.create_match(
                node,
                f"Code is nested {depth} levels deep (hard to read)",
                "Extract inner logic into separate functions"
            )
        return None

# ============================================
# MAIN ANALYZER
# ============================================

class HintCollector(ast.NodeVisitor):
    """Enhanced hint collector with comprehensive anti-pattern detection"""
    
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.context = AnalysisContext(source_code)
        self.detectors: List[AntiPatternDetector] = []
        self.matches: List[AntiPatternMatch] = []
        
        # Initialize all detectors
        self._init_detectors_list()
    
    def _init_detectors_list(self):
        """Add all detectors to the list"""
        
        # Control Flow
        self.detectors.extend([
            WhileInsteadOfForDetector(),
            InfiniteLoopDetector(),
            RangeLenDetector(),
            NestedLoopBreakDetector(),
            RedundantElseAfterReturn(),
            BooleanComparisonDetector(),
        ])
        
        # Variables
        self.detectors.extend([
            UnassignedVariableDetector(),
            UnusedVariableDetector(),
            VariableShadowingDetector(),
            LoopVariableLeakDetector(),
        ])
        
        # Data Structures
        self.detectors.extend([
            ListConcatInLoopDetector(),
            MutableDefaultArgumentDetector(),
            StringConcatInLoopDetector(),
        ])
        
        # Functions
        self.detectors.extend([
            MissingReturnDetector(),
            PrintInsteadOfReturnDetector(),
            TooManyParametersDetector(),
        ])
        
        # Logic
        self.detectors.extend([
            HardcodedValuesDetector(),
            UnreachableCodeDetector(),
            DuplicateConditionDetector(),
            IdentityVsEqualityDetector(),
            ChainedComparisonDetector(),
        ])
        
        # Efficiency
        self.detectors.extend([
            RepeatedFunctionCallDetector(),
            ListCopyInLoopDetector(),
            MembershipCheckOnList(),
        ])
        
        # Pythonic
        self.detectors.extend([
            ManualLoopCounterDetector(),
            ManualMaxMinDetector(),
            ListAppendLoopDetector(),
            NotUsingWithStatementDetector(),
            TryExceptPassDetector(),
            NotUsingZipDetector(),
            NotUsingAnyAllDetector(),
        ])
        
        # Style
        self.detectors.extend([
            UnnecessaryParenthesesDetector(),
            InconsistentNamingDetector(),
            TooDeepNestingDetector(),
        ])
    
    def _set_parents(self, node: ast.AST, parent: Optional[ast.AST] = None):
        """Set parent references for all nodes"""
        node.parent = parent  # type: ignore
        for child in ast.iter_child_nodes(node):
            self._set_parents(child, node)
    
    def visit(self, node: ast.AST):
        """Visit a node and run all detectors"""
        # Track context
        self._update_context_enter(node)
        
        # Run all detectors on this node
        for detector in self.detectors:
            match = detector.detect(node, self.context)
            if match:
                self.matches.append(match)
        
        # Continue traversal
        self.generic_visit(node)
        
        # Update context on exit
        self._update_context_exit(node)
    
    def _update_context_enter(self, node: ast.AST):
        """Update context when entering a node"""
        if isinstance(node, ast.FunctionDef):
            self.context.current_function = node.name
            self.context.function_defs[node.name] = node
        
        elif isinstance(node, (ast.For, ast.While)):
            self.context.loop_depth += 1
            if isinstance(node, ast.For) and isinstance(node.target, ast.Name):
                self.context.loop_vars.add(node.target.id)
        
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    self.context.assigned_vars.add(target.id)
        
        elif isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Load):
                self.context.used_vars.add(node.id)
    
    def _update_context_exit(self, node: ast.AST):
        """Update context when exiting a node"""
        if isinstance(node, (ast.For, ast.While)):
            self.context.loop_depth -= 1
        
        elif isinstance(node, ast.FunctionDef):
            self.context.current_function = None
    
    def get_hints(self) -> List[str]:
        """Convert matches to hint strings"""
        hints = []
        for match in self.matches:
            severity_icon = {
                Severity.INFO: "💡",
                Severity.WARNING: "⚠️",
                Severity.ERROR: "❌",
                Severity.CRITICAL: "🚨"
            }.get(match.severity, "💡")
            
            hint = f"{severity_icon} [{match.pattern_id}] {match.message}"
            if match.suggestion:
                hint += f"\n   → {match.suggestion}"
            if match.line_number:
                hint += f" (line {match.line_number})"
            hints.append(hint)
        
        return hints
    
    def get_structured_results(self) -> List[AntiPatternMatch]:
        """Get full structured results"""
        return self.matches
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        by_category = {}
        by_severity = {}
        
        for match in self.matches:
            cat = match.category.value
            sev = match.severity.name
            by_category[cat] = by_category.get(cat, 0) + 1
            by_severity[sev] = by_severity.get(sev, 0) + 1
        
        return {
            "total_issues": len(self.matches),
            "by_category": by_category,
            "by_severity": by_severity,
            "unique_patterns": len(set(m.pattern_id for m in self.matches))
        }


def analyze_code(source_code: str) -> Dict[str, Any]:
    """
    Main entry point for code analysis.
    
    Returns:
        Dictionary with hints, structured results, and summary
    """
    try:
        tree = ast.parse(source_code)
        collector = HintCollector(source_code)
        collector._set_parents(tree)
        collector.visit(tree)
        
        # Get summary from collector
        summary = collector.get_summary()
        
        return {
            "success": True,
            "hints": collector.get_hints(),
            "structured": collector.get_structured_results(),
            "summary": {
                "total_issues": summary["total_issues"],
                # Convert Enum counts to string keys for JS safety
                "by_severity": summary["by_severity"],
                "by_category": summary["by_category"]
            },
            "raw_matches": [
                {
                    "id": m.pattern_id,
                    "name": m.name,
                    "category": m.category.value,
                    "severity": m.severity.name,
                    "message": m.message,
                    "line": m.line_number,
                    "suggestion": m.suggestion
                }
                for m in collector.matches
            ]
        }
        
    except SyntaxError as e:
        return {
            "success": False,
            "error": f"Syntax error: {e.msg} at line {e.lineno}",
            "hints": [f"🚨 Syntax error: {e.msg} (line {e.lineno})"],
            "structured": [],
            "summary": {}
        }


# ============================================
# CUSTOM DETECTOR REGISTRY
# ============================================

class CustomDetectorRegistry:
    """Registry for adding custom detectors at runtime"""
    
    _custom_detectors: List[type] = []
    
    @classmethod
    def register(cls, detector_class: type):
        """Register a new detector class"""
        if not issubclass(detector_class, AntiPatternDetector):
            raise ValueError("Detector must inherit from AntiPatternDetector")
        cls._custom_detectors.append(detector_class)
        return detector_class
    
    @classmethod
    def get_custom_detectors(cls) -> List[type]:
        """Get all registered custom detectors"""
        return cls._custom_detectors.copy()


# Decorator for easy registration
def register_detector(cls):
    """Decorator to register a custom detector"""
    return CustomDetectorRegistry.register(cls)


# ============================================
# EXAMPLE USAGE & EXTENSION TEMPLATE
# ============================================

if __name__ == "__main__":
    # Example: Adding your own custom detector
    @register_detector
    class MyCustomDetector(AntiPatternDetector):
        """Template for your own anti-pattern"""
        
        def __init__(self):
            super().__init__()
            self.pattern_id = "CUST001"
            self.name = "My Custom Pattern"
            self.category = PatternCategory.LOGIC
            self.severity = Severity.WARNING
        
        def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
            # Your detection logic here
            return None
    
    # Test code with various anti-patterns
    test_code = '''
def example(n):
    i = 0
    result = []
    while i < n:  # CF001: Should be for loop
        if i == True:  # CF006: Comparing to True
            pass
        result = result + [i]  # DS001: O(n²) list concat
        i += 1
    
    # Hardcoded values
    if n > 1000:  # LOG001: Magic number
        return None
    
    print("Done")  # FUNC002: Print instead of return
    return

def bad_function(a, b, c, d, e, f, g):  # FUNC003: Too many params
    x = 5
    if x == 5:
        return True
    else:
        return False  # PY002: Could be 'return x == 5'
'''
    
    result = analyze_code(test_code)
    
    print("=" * 60)
    print("ANALYSIS RESULTS")
    print("=" * 60)
    print(f"\nTotal Issues: {result['summary']['total_issues']}")
    print(f"By Severity: {result['summary']['by_severity']}")
    print(f"By Category: {result['summary']['by_category']}")
    
    print("\n" + "=" * 60)
    print("DETAILED HINTS")
    print("=" * 60)
    for hint in result['hints']:
        print(f"\n{hint}")
    
    print("\n" + "=" * 60)
    print("STRUCTURED DATA (for UI/programmatic use)")
    print("=" * 60)
    import json
    print(json.dumps(result['raw_matches'], indent=2))