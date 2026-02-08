# """
# AST Golden Reference Comparison Engine

# This module implements a compiler-engineering approach to comparing Python AST structures.
# It normalizes ASTs, performs structural comparison, and identifies exact divergence points.

# Key techniques:
# 1. α-renaming: Normalize variable names to position-based identifiers
# 2. Structural normalization: Collapse equivalent constructs
# 3. Tree diff algorithm: LCS-based comparison with path tracking
# 4. Divergence localization: Precise line/column reporting
# """

# import ast
# import json
# from typing import Dict, List, Optional, Set, Tuple, Any, Union
# from dataclasses import dataclass, field, asdict
# from enum import Enum
# from collections import defaultdict


# # =============================================================================
# # Data Classes for Comparison Results
# # =============================================================================

# class DivergenceType(Enum):
#     MISSING_NODE = "missing_node"
#     EXTRA_NODE = "extra_node"
#     TYPE_MISMATCH = "type_mismatch"
#     OPERATOR_MISMATCH = "operator_mismatch"
#     STRUCTURE_MISMATCH = "structure_mismatch"
#     SEMANTIC_VIOLATION = "semantic_violation"
#     FORBIDDEN_PATTERN = "forbidden_pattern"
#     MISSING_PATTERN = "missing_pattern"


# @dataclass
# class Divergence:
#     type: str
#     student_path: str
#     reference_path: Optional[str]
#     line_no: Optional[int]
#     expected: str
#     found: str
#     message: str
#     severity: str  # 'error', 'warning', 'info'
#     suggestion: Optional[str] = None


# @dataclass
# class NormalizedNode:
#     """A normalized AST node for comparison."""
#     type: str
#     canonical_id: Optional[str] = None
#     original_name: Optional[str] = None
#     operator: Optional[Union[str, List[str]]] = None
#     value_type: Optional[str] = None
#     children: Dict[str, Any] = field(default_factory=dict)
#     line_no: Optional[int] = None
#     depth: int = 0
#     path: str = ""
    
#     def to_dict(self) -> Dict:
#         result = {
#             "type": self.type,
#             "depth": self.depth,
#             "path": self.path,
#             "children": {}
#         }
#         if self.canonical_id:
#             result["canonicalId"] = self.canonical_id
#         if self.original_name:
#             result["originalName"] = self.original_name
#         if self.operator:
#             result["operator"] = self.operator
#         if self.value_type:
#             result["valueType"] = self.value_type
#         if self.line_no:
#             result["lineNo"] = self.line_no
        
#         for key, val in self.children.items():
#             if isinstance(val, list):
#                 result["children"][key] = [v.to_dict() if isinstance(v, NormalizedNode) else v for v in val]
#             elif isinstance(val, NormalizedNode):
#                 result["children"][key] = val.to_dict()
#             else:
#                 result["children"][key] = val
        
#         return result


# @dataclass
# class ComparisonResult:
#     matches: bool
#     similarity_score: float
#     divergences: List[Divergence]
#     best_match_pattern: Optional[str] = None
#     stats: Dict[str, int] = field(default_factory=dict)
    
#     def to_dict(self) -> Dict:
#         return {
#             "matches": self.matches,
#             "similarityScore": self.similarity_score,
#             "divergences": [asdict(d) for d in self.divergences],
#             "bestMatchPattern": self.best_match_pattern,
#             "stats": self.stats
#         }


# # =============================================================================
# # AST Normalizer - Implements α-renaming and structural normalization
# # =============================================================================

# class ASTNormalizer(ast.NodeVisitor):
#     """
#     Normalizes a Python AST for structural comparison.
    
#     Normalization steps:
#     1. α-renaming: Replace variable names with canonical identifiers (v0, v1, ...)
#     2. Position stripping: Remove line/col info (but preserve for error reporting)
#     3. Structural collapsing: Treat equivalent constructs as identical
#     """
    
