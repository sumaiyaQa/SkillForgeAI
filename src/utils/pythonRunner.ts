// utils/pythonRunner.ts
// Clean, BSc-safe Python execution helper

export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  summary?: {
    total_issues?: number;
  };
}

let worker: Worker | null = null;

/**
 * Sends Python code to the Web Worker and returns the result.
 * This function does NOT do grading or testing.
 */
export function runPython(code: string): Promise<PythonResult> {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/pythonWorker.js", import.meta.url),
      { type: "classic" }
    );
  }

  return new Promise((resolve) => {
    worker!.onmessage = (event) => {
      resolve(event.data as PythonResult);
    };

    worker!.postMessage({ code });
  });
}
