import ast
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum, auto

# ===============================
# ENUMS
# ===============================

class Severity(Enum):
    INFO = auto()
    WARNING = auto()
    ERROR = auto()
    CRITICAL = auto()

class Category(Enum):
    CONTROL_FLOW = "Control Flow"
    FUNCTIONS = "Functions"
    LOGIC = "Logic"
    DATA = "Data Structures"

# ===============================
# RESULT MODEL
# ===============================

@dataclass
class Hint:
    id: str
    message: str
    suggestion: str
    severity: Severity
    line: Optional[int]
    category: Category

# ===============================
# CORE ANALYZER
# ===============================

class SimpleAnalyzer(ast.NodeVisitor):
    """
    BSc-safe AST analyzer.
    Focuses on EDUCATIONAL mistakes, not grading.
    """

    def __init__(self):
        self.hints: List[Hint] = []

    # ---------- CONTROL FLOW ----------

    def visit_While(self, node: ast.While):
        # Infinite loop
        if isinstance(node.test, ast.Constant) and node.test.value is True:
            has_exit = any(isinstance(n, (ast.Break, ast.Return)) for n in ast.walk(node))
            if not has_exit:
                self._add(
                    "CF001",
                    "This while loop has no exit condition",
                    "Add a break statement or use a condition instead of 'while True'",
                    Severity.CRITICAL,
                    node,
                    Category.CONTROL_FLOW
                )
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        # range(len(x))
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
                if child.func.id == "range" and len(child.args) == 1:
                    arg = child.args[0]
                    if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                        if arg.func.id == "len":
                            self._add(
                                "CF002",
                                "Using range(len(x)) is not Pythonic",
                                "Use: for i, item in enumerate(x):",
                                Severity.WARNING,
                                child,
                                Category.CONTROL_FLOW
                            )
        self.generic_visit(node)

    # ---------- FUNCTIONS ----------

    def visit_FunctionDef(self, node: ast.FunctionDef):
        has_print = False
        has_return = False

        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
                if child.func.id == "print":
                    has_print = True
            if isinstance(child, ast.Return) and child.value is not None:
                has_return = True

        if has_print and not has_return:
            self._add(
                "FN001",
                f"Function '{node.name}' prints instead of returning a value",
                "Return the value instead of printing it",
                Severity.WARNING,
                node,
                Category.FUNCTIONS
            )

        # Mutable default argument
        for default in node.args.defaults:
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                self._add(
                    "FN002",
                    "Mutable default argument detected",
                    "Use None as default and create the list inside the function",
                    Severity.ERROR,
                    node,
                    Category.FUNCTIONS
                )

        self.generic_visit(node)

    # ---------- LOGIC ----------

    def visit_Compare(self, node: ast.Compare):
        # x == True
        if len(node.ops) == 1 and isinstance(node.ops[0], ast.Eq):
            if isinstance(node.comparators[0], ast.Constant):
                if node.comparators[0].value in (True, False):
                    self._add(
                        "LG001",
                        "Comparing directly to True or False is unnecessary",
                        "Use: if x:  or  if not x:",
                        Severity.INFO,
                        node,
                        Category.LOGIC
                    )
        self.generic_visit(node)

    def visit_Constant(self, node: ast.Constant):
        # Hardcoded answers
        if isinstance(node.value, int) and abs(node.value) > 10:
            parent = getattr(node, "parent", None)
            if isinstance(parent, ast.Return):
                self._add(
                    "LG002",
                    "Hardcoded return value detected",
                    "Compute the result instead of returning a fixed number",
                    Severity.ERROR,
                    node,
                    Category.LOGIC
                )

    # ---------- HELPERS ----------

    def _add(self, pid, msg, sugg, sev, node, cat):
        self.hints.append(
            Hint(
                id=pid,
                message=msg,
                suggestion=sugg,
                severity=sev,
                line=getattr(node, "lineno", None),
                category=cat
            )
        )

# ===============================
# PUBLIC API
# ===============================

def analyze_code(source: str) -> Dict:
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            for child in ast.iter_child_nodes(node):
                child.parent = node

        analyzer = SimpleAnalyzer()
        analyzer.visit(tree)

        # Sort by severity and cap hints
        analyzer.hints.sort(key=lambda h: h.severity.value, reverse=True)
        capped = analyzer.hints[:3]

        return {
            "success": True,
            "hints": [
                f"{_icon(h.severity)} [{h.id}] {h.message}\n→ {h.suggestion}"
                + (f" (line {h.line})" if h.line else "")
                for h in capped
            ],
            "raw_matches": [
                {
                    "id": h.id,
                    "severity": h.severity.name,
                    "category": h.category.value
                }
                for h in capped
            ],
            "summary": {
                "total_issues": len(analyzer.hints)
            }
        }

    except SyntaxError as e:
        return {
            "success": False,
            "error": f"Syntax error at line {e.lineno}",
            "hints": [f"🚨 Syntax error: {e.msg} (line {e.lineno})"]
        }

def _icon(sev: Severity) -> str:
    return {
        Severity.INFO: "💡",
        Severity.WARNING: "⚠️",
        Severity.ERROR: "❌",
        Severity.CRITICAL: "🚨"
    }[sev]