#     def __init__(self, preserve_function_names: bool = True):
#         self.var_counter = 0
#         self.func_counter = 0
#         self.param_counter = 0
#         self.var_map: Dict[str, str] = {}  # original_name -> canonical_id
#         self.func_map: Dict[str, str] = {}
#         self.scope_stack: List[Dict[str, str]] = [{}]
#         self.preserve_function_names = preserve_function_names
#         self.current_depth = 0
#         self.current_path = ""
    
#     def _get_canonical_var(self, name: str) -> str:
#         """Get or create canonical identifier for a variable."""
#         # Check current scope first, then outer scopes
#         for scope in reversed(self.scope_stack):
#             if name in scope:
#                 return scope[name]
#         # New variable - add to current scope
#         canonical = f"v{self.var_counter}"
#         self.var_counter += 1
#         self.scope_stack[-1][name] = canonical
#         return canonical
    
#     def _get_canonical_func(self, name: str) -> str:
#         """Get or create canonical identifier for a function."""
#         if name in self.func_map:
#             return self.func_map[name]
#         canonical = f"f{self.func_counter}"
#         self.func_counter += 1
#         self.func_map[name] = canonical
#         return canonical
    
#     def _push_scope(self):
#         self.scope_stack.append({})
    
#     def _pop_scope(self):
#         if len(self.scope_stack) > 1:
#             self.scope_stack.pop()
    
#     def _get_operator_name(self, op: ast.AST) -> str:
#         """Extract operator name from AST operator node."""
#         return type(op).__name__
    
#     def _get_value_type(self, value: Any) -> str:
#         """Determine the type category of a constant value."""
#         if value is None:
#             return "None"
#         elif value is ...:
#             return "ellipsis"
#         elif isinstance(value, bool):
#             return "bool"
#         elif isinstance(value, int):
#             return "int"
#         elif isinstance(value, float):
#             return "float"
#         elif isinstance(value, str):
#             return "str"
#         elif isinstance(value, bytes):
#             return "bytes"
#         return "unknown"
    
#     def normalize(self, node: ast.AST, path: str = "root", depth: int = 0) -> NormalizedNode:
#         """Main entry point - normalize an AST node recursively."""
#         self.current_depth = depth
#         self.current_path = path
#         return self._normalize_node(node, path, depth)
    
#     def _normalize_node(self, node: ast.AST, path: str, depth: int) -> NormalizedNode:
#         """Recursively normalize an AST node."""
#         node_type = type(node).__name__
#         line_no = getattr(node, 'lineno', None)
        
#         result = NormalizedNode(
#             type=node_type,
#             line_no=line_no,
#             depth=depth,
#             path=path
#         )
        
#         # Handle specific node types
#         if isinstance(node, ast.Name):
#             result.original_name = node.id
#             result.canonical_id = self._get_canonical_var(node.id)
        
#         elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
#             result.original_name = node.name
#             if self.preserve_function_names:
#                 result.canonical_id = node.name
#             else:
#                 result.canonical_id = self._get_canonical_func(node.name)
            
#             # Enter new scope for function body
#             self._push_scope()
            
#             # Normalize arguments
#             args_normalized = self._normalize_arguments(node.args, f"{path}.args", depth + 1)
#             result.children["args"] = args_normalized
            
#             # Normalize body
#             body_normalized = [
#                 self._normalize_node(stmt, f"{path}.body[{i}]", depth + 1)
#                 for i, stmt in enumerate(node.body)
#             ]
#             result.children["body"] = body_normalized
            
#             # Normalize decorators
#             if node.decorator_list:
#                 result.children["decorators"] = [
#                     self._normalize_node(dec, f"{path}.decorators[{i}]", depth + 1)
#                     for i, dec in enumerate(node.decorator_list)
#                 ]
            
#             self._pop_scope()
#             return result
        
#         elif isinstance(node, ast.BinOp):
#             result.operator = self._get_operator_name(node.op)
#             result.children["left"] = self._normalize_node(node.left, f"{path}.left", depth + 1)
#             result.children["right"] = self._normalize_node(node.right, f"{path}.right", depth + 1)
#             return result
        
