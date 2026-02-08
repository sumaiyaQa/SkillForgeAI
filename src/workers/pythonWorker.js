
//    Python Worker for Safe Execution + AST-Based Feedback

//    Responsibilities:
//    1. Perform lightweight static analysis using Python AST
//    2. Block unsafe execution (e.g. infinite loops)
//    3. Execute Python code in a sandboxed Pyodide environment

//    This worker provides formative feedback only.
//    It does NOT perform grading or correctness evaluation.

importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide = null;

// EMBEDDED AST ANALYSER (SINGLE SOURCE OF TRUTH)
    

// This analyser is intentionally lightweight and focuses on common educational mistakes. It runs before execution to ensure safety and provide helpful hints.
 
const ANALYZER_SOURCE = `
import ast

def analyze_code(source_code):
    hints = []
    raw_matches = []

    try:
        tree = ast.parse(source_code)

       #RULE 1: Infinite while True loop (CRITICAL)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.While):
                if isinstance(node.test, ast.Constant) and node.test.value is True:
                    has_exit = any(isinstance(n, ast.Break) for n in ast.walk(node))
                    if not has_exit:
                        raw_matches.append({"severity": "CRITICAL"})
                        hints.append(
                            "🚨 This while loop has no exit condition. "
                            "Add a break statement or use a conditional loop."
                        )

        #RULE 2: Function prints instead of returning
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                has_print = any(
                    isinstance(n, ast.Call) and getattr(n.func, "id", None) == "print"
                    for n in ast.walk(node)
                )
                if has_print and not has_return:
                    hints.append(
                        f"💡 Function '{node.name}' prints a value but does not return it. "
                        "Tests usually expect a return value."
                    )

    #RULE 3: Hard-coded return value
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Return) and isinstance(node.value, ast.Constant):
                hints.append(
                    "🚨 A constant value is returned. "
                    "Ensure your solution works for all valid inputs."
                )

        #RULE 4: Function defined but never called

        has_function = any(isinstance(n, ast.FunctionDef) for n in ast.walk(tree))
        has_top_call = any(
            isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
            for n in tree.body
        )

        if has_function and not has_top_call:
            hints.append(
                "💡 You defined a function but never called it. "
                "Try calling the function to see its output."
            )

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

// PYODIDE INITIALISATION (RUNS ONCE)

// Loads Pyodide lazily and registers the AST analyser.

async function getPyodideInstance() {
  if (!pyodide) {
    pyodide = await loadPyodide();
    pyodide.FS.writeFile('analyzer_lib.py', ANALYZER_SOURCE);
  }
  return pyodide;
}

// WORKER MESSAGE HANDLER
// Receives Python source code, performs static analysis, and executes the code only if it is considered safe.
 
self.onmessage = async (event) => {
  const { code } = event.data;
  const instance = await getPyodideInstance();

  let output = '';
  let error = '';
  let hints = [];
  let summary = {};

  try {

// 1. STATIC ANALYSIS (AST)

    const analysisJson = await instance.runPythonAsync(`
import json
from analyzer_lib import analyze_code
json.dumps(analyze_code(${JSON.stringify(code)}))
    `);

    const analysis = JSON.parse(analysisJson);
    hints = analysis.hints || [];
    summary = analysis.summary || {};

    const hasCritical = analysis.raw_matches?.some(
      (m) => m.severity === 'CRITICAL'
    );

    // Block execution if a critical issue is detected
    if (hasCritical) {
      self.postMessage({
        output: '',
        error: 'Execution blocked: potential infinite loop detected.',
        hints,
        summary,
      });
      return;
    }

// 2. CAPTURE STDOUT / STDERR

    await instance.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

// 3. EXECUTE USER CODE

    try {
      await instance.runPythonAsync(code);
      output = instance.runPython('sys.stdout.getvalue()');
      error = instance.runPython('sys.stderr.getvalue()');
    } catch (runtimeErr) {
      error = runtimeErr.toString();

      if (error.includes('RecursionError')) {
        hints.push(
          '🚨 Infinite recursion detected.',
          'Ensure your function has a valid base case.'
        );
      }
    }
  } catch (err) {
    error = err.toString();
  }

// 4. RETURN RESULT TO UI

  self.postMessage({
    output,
    error,
    hints,
    summary,
  });
};
