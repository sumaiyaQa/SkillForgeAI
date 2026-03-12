// Python Worker for Safe Execution + AST-Based Feedback
importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide = null;

const ANALYZER_SOURCE = `
import ast
import json

def analyze_code(source_code):
    hints = []
    raw_matches = []

    def add_unique_hint(msg):
        if msg not in hints:
            hints.append(msg)

    try:
        tree = ast.parse(source_code)

        # RULE 1: Infinite while True loop
        for node in ast.walk(tree):
            if isinstance(node, ast.While):
                if isinstance(node.test, ast.Constant) and node.test.value is True:
                    has_exit = any(isinstance(n, ast.Break) for n in ast.walk(node))
                    if not has_exit:
                        raw_matches.append({"severity": "CRITICAL"})
                        add_unique_hint("🚨 This while loop has no exit condition. Add a break statement.")

        # RULE 2: Function prints instead of returning
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                has_print = any(
                    isinstance(n, ast.Call) and getattr(n.func, "id", None) == "print"
                    for n in ast.walk(node)
                )
                if has_print and not has_return:
                    add_unique_hint(f"💡 Function '{node.name}' prints instead of returning a value.")

        # RULE 3: Hardcoded bare constant return (not bool, not ternary, not None)
        for node in ast.walk(tree):
            if isinstance(node, ast.Return):
                val = node.value
                if (
                    isinstance(val, ast.Constant)
                    and not isinstance(val.value, bool)
                    and not isinstance(val.value, type(None))
                ):
                    add_unique_hint("🚨 A constant value is returned. Ensure your solution works for all inputs.")
                elif isinstance(val, ast.IfExp):
                    pass
        # RULE 4: Function only contains pass
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                    add_unique_hint(f"⚠️ Function '{node.name}' is not implemented yet.")

        # RULE 5: Recursive function without base case
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                calls_self = any(
                    isinstance(n, ast.Call) and getattr(n.func, "id", None) == node.name
                    for n in ast.walk(node)
                )
                has_if = any(isinstance(n, ast.If) for n in ast.walk(node))
                if calls_self and not has_if:
                    add_unique_hint(f"🔁 Recursive function '{node.name}' may be missing a base case.")

        # RULE 6: Nested loops (O(n²))
        for node in ast.walk(tree):
            if isinstance(node, ast.For):
                for child in ast.walk(node):
                    if isinstance(child, ast.For) and child != node:
                        add_unique_hint("🐢 Nested loops detected. Consider time complexity (O(n²)).")

        # RULE 7: Using built-in sort()
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute) and node.attr == "sort":
                add_unique_hint("🚀 Built-in sort() detected. Try implementing the algorithm manually.")

        # RULE 8: Function without return
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                if not has_return:
                    add_unique_hint(f"⚠️ Function '{node.name}' does not return any value.")

        # RULE 9: Hardcoded factorial example
        if "factorial" in source_code and "5" in source_code:
            add_unique_hint("⚠️ Avoid hardcoding example values like 5.")

        # RULE 10: Unused parameters
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                param_names = [arg.arg for arg in node.args.args]
                used_names = [n.id for n in ast.walk(node) if isinstance(n, ast.Name)]
                for param in param_names:
                    if param not in used_names:
                        add_unique_hint(f"⚠️ Parameter '{param}' is defined but never used.")

        return {
            "hints": hints,
            "summary": {"total_issues": len(hints)},
            "raw_matches": raw_matches
        }

    except SyntaxError as e:
        return {
            "hints": [f"🚨 Syntax error: {e.msg} (line {e.lineno})"],
            "summary": {"total_issues": 1},
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

                    // Only accept explicit return values — do NOT fall back to stdout.
                    // This correctly fails functions that print instead of return.
                    const finalResult = (result !== undefined && result !== null && String(result).trim() !== 'None')
                        ? String(result).trim()
                        : '__NO_RETURN__';

                    if (finalResult.toLowerCase() !== tc.output.trim().toLowerCase()) {
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