#         elif isinstance(node, ast.UnaryOp):
#             result.operator = self._get_operator_name(node.op)
#             result.children["operand"] = self._normalize_node(node.operand, f"{path}.operand", depth + 1)
#             return result
        
#         elif isinstance(node, ast.BoolOp):
#             result.operator = self._get_operator_name(node.op)
#             result.children["values"] = [
#                 self._normalize_node(v, f"{path}.values[{i}]", depth + 1)
#                 for i, v in enumerate(node.values)
#             ]
#             return result
        
#         elif isinstance(node, ast.Compare):
#             result.operator = [self._get_operator_name(op) for op in node.ops]
#             result.children["left"] = self._normalize_node(node.left, f"{path}.left", depth + 1)
#             result.children["comparators"] = [
#                 self._normalize_node(c, f"{path}.comparators[{i}]", depth + 1)
#                 for i, c in enumerate(node.comparators)
#             ]
#             return result
        
#         elif isinstance(node, ast.Constant):
#             result.value_type = self._get_value_type(node.value)
#             return result
        
#         elif isinstance(node, ast.AugAssign):
#             result.operator = self._get_operator_name(node.op)
#             result.children["target"] = self._normalize_node(node.target, f"{path}.target", depth + 1)
#             result.children["value"] = self._normalize_node(node.value, f"{path}.value", depth + 1)
#             return result
        
#         elif isinstance(node, ast.Call):
#             result.children["func"] = self._normalize_node(node.func, f"{path}.func", depth + 1)
#             result.children["args"] = [
#                 self._normalize_node(arg, f"{path}.args[{i}]", depth + 1)
#                 for i, arg in enumerate(node.args)
#             ]
#             if node.keywords:
#                 result.children["keywords"] = [
#                     self._normalize_node(kw.value, f"{path}.keywords[{i}]", depth + 1)
#                     for i, kw in enumerate(node.keywords)
#                 ]
#             return result
        
#         # Generic handling for other nodes
#         result.children = self._normalize_children(node, path, depth)
#         return result
    
#     def _normalize_arguments(self, args: ast.arguments, path: str, depth: int) -> Dict:
#         """Normalize function arguments."""
#         result = {"args": [], "defaults": []}
        
#         for i, arg in enumerate(args.args):
#             # Add parameter to current scope
#             canonical = f"p{self.param_counter}"
#             self.param_counter += 1
#             self.scope_stack[-1][arg.arg] = canonical
#             result["args"].append({
#                 "canonical_id": canonical,
#                 "original_name": arg.arg
#             })
        
#         for i, default in enumerate(args.defaults):
#             result["defaults"].append(
#                 self._normalize_node(default, f"{path}.defaults[{i}]", depth + 1)
#             )
        
#         return result
    
#     def _normalize_children(self, node: ast.AST, path: str, depth: int) -> Dict:
#         """Normalize all child nodes generically."""
#         children = {}
        
#         for field_name, field_value in ast.iter_fields(node):
#             if isinstance(field_value, list):
#                 normalized_list = []
#                 for i, item in enumerate(field_value):
#                     if isinstance(item, ast.AST):
#                         normalized_list.append(
#                             self._normalize_node(item, f"{path}.{field_name}[{i}]", depth + 1)
#                         )
#                 if normalized_list:
#                     children[field_name] = normalized_list
#             elif isinstance(field_value, ast.AST):
#                 children[field_name] = self._normalize_node(
#                     field_value, f"{path}.{field_name}", depth + 1
#                 )
        
#         return children


# # =============================================================================
# # AST Comparator - Tree diff algorithm with divergence detection
# # =============================================================================

# class ASTComparator:
#     """
#     Compares two normalized ASTs and identifies structural divergences.
    
#     Uses a modified tree edit distance algorithm optimized for
#     providing meaningful feedback about where code logic diverges.
#     """
    
