importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodide = null;

// =============================================================================
// AST COMPARISON ENGINE - EMBEDDED SOURCE
// =============================================================================
const COMPARATOR_SOURCE = `
import ast
import json
from typing import Dict, List, Optional, Set, Any, Union
from dataclasses import dataclass, field, asdict
from enum import Enum

class DivergenceType(Enum):
    MISSING_NODE = "missing_node"
    EXTRA_NODE = "extra_node"
    TYPE_MISMATCH = "type_mismatch"
    OPERATOR_MISMATCH = "operator_mismatch"
    STRUCTURE_MISMATCH = "structure_mismatch"
    SEMANTIC_VIOLATION = "semantic_violation"
    FORBIDDEN_PATTERN = "forbidden_pattern"
    MISSING_PATTERN = "missing_pattern"

@dataclass
class Divergence:
    type: str
    student_path: str
    reference_path: Optional[str]
    line_no: Optional[int]
    expected: str
    found: str
    message: str
    severity: str
    suggestion: Optional[str] = None

@dataclass
class NormalizedNode:
    type: str
    canonical_id: Optional[str] = None
    original_name: Optional[str] = None
    operator: Optional[Union[str, List[str]]] = None
    value_type: Optional[str] = None
    children: Dict[str, Any] = field(default_factory=dict)
    line_no: Optional[int] = None
    depth: int = 0
    path: str = ""
    
    def to_dict(self) -> Dict:
        result = {"type": self.type, "depth": self.depth, "path": self.path, "children": {}}
        if self.canonical_id: result["canonicalId"] = self.canonical_id
        if self.original_name: result["originalName"] = self.original_name
        if self.operator: result["operator"] = self.operator
        if self.value_type: result["valueType"] = self.value_type
        if self.line_no: result["lineNo"] = self.line_no
        for key, val in self.children.items():
            if isinstance(val, list):
                result["children"][key] = [v.to_dict() if isinstance(v, NormalizedNode) else v for v in val]
            elif isinstance(val, NormalizedNode):
                result["children"][key] = val.to_dict()
            else:
                result["children"][key] = val
        return result

@dataclass
class ComparisonResult:
    matches: bool
    similarity_score: float
    divergences: List[Divergence]
    best_match_pattern: Optional[str] = None
    stats: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "matches": self.matches,
            "similarityScore": self.similarity_score,
            "divergences": [asdict(d) for d in self.divergences],
            "bestMatchPattern": self.best_match_pattern,
            "stats": self.stats
        }

class ASTNormalizer(ast.NodeVisitor):
    def __init__(self, preserve_function_names: bool = True):
        self.var_counter = 0
        self.func_counter = 0
        self.param_counter = 0
        self.scope_stack: List[Dict[str, str]] = [{}]
        self.func_map: Dict[str, str] = {}
        self.preserve_function_names = preserve_function_names
    
    def _get_canonical_var(self, name: str) -> str:
        for scope in reversed(self.scope_stack):
            if name in scope: return scope[name]
        canonical = f"v{self.var_counter}"
        self.var_counter += 1
        self.scope_stack[-1][name] = canonical
        return canonical
    
    def _push_scope(self): self.scope_stack.append({})
    def _pop_scope(self):
        if len(self.scope_stack) > 1: self.scope_stack.pop()
    
    def _get_operator_name(self, op): return type(op).__name__
    
    def _get_value_type(self, value):
        if value is None: return "None"
        elif value is ...: return "ellipsis"
        elif isinstance(value, bool): return "bool"
        elif isinstance(value, int): return "int"
        elif isinstance(value, float): return "float"
        elif isinstance(value, str): return "str"
        return "unknown"
    
    def normalize(self, node, path="root", depth=0):
        return self._normalize_node(node, path, depth)
    
    def _normalize_node(self, node, path, depth):
        node_type = type(node).__name__
        line_no = getattr(node, 'lineno', None)
        result = NormalizedNode(type=node_type, line_no=line_no, depth=depth, path=path)
        
        if isinstance(node, ast.Name):
            result.original_name = node.id
            result.canonical_id = self._get_canonical_var(node.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            result.original_name = node.name
            result.canonical_id = node.name if self.preserve_function_names else f"f{self.func_counter}"
            self._push_scope()
            result.children["args"] = self._normalize_arguments(node.args, f"{path}.args", depth + 1)
            result.children["body"] = [self._normalize_node(stmt, f"{path}.body[{i}]", depth + 1) for i, stmt in enumerate(node.body)]
            self._pop_scope()
            return result
        elif isinstance(node, ast.BinOp):
            result.operator = self._get_operator_name(node.op)
            result.children["left"] = self._normalize_node(node.left, f"{path}.left", depth + 1)
            result.children["right"] = self._normalize_node(node.right, f"{path}.right", depth + 1)
            return result
        elif isinstance(node, ast.Compare):
            result.operator = [self._get_operator_name(op) for op in node.ops]
            result.children["left"] = self._normalize_node(node.left, f"{path}.left", depth + 1)
            result.children["comparators"] = [self._normalize_node(c, f"{path}.comparators[{i}]", depth + 1) for i, c in enumerate(node.comparators)]
            return result
        elif isinstance(node, ast.Constant):
            result.value_type = self._get_value_type(node.value)
            return result
        elif isinstance(node, ast.AugAssign):
            result.operator = self._get_operator_name(node.op)
            result.children["target"] = self._normalize_node(node.target, f"{path}.target", depth + 1)
            result.children["value"] = self._normalize_node(node.value, f"{path}.value", depth + 1)
            return result
        elif isinstance(node, ast.Call):
            result.children["func"] = self._normalize_node(node.func, f"{path}.func", depth + 1)
            result.children["args"] = [self._normalize_node(arg, f"{path}.args[{i}]", depth + 1) for i, arg in enumerate(node.args)]
            return result
        
        result.children = self._normalize_children(node, path, depth)
        return result
    
    def _normalize_arguments(self, args, path, depth):
        result = {"args": [], "defaults": []}
        for i, arg in enumerate(args.args):
            canonical = f"p{self.param_counter}"
            self.param_counter += 1
            self.scope_stack[-1][arg.arg] = canonical
            result["args"].append({"canonical_id": canonical, "original_name": arg.arg})
        for i, default in enumerate(args.defaults):
            result["defaults"].append(self._normalize_node(default, f"{path}.defaults[{i}]", depth + 1))
        return result
    
    def _normalize_children(self, node, path, depth):
        children = {}
        for field_name, field_value in ast.iter_fields(node):
            if isinstance(field_value, list):
                normalized = [self._normalize_node(item, f"{path}.{field_name}[{i}]", depth + 1) for i, item in enumerate(field_value) if isinstance(item, ast.AST)]
                if normalized: children[field_name] = normalized
            elif isinstance(field_value, ast.AST):
                children[field_name] = self._normalize_node(field_value, f"{path}.{field_name}", depth + 1)
        return children

class ASTComparator:
    def __init__(self, flexibility=None):
        self.flexibility = flexibility or {}
        self.divergences = []
        self.matched_nodes = 0
        self.total_nodes = 0
        self.max_student_depth = 0
        self.max_reference_depth = 0
    
    def compare(self, student, reference):
        self.divergences = []
        self.matched_nodes = 0
        self.total_nodes = 0
        self._compare_nodes(student, reference)
        similarity = self.matched_nodes / max(self.total_nodes, 1)
        return ComparisonResult(
            matches=len([d for d in self.divergences if d.severity == 'error']) == 0,
            similarity_score=round(similarity, 3),
            divergences=self.divergences,
            stats={"totalNodes": self.total_nodes, "matchedNodes": self.matched_nodes,
                   "studentDepth": self.max_student_depth, "referenceDepth": self.max_reference_depth}
        )
    
    def _compare_nodes(self, student, reference):
        self.total_nodes += 1
        self.max_student_depth = max(self.max_student_depth, student.depth)
        self.max_reference_depth = max(self.max_reference_depth, reference.depth)
        
        if not self._types_match(student.type, reference.type):
            self.divergences.append(Divergence(
                type=DivergenceType.TYPE_MISMATCH.value, student_path=student.path,
                reference_path=reference.path, line_no=student.line_no,
                expected=reference.type, found=student.type,
                message=f"Expected {self._humanize(reference.type)} but found {self._humanize(student.type)}",
                severity="error", suggestion=self._get_suggestion(student.type, reference.type)
            ))
            return False
        
        self.matched_nodes += 1
        
        if reference.operator and student.operator != reference.operator:
            if not self._ops_equiv(student.operator, reference.operator):
                self.divergences.append(Divergence(
                    type=DivergenceType.OPERATOR_MISMATCH.value, student_path=student.path,
                    reference_path=reference.path, line_no=student.line_no,
                    expected=str(reference.operator), found=str(student.operator),
                    message=f"Expected operator '{reference.operator}' but found '{student.operator}'",
                    severity="warning"
                ))
        
        self._compare_children(student, reference)
        return True
    
    def _types_match(self, s, r):
        if s == r: return True
        if self.flexibility.get('allowLoopTypeChange') and {s, r} == {'For', 'While'}: return True
        if self.flexibility.get('allowComprehensionSwap') and s in {'ListComp', 'For'} and r in {'ListComp', 'For'}: return True
        return False
    
    def _ops_equiv(self, op1, op2):
        if not self.flexibility.get('allowOperatorEquivalents'): return op1 == op2
        equivs = [{'Lt', 'Gt'}, {'LtE', 'GtE'}, {'Eq', 'Is'}]
        for g in equivs:
            if str(op1) in g and str(op2) in g: return True
        return op1 == op2
    
    def _compare_children(self, student, reference):
        s_keys, r_keys = set(student.children.keys()), set(reference.children.keys())
        for key in r_keys - s_keys:
            self.divergences.append(Divergence(
                type=DivergenceType.MISSING_NODE.value, student_path=student.path,
                reference_path=f"{reference.path}.{key}", line_no=student.line_no,
                expected=key, found="nothing", message=f"Missing {key} in your code", severity="error"
            ))
        for key in s_keys - r_keys:
            self.divergences.append(Divergence(
                type=DivergenceType.EXTRA_NODE.value, student_path=f"{student.path}.{key}",
                reference_path=reference.path, line_no=None,
                expected="nothing", found=key, message=f"Unexpected {key} in your code", severity="info"
            ))
        for key in s_keys & r_keys:
            s_child, r_child = student.children[key], reference.children[key]
            if isinstance(s_child, list) and isinstance(r_child, list):
                self._compare_lists(s_child, r_child, key, student.path)
            elif isinstance(s_child, NormalizedNode) and isinstance(r_child, NormalizedNode):
                self._compare_nodes(s_child, r_child)
    
    def _compare_lists(self, s_list, r_list, field, parent_path):
        min_len = min(len(s_list), len(r_list))
        for i in range(min_len):
            if isinstance(s_list[i], NormalizedNode) and isinstance(r_list[i], NormalizedNode):
                self._compare_nodes(s_list[i], r_list[i])
        if len(s_list) < len(r_list):
            for i in range(min_len, len(r_list)):
                self.divergences.append(Divergence(
                    type=DivergenceType.MISSING_NODE.value, student_path=f"{parent_path}.{field}",
                    reference_path=f"{parent_path}.{field}[{i}]", line_no=None,
                    expected="statement", found="nothing", message=f"Missing statement in {field}", severity="error"
                ))
        elif len(s_list) > len(r_list):
            for i in range(min_len, len(s_list)):
                node = s_list[i]
                self.divergences.append(Divergence(
                    type=DivergenceType.EXTRA_NODE.value, student_path=f"{parent_path}.{field}[{i}]",
                    reference_path=f"{parent_path}.{field}",
                    line_no=node.line_no if isinstance(node, NormalizedNode) else None,
                    expected="end", found="extra statement", message=f"Extra statement in {field}", severity="info"
                ))
    
    def _humanize(self, t):
        h = {'FunctionDef': 'function', 'Return': 'return statement', 'For': 'for loop',
             'While': 'while loop', 'If': 'if statement', 'BinOp': 'operation',
             'Compare': 'comparison', 'Call': 'function call', 'Assign': 'assignment',
             'Expr': 'expression', 'Pass': 'pass', 'Constant': 'value'}
        return h.get(t, t)
    
    def _get_suggestion(self, s, r):
        sugg = {
            ('Expr', 'Return'): "Did you forget to return the result?",
            ('Pass', 'Return'): "Replace 'pass' with a return statement.",
        }
        return sugg.get((s, r), f"Expected {self._humanize(r)}")

class PatternMatcher:
    def find_patterns(self, node, pattern):
        parts = [p.strip() for p in pattern.split('>')]
        matches = []
        self._search(node, parts, 0, [], matches)
        return matches
    
    def _search(self, node, parts, idx, path, matches):
        if idx >= len(parts):
            matches.append(' > '.join(path))
            return
        if node.type == parts[idx]:
            path.append(f"{node.type}@{node.path}")
            for key, child in node.children.items():
                if isinstance(child, list):
                    for c in child:
                        if isinstance(c, NormalizedNode): self._search(c, parts, idx + 1, path.copy(), matches)
                elif isinstance(child, NormalizedNode):
                    self._search(child, parts, idx + 1, path.copy(), matches)
        for key, child in node.children.items():
            if isinstance(child, list):
                for c in child:
                    if isinstance(c, NormalizedNode): self._search(c, parts, idx, [], matches)
            elif isinstance(child, NormalizedNode):
                self._search(child, parts, idx, [], matches)
    
    def check_required_nodes(self, node, required):
        found = self._collect_types(node)
        return [r for r in required if r not in found]
    
    def _collect_types(self, node):
        types = {node.type}
        for key, child in node.children.items():
            if isinstance(child, list):
                for c in child:
                    if isinstance(c, NormalizedNode): types.update(self._collect_types(c))
            elif isinstance(child, NormalizedNode):
                types.update(self._collect_types(child))
        return types

def compare_ast(student_code, reference_code, flexibility=None):
    try:
        student_tree = ast.parse(student_code)
        reference_tree = ast.parse(reference_code)
        normalizer1 = ASTNormalizer()
        student_norm = normalizer1.normalize(student_tree)
        normalizer2 = ASTNormalizer()
        reference_norm = normalizer2.normalize(reference_tree)
        comparator = ASTComparator(flexibility or {})
        result = comparator.compare(student_norm, reference_norm)
        return {"success": True, "result": result.to_dict(), "error": None}
    except SyntaxError as e:
        return {"success": False, "result": None, "error": f"Syntax error at line {e.lineno}: {e.msg}"}
    except Exception as e:
        return {"success": False, "result": None, "error": str(e)}

def check_patterns(source_code, required_patterns=None, forbidden_patterns=None, required_nodes=None):
    try:
        tree = ast.parse(source_code)
        normalizer = ASTNormalizer()
        normalized = normalizer.normalize(tree)
        matcher = PatternMatcher()
        violations = []
        if required_patterns:
            for pattern in required_patterns:
                if not matcher.find_patterns(normalized, pattern):
                    violations.append({"type": "missing_pattern", "pattern": pattern, "message": f"Required pattern '{pattern}' not found"})
        if forbidden_patterns:
            for pattern in forbidden_patterns:
                if matcher.find_patterns(normalized, pattern):
                    violations.append({"type": "forbidden_pattern", "pattern": pattern, "message": f"Forbidden pattern '{pattern}' detected"})
        if required_nodes:
            for node_type in matcher.check_required_nodes(normalized, required_nodes):
                violations.append({"type": "missing_node", "node_type": node_type, "message": f"Required '{node_type}' not found"})
        return {"success": True, "passes": len(violations) == 0, "violations": violations}
    except SyntaxError as e:
        return {"success": False, "passes": False, "violations": [], "error": f"Syntax error at line {e.lineno}: {e.msg}"}
    except Exception as e:
        return {"success": False, "passes": False, "violations": [], "error": str(e)}
`;

