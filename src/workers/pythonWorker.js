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
from astHints import analyze_code
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