#     def __init__(self, flexibility: Optional[Dict] = None):
#         self.flexibility = flexibility or {}
#         self.divergences: List[Divergence] = []
#         self.matched_nodes = 0
#         self.total_nodes = 0
#         self.max_student_depth = 0
#         self.max_reference_depth = 0
    
#     def compare(self, student: NormalizedNode, reference: NormalizedNode) -> ComparisonResult:
#         """Compare two normalized ASTs and return detailed results."""
#         self.divergences = []
#         self.matched_nodes = 0
#         self.total_nodes = 0
#         self.max_student_depth = 0
#         self.max_reference_depth = 0
        
#         #Count total nodes in both tress first
#         student_total = self._count_nodes(student)
#         reference_total = self._count_nodes(reference)

#         #Perform Comparision
#         self._compare_nodes(student, reference)
        
#         # Calculate similarity using max nodes as denominator
#         # This handles: empty tress, student having extra nodes, reference having extra nodes
#         max_nodes = max(student_total, reference_total, 1)
#         similarity = self.matched_nodes / max_nodes

#         # Additional penalty for significant sixe differences
#         size_diff_penalty = abs(student_total - reference_total) / max_nodes if max_nodes > 0 else 0
#         adjusted_similarity = max(0, similarity - (size_diff_penalty * 0.1)) # 10% weight on size diff

        
#         return ComparisonResult(
#             matches=len([d for d in self.divergences if d.severity == 'error']) == 0,
#             similarity_score=round(similarity, 3),
#             divergences=self.divergences,
#             stats={
#                 "totalNodes": self.total_nodes,
#                 "matchedNodes": self.matched_nodes,
#                 "studentDepth": self.max_student_depth,
#                 "referenceDepth": self.max_reference_depth,
#                 "studentTotalNodes": student_total,
#                 "referenceTotalNodes": reference_total
#             }
#         )
#     def _count_nodes(self, node:NormalizedNode) -> int:
#         """Count total nodes in a tree"""
#         count = 1
#         for child in node.children.values():
#             if isinstance(child, list):
#                 for c in child:
#                     if isinstance(c, NormalizedNode):
#                         count+= self._count_nodes(c)
#             elif isinstance(child, NormalizedNode):
#                 count += self._count_nodes(child)
#         return count
    
#     def _compare_nodes(self, student: NormalizedNode, reference: NormalizedNode):
#         self.total_nodes += 1
#         self.max_student_depth = max(self.max_student_depth, student.depth)
#         self.max_reference_depth = max(self.max_reference_depth, reference.depth)

#         # 1. Check type match
#         if not self._types_match(student.type, reference.type):
#             self.divergences.append(Divergence(
#                 type=DivergenceType.TYPE_MISMATCH.value,
#                 student_path=student.path,
#                 reference_path=reference.path,
#                 line_no=student.line_no,
#                 expected=reference.type,
#                 found=student.type,
#                 message=f"Expected {self._humanize_type(reference.type)} but found {self._humanize_type(student.type)}",
#                 severity="error",
#                 suggestion=self._get_type_suggestion(student.type, reference.type)
#             ))
#             return False # Stop recursion on this branch if types are totally different
        
#         self.matched_nodes += 1
        
#         # 2. Check operator match
#         if reference.operator and student.operator != reference.operator:
#             if not self._operators_equivalent(student.operator, reference.operator):
#                 self.divergences.append(Divergence(
#                     type=DivergenceType.OPERATOR_MISMATCH.value,
#                     student_path=student.path,
#                     reference_path=reference.path,
#                     line_no=student.line_no,
#                     expected=str(reference.operator),
#                     found=str(student.operator),
#                     message=f"Expected operator '{reference.operator}' but found '{student.operator}'",
#                     severity="warning",
#                     suggestion=f"Consider using {reference.operator} instead"
#                 ))
        
#         # 3. Recursively compare children
#         self._compare_children(student, reference)
#         return True
    
#     def _types_match(self, student_type: str, reference_type: str) -> bool:
#         """Check if two node types match, considering flexibility rules."""
#         if student_type == reference_type:
#             return True
        
