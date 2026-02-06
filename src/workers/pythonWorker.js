/* =========================================================
   Python Worker for Code Execution + AST Hint Analysis
   BSc Software Engineering – Final Submission Version
   ========================================================= */

importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodide = null;

/* =========================================================
   Minimal Python AST Analyzer (loaded into Pyodide FS)
   ========================================================= */

const ANALYZER_SOURCE = `
import ast

def analyze_code(source_code):
    hints = []
    raw_matches = []

    try:
        tree = ast.parse(source_code)

        # ----------------------------------------
        # RULE 1: Infinite while True loop (CRITICAL)
        # ----------------------------------------
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

        # ----------------------------------------
        # RULE 2: Function prints instead of returns
        # ----------------------------------------
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

        # ----------------------------------------
        # RULE 3: Hard-coded return value
        # ----------------------------------------
        for node in ast.walk(tree):
            if isinstance(node, ast.Return) and isinstance(node.value, ast.Constant):
                hints.append(
                    "🚨 A constant value is returned. "
                    "Make sure your solution works for all possible inputs."
                )

        # ----------------------------------------
        # RULE 4: No output produced
        # ----------------------------------------
        has_print = any(
            isinstance(n, ast.Call) and getattr(n.func, "id", None) == "print"
            for n in ast.walk(tree)
        )

        if not has_print:
            hints.append(
                "💡 Your program runs but does not display any output. "
                "Use print() to show results."
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



/* =========================================================
   Initialise Pyodide (runs once)
   ========================================================= */

async function getPyodideInstance() {
    if (!pyodide) {
        pyodide = await loadPyodide();

        // astHints.py must exist in the virtual FS
        // (this file is bundled by your app build)
        // We create a tiny wrapper so we can import cleanly
        pyodide.FS.writeFile("analyzer_lib.py", ANALYZER_SOURCE);
    }
    return pyodide;
}

/* =========================================================
   Worker Message Handler
   ========================================================= */

self.onmessage = async (event) => {
    const { code } = event.data;
    const instance = await getPyodideInstance();

    let output = "";
    let error = "";
    let hints = [];
    let summary = {};

    try {
        /* ---------------------------------------------
           1. Run AST analysis FIRST
           --------------------------------------------- */

        const analysisJson = await instance.runPythonAsync(`
import json
from analyzer_lib import analyze_code
json.dumps(analyze_code(${JSON.stringify(code)}))
        `);

        const analysis = JSON.parse(analysisJson);

        hints = analysis.hints || [];
        summary = analysis.summary || {};

        // Block execution if CRITICAL issue exists
        const hasCritical = analysis.raw_matches?.some(
            m => m.severity === "CRITICAL"
        );

        if (hasCritical) {
            self.postMessage({
                output: "",
                error: "Execution blocked: potential infinite loop detected.",
                hints,
                summary
            });
            return;
        }

        /* ---------------------------------------------
           2. Capture stdout / stderr
           --------------------------------------------- */

        await instance.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
        `);

        /* ---------------------------------------------
           3. Execute user code
           --------------------------------------------- */

        await instance.runPythonAsync(code);

        output = instance.runPython("sys.stdout.getvalue()");
        error = instance.runPython("sys.stderr.getvalue()");

    } catch (err) {
        error = err.toString();
    }

    /* ---------------------------------------------
       4. Return result to UI
       --------------------------------------------- */

    self.postMessage({
        output,
        error,
        hints,
        summary
    });
};