// =============================================================================
// FULL AST ANALYZER WITH ALL DETECTORS
// =============================================================================
const ANALYZER_SOURCE = `
import ast
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from typing import List, Dict, Set, Optional, Any
from enum import Enum, auto
from collections import defaultdict

class Severity(Enum):
    INFO = 1
    WARNING = 2
    ERROR = 3
    CRITICAL = 4

class PatternCategory(Enum):
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
    pattern_id: str
    name: str
    category: str
    severity: str
    message: str
    line_number: Optional[int] = None
    suggestion: Optional[str] = None

class AnalysisContext:
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.lines = source_code.split('\\\\n')
        self.assigned_vars: Set[str] = set()
        self.used_vars: Set[str] = set()
        self.function_defs: Dict[str, ast.FunctionDef] = {}
        self.loop_depth = 0
        self.current_function: Optional[str] = None
        self.imports: Set[str] = set()
        self.loop_vars: Set[str] = set()

class AntiPatternDetector(ABC):
    def __init__(self):
        self.pattern_id: str = ""
        self.name: str = ""
        self.category: PatternCategory = PatternCategory.STYLE
        self.severity: Severity = Severity.WARNING

    @abstractmethod
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        pass

    def create_match(self, node: ast.AST, message: str, 
                     suggestion: Optional[str] = None,
                     severity: Optional[Severity] = None) -> AntiPatternMatch:
        return AntiPatternMatch(
            pattern_id=self.pattern_id,
            name=self.name,
            category=self.category.value,
            severity=(severity if severity is not None else self.severity).name,
            message=message,
            line_number=getattr(node, 'lineno', None),
            suggestion=suggestion
        )

# ============================================================================
# CONTROL FLOW DETECTORS
# ============================================================================

class WhileInsteadOfForDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF001"
        self.name = "While Instead Of For"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.WARNING

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.While):
            return None
        body = node.body
        if len(body) < 2:
            return None
        last_stmt = body[-1]
        if isinstance(last_stmt, ast.AugAssign):
            if isinstance(last_stmt.op, ast.Add) and isinstance(last_stmt.value, ast.Constant):
                if last_stmt.value.value == 1:
                    return self.create_match(
                        node,
                        "This while loop with manual increment could be simplified to a 'for' loop",
                        "Consider: for i in range(n):"
                    )
        return None

class InfiniteLoopDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF002"
        self.name = "Infinite Loop"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.CRITICAL

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.While):
            return None
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

class BooleanComparisonDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF006"
        self.name = "Explicit Boolean Comparison"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.INFO

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Compare):
            return None
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

class WrongLoopTypeDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "CF007"
        self.name = "Suboptimal Loop Type"
        self.category = PatternCategory.CONTROL_FLOW
        self.severity = Severity.INFO

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.While):
            return None
        body = node.body
        if len(body) >= 2:
            last_stmt = body[-1]
            if isinstance(last_stmt, ast.AugAssign):
                if isinstance(last_stmt.op, ast.Add):
                    if isinstance(last_stmt.value, ast.Constant) and last_stmt.value.value == 1:
                        return self.create_match(
                            node,
                            "Manual counter with while loop - consider using for loop with range()",
                            "Use: for i in range(n): - it's more Pythonic and less error-prone"
                        )
        if isinstance(node.test, ast.Compare):
            if any(isinstance(op, (ast.Lt, ast.LtE, ast.Gt, ast.GtE)) for op in node.test.ops):
                return self.create_match(
                    node,
                    "While loop with range comparison detected",
                    "Consider: for i in range(start, end): for clearer iteration"
                )
        return None

# ============================================================================
# VARIABLE DETECTORS
# ============================================================================

class VariableShadowingDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "VAR003"
        self.name = "Variable Shadowing"
        self.category = PatternCategory.VARIABLES
        self.severity = Severity.WARNING
        self.builtins = {'list', 'dict', 'set', 'str', 'int', 'sum', 'max', 'min', 'id', 'type', 'input', 'print', 'len', 'range', 'open', 'file', 'map', 'filter'}

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

# ============================================================================
# DATA STRUCTURE DETECTORS
# ============================================================================

class MutableDefaultArgumentDetector(AntiPatternDetector):
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
                type_name = type(default).__name__.lower()
                return self.create_match(
                    node,
                    f"Mutable {type_name} used as default argument - dangerous!",
                    "Use None as default and initialize inside function"
                )
        return None

class ListConcatInLoopDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "DS001"
        self.name = "List Concatenation In Loop"
        self.category = PatternCategory.DATA_STRUCTURES
        self.severity = Severity.WARNING

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, (ast.For, ast.While)):
            return None
        for child in ast.walk(node):
            if isinstance(child, ast.Assign):
                if isinstance(child.value, ast.BinOp) and isinstance(child.value.op, ast.Add):
                    if isinstance(child.value.left, ast.Name) and isinstance(child.value.right, ast.List):
                        return self.create_match(
                            node,
                            "Building list with + in loop is O(n²) - inefficient",
                            "Use list.append() or list comprehension instead"
                        )
        return None

# ============================================================================
# FUNCTION DETECTORS
# ============================================================================

class PrintInsteadOfReturnDetector(AntiPatternDetector):
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
            if isinstance(child, ast.Return) and child.value is not None:
                has_return = True
        if has_print and not has_return:
            return self.create_match(
                node,
                f"Function '{node.name}' prints but doesn't return - testing will fail",
                "Return the value instead of printing it"
            )
        return None

class TooManyParametersDetector(AntiPatternDetector):
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

class MissingReturnDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "FUNC004"
        self.name = "Missing Return Statement"
        self.category = PatternCategory.FUNCTIONS
        self.severity = Severity.ERROR

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        has_logic = any(
            isinstance(n, (ast.For, ast.While, ast.If, ast.BinOp, ast.Call))
            for n in ast.walk(node)
        )
        has_return = any(
            isinstance(n, ast.Return) and n.value is not None
            for n in ast.walk(node)
        )
        if has_logic and not has_return:
            return self.create_match(
                node,
                f"Function '{node.name}' performs calculations but doesn't return anything",
                "Add a return statement with your computed result"
            )
        return None

# ============================================================================
# LOGIC DETECTORS
# ============================================================================

class UnreachableCodeDetector(AntiPatternDetector):
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

class IdentityVsEqualityDetector(AntiPatternDetector):
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
                if i < len(node.comparators):
                    comparator = node.comparators[i]
                    if isinstance(comparator, ast.Constant):
                        if comparator.value is not None and comparator.value is not ...:
                            return self.create_match(
                                node,
                                f"Using 'is' for literal comparison - use '==' instead",
                                f"'is' checks identity, '==' checks equality"
                            )
        return None

class HardcodedValuesDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "LOG001"
        self.name = "Hardcoded Magic Numbers"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.ERROR
        self.magic_numbers = {0, 1, 2}
        self.common_test_answers = {15, 120, 55, 42, 100, 1000, 1024, 255, 256}
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.Constant):
            return None
        
        if isinstance(node.value, (int, float)):
            val = node.value
            
            if val in self.magic_numbers:
                return None
            
            parent = getattr(node, 'parent', None)
            grandparent = getattr(parent, 'parent', None) if parent else None
            
            is_in_return = isinstance(parent, ast.Return) or isinstance(grandparent, ast.Return)
            
            if is_in_return and val in self.common_test_answers:
                return self.create_match(
                    node,
                    f"Hardcoded answer {val} detected - did you just return the test case answer?",
                    "Implement the actual logic with a loop or formula instead of hardcoding",
                    severity=Severity.CRITICAL
                )
            
            if abs(val) > 10 and isinstance(parent, (ast.BinOp, ast.Compare, ast.Call)):
                if isinstance(parent, ast.Call):
                    return None
                    
                return self.create_match(
                    node,
                    f"Magic number {val} detected - consider making it a parameter or constant",
                    f"Define a constant: TARGET_SUM = {val} or use a function parameter",
                    severity=Severity.WARNING
                )
        
        return None

class MissingLoopDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "STRUCT001"
        self.name = "Missing Loop Structure"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.ERROR
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, (ast.Module, ast.FunctionDef)):
            return None
            
        has_range = any(
            isinstance(n, ast.Call) and 
            isinstance(n.func, ast.Name) and 
            n.func.id == 'range'
            for n in ast.walk(node)
        )
        
        has_for_loop = any(
            isinstance(n, ast.For) 
            for n in ast.walk(node)
        )
        
        has_while_loop = any(
            isinstance(n, ast.While) 
            for n in ast.walk(node)
        )
        
        if has_range and not has_for_loop and not has_while_loop:
            return self.create_match(
                node,
                "You have a range() but no loop to iterate over it",
                "Use a for loop: for i in range(n):",
                severity=Severity.ERROR
            )
        
        return None

# ============================================================================
# PYTHONIC DETECTORS
# ============================================================================

class ManualMaxMinDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY002"
        self.name = "Manual Max/Min"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
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
    def __init__(self):
        super().__init__()
        self.pattern_id = "PY003"
        self.name = "List Build Loop"
        self.category = PatternCategory.PYTHONIC
        self.severity = Severity.INFO

    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.For):
            return None
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

class TryExceptPassDetector(AntiPatternDetector):
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

# ============================================================================
# COMPLEXITY ANALYSIS FOR ADVANCED USERS (GOAL 4)
# ============================================================================

@dataclass
class ComplexityMetrics:
    function_name: str
    cyclomatic_complexity: int
    nesting_depth: int
    line_count: int
    score: str

class CyclomaticComplexityDetector(AntiPatternDetector):
    def __init__(self):
        super().__init__()
        self.pattern_id = "COMPLEX001"
        self.name = "Cyclomatic Complexity"
        self.category = PatternCategory.LOGIC
        self.severity = Severity.INFO
        self.metrics: List[ComplexityMetrics] = []
        
        self.decision_nodes = (
            ast.If, ast.While, ast.For, ast.ExceptHandler,
            ast.With, ast.Assert, ast.comprehension
        )
        self.boolean_ops = (ast.And, ast.Or)
    
    def calculate_complexity(self, node: ast.FunctionDef) -> int:
        complexity = 1
        
        for child in ast.walk(node):
            if isinstance(child, ast.If):
                complexity += 1
            elif isinstance(child, (ast.While, ast.For)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.With):
                complexity += 1
            elif isinstance(child, ast.Assert):
                complexity += 1
            elif isinstance(child, ast.comprehension):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.IfExp):
                complexity += 1
        
        return complexity
    
    def calculate_nesting_depth(self, node: ast.FunctionDef) -> int:
        max_depth = 0
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With)):
                depth = 0
                current = child
                while current:
                    if isinstance(current, (ast.If, ast.For, ast.While, ast.Try, ast.With)):
                        depth += 1
                    current = getattr(current, 'parent', None)
                max_depth = max(max_depth, depth)
        
        return max_depth
    
    def get_complexity_score(self, cc: int) -> str:
        if cc <= 10:
            return 'low'
        elif cc <= 20:
            return 'moderate'
        elif cc <= 50:
            return 'high'
        else:
            return 'very_high'
    
    def get_severity_for_score(self, score: str) -> Severity:
        return {
            'low': Severity.INFO,
            'moderate': Severity.WARNING,
            'high': Severity.ERROR,
            'very_high': Severity.CRITICAL
        }.get(score, Severity.INFO)
    
    def detect(self, node: ast.AST, context: AnalysisContext) -> Optional[AntiPatternMatch]:
        if not isinstance(node, ast.FunctionDef):
            return None
        
        cc = self.calculate_complexity(node)
        depth = self.calculate_nesting_depth(node)
        score = self.get_complexity_score(cc)
        
        self.metrics.append(ComplexityMetrics(
            function_name=node.name,
            cyclomatic_complexity=cc,
            nesting_depth=depth,
            line_count=len(node.body),
            score=score
        ))
        
        if score == 'low':
            return None
        
        severity = self.get_severity_for_score(score)
        
        messages = {
            'moderate': (
                f"Function '{node.name}' has moderate complexity (CC={cc})",
                "Consider breaking this into smaller functions"
            ),
            'high': (
                f"Function '{node.name}' is highly complex (CC={cc}) - hard to maintain",
                "Refactor: extract helper functions or reduce nested conditions"
            ),
            'very_high': (
                f"Function '{node.name}' is extremely complex (CC={cc}) - untestable!",
                "CRITICAL: Split this function immediately - it has too many paths"
            )
        }
        
        msg, suggestion = messages.get(score, ("", ""))
        
        if depth > 3:
            msg += f" | Nesting depth: {depth} levels"
            suggestion += f" | Reduce nesting by extracting inner blocks (currently {depth} levels deep)"
        
        return self.create_match(
            node,
            msg,
            suggestion,
            severity=severity
        )
    
    def get_metrics_report(self) -> Dict[str, Any]:
        if not self.metrics:
            return {}
        
        avg_cc = sum(m.cyclomatic_complexity for m in self.metrics) / len(self.metrics)
        max_cc = max(m.cyclomatic_complexity for m in self.metrics)
        
        return {
            'average_complexity': round(avg_cc, 2),
            'max_complexity': max_cc,
            'functions_analyzed': len(self.metrics),
            'high_risk_functions': [m.function_name for m in self.metrics if m.score in ('high', 'very_high')],
            'metrics': [
                {
                    'function': m.function_name,
                    'cc': m.cyclomatic_complexity,
                    'depth': m.nesting_depth,
                    'score': m.score
                }
                for m in self.metrics
            ]
        }

# ============================================================================
# MAIN HINT COLLECTOR
# ============================================================================

class HintCollector(ast.NodeVisitor):
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.context = AnalysisContext(source_code)
        self.matches: List[AntiPatternMatch] = []
        self.detectors: List[AntiPatternDetector] = [
            # Control Flow
            WhileInsteadOfForDetector(),
            InfiniteLoopDetector(),
            RangeLenDetector(),
            BooleanComparisonDetector(),
            WrongLoopTypeDetector(),
            # Variables
            VariableShadowingDetector(),
            # Data Structures
            MutableDefaultArgumentDetector(),
            ListConcatInLoopDetector(),
            # Functions
            PrintInsteadOfReturnDetector(),
            TooManyParametersDetector(),
            MissingReturnDetector(),
            # Logic
            HardcodedValuesDetector(),
            UnreachableCodeDetector(),
            IdentityVsEqualityDetector(),
            MissingLoopDetector(),
            # Pythonic
            ManualMaxMinDetector(),
            ListAppendLoopDetector(),
            TryExceptPassDetector(),
        ]
        # Complexity detector for advanced analysis
        self.complexity_detector = CyclomaticComplexityDetector()
        self.detectors.append(self.complexity_detector)

    def _set_parents(self, node: ast.AST, parent=None):
        node.parent = parent
        for child in ast.iter_child_nodes(node):
            self._set_parents(child, node)

    def visit(self, node: ast.AST):
        self._update_context_enter(node)
        for detector in self.detectors:
            match = detector.detect(node, self.context)
            if match:
                self.matches.append(match)
        self.generic_visit(node)
        self._update_context_exit(node)

    def _update_context_enter(self, node: ast.AST):
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
        if isinstance(node, (ast.For, ast.While)):
            self.context.loop_depth -= 1
        elif isinstance(node, ast.FunctionDef):
            self.context.current_function = None

    def get_complexity_report(self):
        """Get complexity metrics if available"""
        return self.complexity_detector.get_metrics_report() if hasattr(self, 'complexity_detector') else {}

def analyze_code(source_code: str) -> Dict[str, Any]:
    try:
        tree = ast.parse(source_code)
        collector = HintCollector(source_code)
        collector._set_parents(tree)
        collector.visit(tree)

        severity_icons = {
            'INFO': '💡',
            'WARNING': '⚠️',
            'ERROR': '❌',
            'CRITICAL': '🚨'
        }

        hints = []
        for m in collector.matches:
            icon = severity_icons.get(m.severity, '💡')
            hint = f"{icon} [{m.pattern_id}] {m.message}"
            if m.suggestion:
                hint += f" → {m.suggestion}"
            if m.line_number:
                hint += f" (line {m.line_number})"
            hints.append(hint)

        complexity = collector.get_complexity_report()

        return {
            "success": True,
            "hints": hints,
            "summary": {
                "total_issues": len(collector.matches),
                "complexity": complexity
            },
            "raw_matches": [asdict(m) for m in collector.matches]
        }
    except SyntaxError as e:
        return {
            "success": False,
            "error": f"Syntax Error: {e.msg} at line {e.lineno}",
            "hints": [f"🚨 Syntax error: {e.msg} (line {e.lineno})"]
        }
    except Exception as e:
        return {"success": False, "error": str(e), "hints": []}
`;

