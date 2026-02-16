export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  summary?: {
    total_issues?: number;
  };
}

let worker: Worker | null = null;

export function runPython(
  code: string,
  testCases?: Array<{ input: string; output: string }>,
  functionName?: string
): Promise<PythonResult> {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/pythonWorker.js', import.meta.url),
      { type: 'classic' }
    );
  }

  let finalCode = code;

  // If functionName exists, remove any top-level print statements
 if (functionName) {
  finalCode = code.replace(/print\s*\(.*?\)/g, "");
}


  // Inject dynamic test runner if functionName exists
  if (testCases && functionName) {
    let testRunner = "\nimport json\nresults = []\n";

    testCases.forEach(tc => {
      testRunner += `results.append(${functionName}(${tc.input}))\n`;
    });

    testRunner += "import json\n";
    testRunner += "print(json.dumps(results))\n";

    finalCode += testRunner;
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            'Python execution timed out. Worker did not respond.'
          )
        );
      }
    }, 10000);

    const handleMessage = (event: MessageEvent) => {
      if (settled) return;
      settled = true;

      clearTimeout(timeout);
      worker!.removeEventListener('message', handleMessage);
      worker!.removeEventListener('error', handleError);

      resolve(event.data as PythonResult);
    };

    const handleError = (err: ErrorEvent) => {
      if (settled) return;
      settled = true;

      clearTimeout(timeout);
      worker!.removeEventListener('message', handleMessage);
      worker!.removeEventListener('error', handleError);

      reject(
        new Error(
          err.message ||
          'Python worker crashed unexpectedly.'
        )
      );
    };

    worker!.addEventListener('message', handleMessage);
    worker!.addEventListener('error', handleError);

    worker!.postMessage({ code: finalCode });
  });
}
