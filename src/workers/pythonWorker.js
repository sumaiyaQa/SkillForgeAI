// Python Worker for Code Execution + AST Hint Analysis

// This Web Worker executes Python code in a sandboxed
// Pyodide environment and performs lightweight static analysis using Python's AST module.

importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide = null;

// EMBEDDED PYTHON AST ANALYSER


//  The analyser is embedded directly into the worker to keep the execution environment self-contained and deterministic.
//  It performs static checks only, no code execution.
 
const ANALYZER_SOURCE = `
import ast

def analyze_code(source_code):
    hints = []
    raw_matches = []

    try:
        tree = ast.parse(source_code)

        //RULE 1: Infinite while True loop (CRITICAL)
       
        for node in ast.walk(tree):
            if isinstance(node, ast.While):
                if isinstance(node.test, ast.Constant) and node.test.value is True:
                    has_break = any(isinstance(n, ast.Break) for n in ast.walk(node))
                    if not has_break:
                        raw_matches.append({
                            "severity": "CRITICAL",
                            "type": "infinite_loop"
                        })
                        hints.append(
                            "🚨 This while loop has no exit condition. "
                            "Add a break statement or use a conditional loop."
                        )

        // RULE 2: Function prints instead of returns
         
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

        // RULE 3: Hard-coded return value
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Return) and isinstance(node.value, ast.Constant):
                hints.append(
                    "🚨 A constant value is returned. "
                    "Make sure your solution works for all possible inputs."
                )

    // RULE 4: Function defined but never called
        
        has_function = any(isinstance(n, ast.FunctionDef) for n in ast.walk(tree))
        has_top_level_call = any(
            isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
            for n in tree.body
        )

        if has_function and not has_top_level_call:
            hints.append(
                "💡 You have defined a function, but it is never called. "
                "Try calling the function to see its output."
            )

        return {
            "hints": hints,
            "summary": {
                "total_issues": len(hints)
            },
            "raw_matches": raw_matches
        }

    except SyntaxError as e:
        return {
            "hints": [
                f"🚨 Syntax error on line {e.lineno}: {e.msg}"
            ],
            "summary": {
                "total_issues": 1
            },
            "raw_matches": []
        }
`;

// PYODIDE INITIALISATION (RUNS ONCE)

// loads the Pyodide runtime and registers the embedded AST analyser as a Python module.
 
async function getPyodideInstance() {
  if (!pyodide) {
    pyodide = await loadPyodide();
    pyodide.FS.writeFile('analyzer_lib.py', ANALYZER_SOURCE);
  }
  return pyodide;
}

// WORKER MESSAGE HANDLER


// Receives Python source code from the main thread, performs static analysis first, then executes the code if it is considered safe.
 
self.onmessage = async (event) => {
  const { code } = event.data;
  const instance = await getPyodideInstance();

  let output = '';
  let error = '';
  let hints = [];
  let summary = {};

  try {

// STATIC ANALYSIS (AST-based)
        
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

   
    // STDOUT / STDERR CAPTURE

    await instance.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    // RUNTIME EXECUTION

    try {
      await instance.runPythonAsync(code);
      output = instance.runPython('sys.stdout.getvalue()');
      error = instance.runPython('sys.stderr.getvalue()');
    } catch (runtimeErr) {
      error = runtimeErr.toString();

      // Common recursion failure case
      if (error.includes('RecursionError')) {
        hints.push(
          '🚨 Infinite recursion detected.',
          'Ensure your function has a base case that stops recursion.'
        );
      }
    }
  } catch (err) {
    error = err.toString();
  }

// RETURN RESULT TO UI

  self.postMessage({
    output,
    error,
    hints,
    summary,
  });
};