const LIBS = {
    "analyzer": ANALYZER_SOURCE,
    "comparator": COMPARATOR_SOURCE
};

async function getPyodide() {
    if (!pyodide) {
        pyodide = await loadPyodide();
        pyodide.FS.writeFile("analyzer_lib.py", LIBS.analyzer);
        pyodide.FS.writeFile("comparator_lib.py", LIBS.comparator);
    }
    return pyodide;
}

self.onmessage = async (event) => {
    const { type, code, studentCode, referenceCode, flexibility, requiredPatterns, forbiddenPatterns, requiredNodes } = event.data;
    const instance = await getPyodide();

    // Handle AST comparison requests WITH COMPLEXITY ANALYSIS
    if (type === 'ast_compare') {
        try {
            const flexibilitySanitized = JSON.stringify(flexibility || {})
                .replace(/:true/g, ":True")
                .replace(/:false/g, ":False");

            // Run both comparison AND analysis together
            const resultJson = await instance.runPythonAsync(`
import json
import ast
from comparator_lib import compare_ast
from analyzer_lib import analyze_code

# Get comparison result
comp_result = compare_ast(
    ${JSON.stringify(studentCode)}, 
    ${JSON.stringify(referenceCode)}, 
    ${flexibilitySanitized}
)

# Get analysis for complexity
analysis = analyze_code(${JSON.stringify(studentCode)})

# Merge complexity into comparison stats
if comp_result.get('success') and comp_result.get('result'):
    comp_result['result']['stats']['complexity'] = analysis.get('summary', {}).get('complexity', None)

json.dumps(comp_result)
`);
            const result = JSON.parse(resultJson);
            self.postMessage({ 
                type: 'ast_compare_result', 
                success: result.success,
                result: result.result,
                error: result.error 
            });
        } catch (err) {
            self.postMessage({ 
                type: 'ast_compare_result', 
                success: false, 
                error: err.toString() 
            });
        }
        return;
    }

    // Handle pattern checking requests
    if (type === 'check_patterns') {
        try {
            const toPy = (val) => {
                if (val === null || val === undefined) return "None";
                return JSON.stringify(val);
            };

            const resultJson = await instance.runPythonAsync(`
import json
from comparator_lib import check_patterns
result = check_patterns(
    ${toPy(code)},
    ${toPy(requiredPatterns)},
    ${toPy(forbiddenPatterns)},
    ${toPy(requiredNodes)}
)
json.dumps(result)
`);
            const result = JSON.parse(resultJson);
            self.postMessage({ 
                type: 'check_patterns_result', 
                success: result.success,
                passes: result.passes,
                violations: result.violations,
                error: result.error 
            });
        } catch (err) {
            self.postMessage({ 
                type: 'check_patterns_result', 
                success: false, 
                passes: false,
                violations: [],
                error: err.toString() 
            });
        }
        return;
    }

    // Default: Run code with analysis
    let hints = [];
    let summary = { total_issues: 0 };
    let output = "";
    let error = "";

    try {
        const analysisResultJson = await instance.runPythonAsync(`
import json
from analyzer_lib import analyze_code
result = analyze_code(${JSON.stringify(code)})
json.dumps(result)
`);

        const analysis = JSON.parse(analysisResultJson);
        hints = analysis.hints || [];
        summary = analysis.summary || { total_issues: 0 };

        if (!analysis.success) {
            error = analysis.error;
        }

        const isCritical = analysis.raw_matches?.some(m => m.severity === 'CRITICAL');
        if (isCritical) {
            self.postMessage({ 
                output: "", 
                error: "Logic Error: Execution blocked for safety (Potential Infinite Loop).", 
                hints, 
                summary 
            });
            return;
        }

        await instance.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
        `);

        await instance.runPythonAsync(code);
        output = instance.runPython("sys.stdout.getvalue()");
        const stderr = instance.runPython("sys.stderr.getvalue()");
        if (stderr) error = stderr;

    } catch (err) {
        error = err.toString();
    }

    self.postMessage({ output, error, hints, summary });
};