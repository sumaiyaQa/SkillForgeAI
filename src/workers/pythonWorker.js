// Python Worker for Safe Execution + AST-Based Feedback
importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide = null;

const ANALYZER_SOURCE = `
import ast
import json

def analyze_code(source_code):
    hints = []
    raw_matches = []
    print_only_functions = set()
    parents = {}

    def add_unique_hint(msg):
        if msg not in hints:
            hints.append(msg)

    try:
        tree = ast.parse(source_code)
        for parent in ast.walk(tree):
            for child in ast.iter_child_nodes(parent):
                parents[child] = parent

        def get_ancestor(node, target_type):
            current = parents.get(node)
            while current is not None:
                if isinstance(current, target_type):
                    return current
                current = parents.get(current)
            return None

        def is_inside_conditional(node):
            current = parents.get(node)
            while current is not None:
                if isinstance(current, (ast.If, ast.IfExp, ast.Match)):
                    return True
                current = parents.get(current)
            return False

    # Check for infinite while loops that never exit
        for node in ast.walk(tree):
            if isinstance(node, ast.While):
                if isinstance(node.test, ast.Constant) and node.test.value is True:
                    has_exit = any(isinstance(n, ast.Break) for n in ast.walk(node))
                    if not has_exit:
                        raw_matches.append({"severity": "CRITICAL"})
                        add_unique_hint("🚨 This while loop has no exit condition. Add a break statement.")

        # Make sure functions return values instead of just printing
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                has_print = any(
                    isinstance(n, ast.Call) and getattr(n.func, "id", None) == "print"
                    for n in ast.walk(node)
                )
                if has_print and not has_return:
                    print_only_functions.add(node.name)
                    add_unique_hint(f"💡 Function '{node.name}' prints instead of returning a value.")

        # Warn about hardcoded return values that don't work for all inputs
        for node in ast.walk(tree):
            if isinstance(node, ast.Return):
                val = node.value
                parent_fn = get_ancestor(node, ast.FunctionDef)
                if parent_fn is None:
                    continue

                # If the function has no parameters, returning a constant can be intentional.
                if len(parent_fn.args.args) == 0:
                    continue

                # Base cases often return constants from conditional branches.
                if is_inside_conditional(node):
                    continue

                if (
                    isinstance(val, ast.Constant)
                    and not isinstance(val.value, bool)
                    and not isinstance(val.value, type(None))
                ):
                    add_unique_hint("🚨 A constant value is returned. Ensure your solution works for all inputs.")
                elif isinstance(val, ast.IfExp):
                    pass
        # Check if functions are actually implemented
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                    add_unique_hint(f"⚠️ Function '{node.name}' is not implemented yet.")

        # Make sure recursive functions have a base case to stop
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

        # Check if functions return something
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.name in print_only_functions:
                    # Avoid duplicate guidance when Rule 2 already explained the root cause.
                    continue
                has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
                if not has_return:
                    add_unique_hint(f"⚠️ Function '{node.name}' does not return any value.")

        # RULE 9: Unused parameters
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                param_names = [arg.arg for arg in node.args.args]
                used_names = [n.id for n in ast.walk(node) if isinstance(n, ast.Name)]
                for param in param_names:
                    if param not in used_names:
                        add_unique_hint(f"⚠️ Parameter '{param}' is defined but never used.")

        # RULE 10: Mutable default arguments
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        add_unique_hint(
                            f"⚠️ Function '{node.name}' uses a mutable default argument. Use None and initialize inside the function."
                        )

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

    const normalizeToken = (value) =>
        String(value)
            .trim()
            .replace(/^['\"]|['\"]$/g, '')
            .toLowerCase();

    const isNumeric = (value) => {
        const text = String(value).trim();
        return text !== '' && !Number.isNaN(Number(text));
    };

    const normalizeNumber = (value) => Number(String(value).trim());

    const tryParseExpectedList = (raw) => {
        const text = String(raw ?? '').trim();
        if (!text.startsWith('[') || !text.endsWith(']')) return null;

        const inner = text.slice(1, -1).trim();
        if (!inner) return [];

        return inner
            .split(',')
            .map(item => normalizeToken(item));
    };

    const tryParseActualList = (value) => {
        const text = String(value ?? '').trim();
        if (!text.startsWith('[') || !text.endsWith(']')) return null;

        const inner = text.slice(1, -1).trim();
        if (!inner) return [];

        return inner
            .split(',')
            .map(item => normalizeToken(item));
    };

    const valuesMatch = (result, expectedRaw) => {
        const expectedText = String(expectedRaw ?? '').trim();
        const expectedNorm = expectedText.toLowerCase();

        const hasReturnValue = result !== undefined && result !== null && String(result).trim() !== 'None';
        if (!hasReturnValue) {
            return expectedNorm === '__no_return__';
        }

        if (Array.isArray(result)) {
            const expectedList = tryParseExpectedList(expectedText);
            if (expectedList) {
                const resultList = result.map(item => normalizeToken(item));
                if (resultList.length !== expectedList.length) return false;
                return resultList.every((item, index) => item === expectedList[index]);
            }
        }

        const actualList = tryParseActualList(result);
        const expectedList = tryParseExpectedList(expectedText);
        if (actualList && expectedList) {
            if (actualList.length !== expectedList.length) return false;
            return actualList.every((item, index) => item === expectedList[index]);
        }

        if (isNumeric(result) && isNumeric(expectedText)) {
            return normalizeNumber(result) === normalizeNumber(expectedText);
        }

        const resultNorm = String(result).trim().toLowerCase();
        if (resultNorm === expectedNorm) return true;

        // Fallback: ignore whitespace differences in serialized outputs.
        const compact = (s) => s.replace(/\s+/g, '');
        return compact(resultNorm) === compact(expectedNorm);
    };

    try {
        // Run static analysis on the code to find common mistakes
        const analysisJson = await instance.runPythonAsync(`
import json
from analyzer_lib import analyze_code
json.dumps(analyze_code(${JSON.stringify(code)}))
    `);
        const analysis = JSON.parse(analysisJson);
        hints = analysis.hints || [];
        summary = analysis.summary || {};

        // Stop execution if we detected something critical like an infinite loop
        if (analysis.raw_matches?.some(m => m.severity === 'CRITICAL')) {
            self.postMessage({ output: '', error: 'Execution blocked: infinite loop detected.', hints, summary, passed: false });
            return;
        }

        // Set up capture for console output and run the user's code
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

        // Save what the user printed and any errors that happened
        const finalUserOutput = instance.runPython('sys.stdout.getvalue()');
        const finalUserError = instance.runPython('sys.stderr.getvalue()');

        // Now test the code against the test cases
        if (functionName && testCases) {
            passed = true;
            for (const tc of testCases) {
                // Reset output capture so each test is clean and independent
                await instance.runPythonAsync(`
sys.stdout = StringIO()
sys.stderr = StringIO()
        `);

                try {
                    const result = await instance.runPythonAsync(`${functionName}(${tc.input})`);

                    if (!valuesMatch(result, tc.output)) {
                        passed = false;
                        break;
                    }
                } catch (testErr) {
                    passed = false;
                    break;
                }
            }
        } else if ((!functionName || String(functionName).trim() === '') && testCases?.length) {
            // For beginner problems without a function, check if the console output matches
            const normalizedOutput = String(finalUserOutput ?? '').trim().toLowerCase();
            // Accept when output matches at least one listed expected output.
            passed = testCases.some(tc => {
                const expected = String(tc.output ?? '').trim().toLowerCase();
                return normalizedOutput === expected;
            });
        }

        // Send back the results to the frontend
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