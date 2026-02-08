// Represents the result returned from the Python execution environment. The structure mirrors messages posted back from the Web Worker.

export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  summary?: {
    total_issues?: number;
  };
}


// A single shared Web Worker instance is reused across executions to avoid unnecessary reinitialisation cost.
 
let worker: Worker | null = null;

// EXECUTION FUNCTION

/**
 * Sends Python source code to the Web Worker and resolves
 * with the execution result.
 *
 * Important notes:
 * - This function does NOT perform grading or correctness checks
 * - It simply executes the code and returns raw output/errors
 * - All analysis and feedback logic is handled elsewhere
 *
 * This separation keeps concerns clear and the system
 * easy to reason about and extend.
 */
export function runPython(code: string): Promise<PythonResult> {
  // initialise the worker on first use
  if (!worker) {
    worker = new Worker(
      new URL('../workers/pythonWorker.js', import.meta.url),
      { type: 'classic' }
    );
  }

  return new Promise((resolve) => {
  // Handle a single execution response.
  // The worker posts back a structured PythonResult object.
  
    worker!.onmessage = (event) => {
      resolve(event.data as PythonResult);
    };

    // Send the source code to the worker for execution
    worker!.postMessage({ code });
  });
}
