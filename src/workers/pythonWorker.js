importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodide = null;

self.onmessage = async (event) => {
  const { code } = event.data;

  if (!pyodide) {
    try {
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });
    } catch (err) {
      self.postMessage({
        output: "",
        error: "Failed to load Python environment: " + err.message,
        hints: [],
        steps: [],
      });
      return;
    }
  }

  let output = "";
  let error = "";
  let hints = [];
  let steps = [];

  // Static Analysis
  try {
    const escapedCode = code.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
    
    const result = pyodide.runPython(`
import ast

def analyze(src):
    try:
        tree = ast.parse(src)
    except SyntaxError as e:
        return [f"Syntax error: {str(e)}"]
    
    assigned = set()
    hints = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    assigned.add(t.id)

    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            if node.id not in assigned and node.id not in dir(__builtins__):
                hints.append(f"Variable '{node.id}' used before assignment.")

        if isinstance(node, ast.While):
            if isinstance(node.test, ast.Constant) and node.test.value is True:
                if not any(isinstance(n, ast.Break) for n in ast.walk(node)):
                    hints.append("Infinite loop detected (while True with no break).")

    return hints

analyze("""${escapedCode}""")
    `);
    hints = result.toJs ? result.toJs() : [];
  } catch (e) {
    console.error("Static analysis failed:", e);
    hints = [];
  }

  // Block execution for infinite loops
  if (hints.some(h => h.includes("Infinite loop"))) {
    self.postMessage({
      output: "",
      error: "Execution blocked: infinite loop detected.",
      hints,
      steps: [],
    });
    return;
  }

  // Execute code
  try {
    pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    pyodide.runPython(code);

    output = pyodide.runPython("sys.stdout.getvalue()");
    error = pyodide.runPython("sys.stderr.getvalue()");
  } catch (e) {
    error = e.toString();
  }

  self.postMessage({
    output,
    error,
    hints,
    steps: [],
  });
};