// Python Worker for Safe Execution + AST-Based Feedback
importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide = null;

const ANALYZER_SOURCE = `
import ast
import json

def analyze_code(source_code):
    hints = []
    raw_matches = []
    try:
        tree = ast.parse(source_code)
        
        # RULE 1: Infinite while True loop (CRITICAL)
        for node in ast.walk(tree):
            if isinstance(node, ast.While):
                if isinstance(node.test, ast.Constant) and node.test.value is True:
                    has_exit = any(isinstance(n, ast.Break) for n in ast.walk(node))
                    if not has_exit:
                        raw_matches.append({"severity": "CRITICAL"})
                        hints.append("🚨 This while loop has no exit condition. Add a break statement.")

        # RULE 2: Function prints instead of returning
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                has_print = any(isinstance(n, ast.Call) and getattr(n.func, "id", None) == "print" for n in ast.walk(node))
                if has_print and not has_return:
                    hints.append(f"💡 Function '{node.name}' prints a value but does not return it.")

        # RULE 3: Hard-coded return value
        for node in ast.walk(tree):
            if isinstance(node, ast.Return) and isinstance(node.value, ast.Constant):
                hints.append("🚨 A constant value is returned. Ensure your solution works for all inputs.")

                # --- ADVANCED STRUCTURAL CHECKS ---
        
        # Problem 26: Detecting count() instead of Stack
        if "is_balanced" in source_code:
            for node in ast.walk(tree):
                if isinstance(node, ast.Attribute) and node.attr == "count":
                    add_unique_hint("🚀 Pro Tip: Using count() doesn't track bracket order. Use a Stack data structure.")

        # Problem 30: Detecting O(n^2) search
        if "find_missing" in source_code:
            for node in ast.walk(tree):
                if isinstance(node, (ast.For, ast.While)):
                    if any(isinstance(n, ast.Compare) and any(isinstance(op, ast.In) for op in n.ops) for n in ast.walk(node)):
                        add_unique_hint("🐢 Performance: Searching 'in' a list inside a loop is slow. Try the sum formula formula: n*(n+1)/2.")
        return {
            "hints": hints,
            "summary": { "total_issues": len(hints) },
            "raw_matches": raw_matches
        }
    except SyntaxError as e:
        return {
            "hints": [f"🚨 Syntax error on line {e.lineno}: {e.msg}"],
            "summary": { "total_issues": 1 },
            "raw_matches": []
        }
`;

async function getPyodideInstance() {
  if (!pyodide) {
    pyodide = await loadPyodide();
    pyodide.FS.writeFile('analyzer_lib.py', ANALYZER_SOURCE);
    await pyodide.runPythonAsync(`
import sys
from io import StringIO
if '' not in sys.path:
    sys.path.append('')
    `);
  }
  return pyodide;
}

self.onmessage = async (event) => {
  const { code, testCases, functionName } = event.data;
  const instance = await getPyodideInstance();

  let hints = [];
  let summary = {};
  let passed = undefined;

  try {
    // 1. STATIC ANALYSIS
    const analysisJson = await instance.runPythonAsync(`
import json
from analyzer_lib import analyze_code
json.dumps(analyze_code(${JSON.stringify(code)}))
    `);
    const analysis = JSON.parse(analysisJson);
    hints = analysis.hints || [];
    summary = analysis.summary || {};

    if (analysis.raw_matches?.some(m => m.severity === 'CRITICAL')) {
      self.postMessage({ output: '', error: 'Execution blocked: infinite loop detected.', hints, summary, passed: false });
      return;
    }

    // 2. SETUP CAPTURE & EXECUTE USER CODE
    await instance.runPythonAsync(`
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    try {
      await instance.runPythonAsync(code);
    } catch (runErr) {
      self.postMessage({
        output: instance.runPython('sys.stdout.getvalue()'),
        error: runErr.toString(),
        passed: false,
        hints,
        summary
      });
      return;
    }

    // 3. SNAPSHOT USER OUTPUT (This is what they see in the console)
    const finalUserOutput = instance.runPython('sys.stdout.getvalue()');
    const finalUserError = instance.runPython('sys.stderr.getvalue()');

    // 4. BACKGROUND GRADING
    if (functionName && testCases) {
      passed = true;
      for (const tc of testCases) {
        // Reset buffers for clean test evaluation
        await instance.runPythonAsync(`
sys.stdout = StringIO()
sys.stderr = StringIO()
        `);

        try {
          const result = await instance.runPythonAsync(`${functionName}(${tc.input})`);
          const capturedOut = instance.runPython('sys.stdout.getvalue()').trim();

          // Use return value if present, otherwise use captured stdout
          const finalResult = (result !== undefined && result !== null)
            ? String(result).trim()
            : capturedOut;

          if (finalResult !== tc.output.trim()) {
            passed = false;
            break;
          }
        } catch (testErr) {
          passed = false;
          break;
        }
      }
    }

    // 5. RESPOND WITH SNAPSHOTTED DATA
    self.postMessage({
      output: finalUserOutput,
      error: finalUserError,
      hints,
      summary,
      passed
    });

  } catch (err) {
    self.postMessage({ output: '', error: err.toString(), hints: [], summary: {}, passed: false });
  }
};