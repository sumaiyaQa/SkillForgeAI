import ast

class HintCollector(ast.NodeVisitor):
    def __init__(self):
        self.hints = []
        self.assigned_vars = set()

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.assigned_vars.add(target.id)
        self.generic_visit(node)

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            if node.id not in self.assigned_vars and node.id not in dir(__builtins__):
                self.hints.append(
                    f"Variable '{node.id}' is used before being assigned a value."
                )
        self.generic_visit(node)

    def visit_While(self, node):
        if isinstance(node.test, ast.Constant) and node.test.value is True:
            has_break = any(isinstance(n, ast.Break) for n in ast.walk(node))
            if not has_break:
                self.hints.append(
                    "This 'while True' loop has no break statement and may run forever."
                )
        self.generic_visit(node)

    def visit_For(self, node):
        if isinstance(node.body[-1], ast.Expr):
            self.hints.append(
                "Check whether this loop is printing values unintentionally."
            )
        self.generic_visit(node)


def analyze_code(source_code):
    try:
        tree = ast.parse(source_code)
        collector = HintCollector()
        collector.visit(tree)
        return collector.hints
    except SyntaxError as e:
        return [f"Syntax error detected: {e.msg}"]
