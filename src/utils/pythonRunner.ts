export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  summary?: {
    total_issues?: number;
  };
}

let worker: Worker | null = null;

export async function runPython(
  code: string,
  testCases?: Array<{ input: string; output: string }>,
  functionName?: string
): Promise<PythonResult & { passed?: boolean }> {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/pythonWorker.js', import.meta.url),
      { type: 'classic' }
    );
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Execution timed out. Check for infinite loops!'));
    }, 10000);

    const handleMessage = (event: MessageEvent) => {
      clearTimeout(timeout);
      worker!.removeEventListener('message', handleMessage);
      resolve(event.data); // This now carries the 'passed' boolean from the worker
    };

    worker!.addEventListener('message', handleMessage);
    worker!.postMessage({ code, testCases, functionName });
  });
}