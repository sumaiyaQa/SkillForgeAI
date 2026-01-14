export interface PythonResult {
  output: string;
  error: string;
  hints: string[];
  steps: any[];
}

let worker: Worker | null = null;

export function runPython(code: string): Promise<PythonResult> {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/pythonWorker.js", import.meta.url),
      { type: "classic" }
    );
  }

  return new Promise((resolve) => {
    worker!.onmessage = (e) => resolve(e.data);
    worker!.postMessage({ code });
  });
}