#         # Loop type interchange
#         if self.flexibility.get('allowLoopTypeChange') is True:
#             if {student_type, reference_type} == {'For', 'While'}:
#                 return True
        
#         # Comprehension swap
#         if self.flexibility.get('allowComprehensionSwap') is True:
#             comprehensions = {'ListComp', 'For'}
#             if student_type in comprehensions and reference_type in comprehensions:
#                 return True
        
#         return False
    
#     def _operators_equivalent(self, op1: Any, op2: Any) -> bool:
#         """Check if two operators are semantically equivalent."""
#         if not self.flexibility.get('allowOperatorEquivalents'):
#             return op1 == op2
        
#         # Define equivalent operator groups
#         equivalents = [
#             {'Lt', 'Gt'},  # < and > (with swapped operands)
#             {'LtE', 'GtE'},
#             {'Eq', 'Is'},  # For None comparisons
#         ]
        
#         for group in equivalents:
#             if str(op1) in group and str(op2) in group:
#                 return True
        
#         return op1 == op2
    
#     def _compare_children(self, student: NormalizedNode, reference: NormalizedNode):
#         """Compare child nodes between student and reference."""
#         student_keys = set(student.children.keys())
#         reference_keys = set(reference.children.keys())
        
#         # Check for missing children
#         for key in reference_keys - student_keys:
#             ref_child = reference.children[key]
#             self.divergences.append(Divergence(
#                 type=DivergenceType.MISSING_NODE.value,
#                 student_path=student.path,
#                 reference_path=f"{reference.path}.{key}",
#                 line_no=student.line_no,
#                 expected=self._describe_child(key, ref_child),
#                 found="nothing",
#                 message=f"Missing {self._humanize_field(key)} in your code",
#                 severity="error",
#                 suggestion=self._get_missing_suggestion(key, ref_child)
#             ))
        
#         # Check for extra children (warnings, not errors)
#         for key in student_keys - reference_keys:
#             stu_child = student.children[key]
#             self.divergences.append(Divergence(
#                 type=DivergenceType.EXTRA_NODE.value,
#                 student_path=f"{student.path}.{key}",
#                 reference_path=reference.path,
#                 line_no=self._get_child_line(stu_child),
#                 expected="nothing",
#                 found=self._describe_child(key, stu_child),
#                 message=f"Unexpected {self._humanize_field(key)} in your code",
#                 severity="info",
#                 suggestion="This might be unnecessary code"
#             ))
        
#         # Compare matching children
#         for key in student_keys & reference_keys:
#             stu_child = student.children[key]
#             ref_child = reference.children[key]
            
#             if isinstance(stu_child, list) and isinstance(ref_child, list):
#                 self._compare_lists(stu_child, ref_child, key, student.path)
#             elif isinstance(stu_child, NormalizedNode) and isinstance(ref_child, NormalizedNode):
#                 self._compare_nodes(stu_child, ref_child)
    
#     def _compare_lists(self, student_list: List, reference_list: List, 
#                        field_name: str, parent_path: str):
#         """Compare two lists of child nodes using LCS-based alignment."""
#         # Simple length-based comparison for now
#         # A full implementation would use tree edit distance
        
#         min_len = min(len(student_list), len(reference_list))
        
#         for i in range(min_len):
#             if isinstance(student_list[i], NormalizedNode) and isinstance(reference_list[i], NormalizedNode):
#                 self._compare_nodes(student_list[i], reference_list[i])
        
