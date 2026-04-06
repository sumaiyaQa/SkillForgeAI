export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  summary?: {
    total_issues?: number;
  };
}

let worker: Worker | null = null;

// Send code to the Python worker for execution and testing
export async function runPython(
  code: string,
  testCases?: Array<{ input: string; output: string }>,
  functionName?: string
): Promise<PythonResult & { passed?: boolean }> {
  // Create the worker on first use
  if (!worker) {
    worker = new Worker(
      new URL('../workers/pythonWorker.js', import.meta.url),
      { type: 'classic' }
    );
  }

  return new Promise((resolve, reject) => {
    // Stop execution after 10 seconds if it's still running (usually means an infinite loop)
    const timeout = setTimeout(() => {
      reject(new Error('Execution timed out. Check for infinite loops!'));
    }, 10000);

    const handleMessage = (event: MessageEvent) => {
      clearTimeout(timeout);
      worker!.removeEventListener('message', handleMessage);
      // The worker sends back the result along with whether the code passed all tests
      resolve(event.data);
    };

    worker!.addEventListener('message', handleMessage);
    // Send the code and test cases to the worker for processing
    worker!.postMessage({ code, testCases, functionName });
  });
}