#         # Report length mismatches
#         if len(student_list) < len(reference_list):
#             for i in range(min_len, len(reference_list)):
#                 ref_node = reference_list[i]
#                 self.divergences.append(Divergence(
#                     type=DivergenceType.MISSING_NODE.value,
#                     student_path=f"{parent_path}.{field_name}",
#                     reference_path=f"{parent_path}.{field_name}[{i}]",
#                     line_no=None,
#                     expected=self._describe_node(ref_node) if isinstance(ref_node, NormalizedNode) else str(ref_node),
#                     found="nothing",
#                     message=f"Missing statement in {self._humanize_field(field_name)}",
#                     severity="error"
#                 ))
#         elif len(student_list) > len(reference_list):
#             for i in range(min_len, len(student_list)):
#                 stu_node = student_list[i]
#                 self.divergences.append(Divergence(
#                     type=DivergenceType.EXTRA_NODE.value,
#                     student_path=f"{parent_path}.{field_name}[{i}]",
#                     reference_path=f"{parent_path}.{field_name}",
#                     line_no=stu_node.line_no if isinstance(stu_node, NormalizedNode) else None,
#                     expected="end of block",
#                     found=self._describe_node(stu_node) if isinstance(stu_node, NormalizedNode) else str(stu_node),
#                     message=f"Extra statement in {self._humanize_field(field_name)}",
#                     severity="info"
#                 ))
    
#     def _describe_child(self, key: str, child: Any) -> str:
#         """Create a human-readable description of a child node."""
#         if isinstance(child, NormalizedNode):
#             return self._describe_node(child)
#         elif isinstance(child, list):
#             if child and isinstance(child[0], NormalizedNode):
#                 return f"{len(child)} {self._humanize_field(key)}"
#             return str(child)
#         return str(child)
    
#     def _describe_node(self, node: NormalizedNode) -> str:
#         """Create a human-readable description of a node."""
#         desc = self._humanize_type(node.type)
#         if node.original_name:
#             desc += f" '{node.original_name}'"
#         if node.operator:
#             desc += f" with {node.operator}"
#         return desc
    
#     def _get_child_line(self, child: Any) -> Optional[int]:
#         """Get line number from a child node."""
#         if isinstance(child, NormalizedNode):
#             return child.line_no
#         elif isinstance(child, list) and child and isinstance(child[0], NormalizedNode):
#             return child[0].line_no
#         return None
    
#     def _humanize_type(self, node_type: str) -> str:
#         """Convert AST node type to human-readable form."""
#         humanized = {
#             'FunctionDef': 'function definition',
#             'AsyncFunctionDef': 'async function',
#             'Return': 'return statement',
#             'Assign': 'assignment',
#             'AugAssign': 'augmented assignment (+=, -=, etc.)',
#             'For': 'for loop',
#             'While': 'while loop',
#             'If': 'if statement',
#             'BinOp': 'binary operation',
#             'UnaryOp': 'unary operation',
#             'Compare': 'comparison',
#             'Call': 'function call',
#             'Name': 'variable',
#             'Constant': 'constant value',
#             'List': 'list',
#             'Dict': 'dictionary',
#             'ListComp': 'list comprehension',
#             'Expr': 'expression statement',
#             'Pass': 'pass statement',
#             'Break': 'break statement',
#             'Continue': 'continue statement',
#         }
#         return humanized.get(node_type, node_type)
    
#     def _humanize_field(self, field_name: str) -> str:
#         """Convert field name to human-readable form."""
#         humanized = {
#             'body': 'code block',
#             'orelse': 'else clause',
#             'args': 'arguments',
#             'targets': 'assignment targets',
#             'test': 'condition',
#             'iter': 'iterable',
#             'target': 'loop variable',
#             'func': 'function being called',
#             'comparators': 'values being compared',
#         }
#         return humanized.get(field_name, field_name)
    
#     def _get_type_suggestion(self, student_type: str, reference_type: str) -> str:
#         """Generate a helpful suggestion for type mismatches."""
#         suggestions = {
#             ('Expr', 'Return'): "Did you forget to return the result? Use 'return' instead of just computing the value.",
#             ('Pass', 'Return'): "Replace 'pass' with a return statement.",
#             ('While', 'For'): "Consider using a 'for' loop for cleaner iteration.",
#             ('For', 'While'): "A 'while' loop might be more appropriate here.",
#             ('Call', 'Return'): "You're calling a function but not returning its result.",
#         }
#         return suggestions.get((student_type, reference_type), 
#                                f"Expected {self._humanize_type(reference_type)}")
    
#     def _get_missing_suggestion(self, field_name: str, child: Any) -> str:
#         """Generate suggestion for missing node."""
#         if field_name == 'body':
#             return "Add the required code inside this block"
#         elif field_name == 'orelse':
#             return "You might need an 'else' clause"
#         elif field_name == 'args':
#             return "Check that you're passing the right arguments"
#         return f"Add the missing {self._humanize_field(field_name)}"


# # =============================================================================
# # Pattern Matcher - Checks for required/forbidden patterns
# # =============================================================================

# class PatternMatcher:
#     """
#     Checks AST for required patterns and detects forbidden patterns.
#     Uses path expressions like "FunctionDef > For > If" to match structures.
#     """
    
#     def __init__(self):
#         self.found_patterns: Set[str] = set()
    
#     def find_patterns(self, node: NormalizedNode, pattern: str) -> List[str]:
#         """
#         Find all occurrences of a pattern in the AST.
#         Pattern format: "NodeType > ChildType > GrandchildType"
#         """
#         pattern_parts = [p.strip() for p in pattern.split('>')]
#         matches = []
#         self._search_pattern(node, pattern_parts, 0, [], matches)
#         return matches
    
#     def _search_pattern(self, node: NormalizedNode, pattern_parts: List[str], 
#                         pattern_idx: int, current_path: List[str], matches: List[str]):
#         """Recursively search for pattern matches."""
#         if pattern_idx >= len(pattern_parts):
#             matches.append(' > '.join(current_path))
#             return
        
#         target_type = pattern_parts[pattern_idx]
        
#         if node.type == target_type:
#             current_path.append(f"{node.type}@{node.path}")
#             # Continue searching children for next pattern part
#             for key, child in node.children.items():
#                 if isinstance(child, list):
#                     for c in child:
#                         if isinstance(c, NormalizedNode):
#                             self._search_pattern(c, pattern_parts, pattern_idx + 1, 
#                                                 current_path.copy(), matches)
#                 elif isinstance(child, NormalizedNode):
#                     self._search_pattern(child, pattern_parts, pattern_idx + 1,
#                                         current_path.copy(), matches)
        
#         # Also search children at same pattern index (pattern can start anywhere)
#         for key, child in node.children.items():
#             if isinstance(child, list):
#                 for c in child:
#                     if isinstance(c, NormalizedNode):
#                         self._search_pattern(c, pattern_parts, pattern_idx, [], matches)
#             elif isinstance(child, NormalizedNode):
#                 self._search_pattern(child, pattern_parts, pattern_idx, [], matches)
    
#     def check_required_nodes(self, node: NormalizedNode, required: List[str]) -> List[str]:
#         """Check that all required node types exist in the AST."""
#         found_types = self._collect_types(node)
#         missing = [r for r in required if r not in found_types]
#         return missing
    
#     def _collect_types(self, node: NormalizedNode) -> Set[str]:
#         """Collect all node types in the AST."""
#         types = {node.type}
#         for key, child in node.children.items():
#             if isinstance(child, list):
#                 for c in child:
#                     if isinstance(c, NormalizedNode):
#                         types.update(self._collect_types(c))
#             elif isinstance(child, NormalizedNode):
#                 types.update(self._collect_types(child))
#         return types


# # =============================================================================
# # Main API Functions
# # =============================================================================

# def normalize_code(source_code: str) -> Dict:
#     """Parse and normalize Python source code into a comparable AST."""
#     try:
#         tree = ast.parse(source_code)
#         normalizer = ASTNormalizer()
#         normalized = normalizer.normalize(tree)
#         return {
#             "success": True,
#             "ast": normalized.to_dict(),
#             "error": None
#         }
#     except SyntaxError as e:
#         return {
#             "success": False,
#             "ast": None,
#             "error": f"Syntax error at line {e.lineno}: {e.msg}"
#         }
#     except Exception as e:
#         return {
#             "success": False,
#             "ast": None,
#             "error": str(e)
#         }


# def compare_ast(student_code: str, reference_code: str, 
#                 flexibility: Optional[Dict] = None) -> Dict:
#     """
#     Compare student code against a golden reference.
    
#     Args:
#         student_code: The student's Python code
#         reference_code: The golden reference implementation
#         flexibility: Optional rules for flexible matching
    
#     Returns:
#         Comparison result with divergence details
#     """
#     try:
#         # Parse both codes
#         student_tree = ast.parse(student_code)
#         reference_tree = ast.parse(reference_code)
        
#         # Normalize both ASTs
#         normalizer = ASTNormalizer()
#         student_normalized = normalizer.normalize(student_tree)
        
#         normalizer2 = ASTNormalizer()
#         reference_normalized = normalizer2.normalize(reference_tree)
        
#         # Compare
#         comparator = ASTComparator(flexibility or {})
#         result = comparator.compare(student_normalized, reference_normalized)
        
#         return {
#             "success": True,
#             "result": result.to_dict(),
#             "error": None
#         }
    
#     except SyntaxError as e:
#         return {
#             "success": False,
#             "result": None,
#             "error": f"Syntax error in {'student' if 'student' in str(e) else 'reference'} code at line {e.lineno}: {e.msg}"
#         }
#     except Exception as e:
#         return {
#             "success": False,
#             "result": None,
#             "error": str(e)
#         }


# def check_patterns(source_code: str, required_patterns: List[str] = None,
#                    forbidden_patterns: List[str] = None,
#                    required_nodes: List[str] = None) -> Dict:
#     """
#     Check if code matches required patterns and avoids forbidden ones.
    
#     Args:
#         source_code: Python code to check
#         required_patterns: Patterns that must exist (e.g., "FunctionDef > For > If")
#         forbidden_patterns: Patterns that must not exist
#         required_nodes: Node types that must exist somewhere
    
#     Returns:
#         Pattern check results with any violations
#     """
#     try:
#         tree = ast.parse(source_code)
#         normalizer = ASTNormalizer()
#         normalized = normalizer.normalize(tree)
        
#         matcher = PatternMatcher()
#         violations = []
        
#         # Check required patterns
#         if required_patterns:
#             for pattern in required_patterns:
#                 matches = matcher.find_patterns(normalized, pattern)
#                 if not matches:
#                     violations.append({
#                         "type": "missing_pattern",
#                         "pattern": pattern,
#                         "message": f"Required pattern '{pattern}' not found in your code"
#                     })
        
#         # Check forbidden patterns
#         if forbidden_patterns:
#             for pattern in forbidden_patterns:
#                 matches = matcher.find_patterns(normalized, pattern)
#                 if matches:
#                     violations.append({
#                         "type": "forbidden_pattern",
#                         "pattern": pattern,
#                         "found_at": matches,
#                         "message": f"Forbidden pattern '{pattern}' detected in your code"
#                     })
        
#         # Check required nodes
#         if required_nodes:
#             missing = matcher.check_required_nodes(normalized, required_nodes)
#             for node_type in missing:
#                 violations.append({
#                     "type": "missing_node",
#                     "node_type": node_type,
#                     "message": f"Required '{node_type}' not found in your code"
#                 })
        
#         return {
#             "success": True,
#             "passes": len(violations) == 0,
#             "violations": violations
#         }
    
#     except SyntaxError as e:
#         return {
#             "success": False,
#             "passes": False,
#             "violations": [],
#             "error": f"Syntax error at line {e.lineno}: {e.msg}"
#         }
#     except Exception as e:
#         return {
#             "success": False,
#             "passes": False,
#             "violations": [],
#             "error": str(e)
#         }


# # For direct testing
# if __name__ == "__main__":
#     student = """
# def sum_numbers(a, b):
#     return a + b
# """
    
#     reference = """
# def sum_numbers(a, b):
#     return a + b
# """
    
#     result = compare_ast(student, reference)
#     print(json.dumps(result, indent=2))