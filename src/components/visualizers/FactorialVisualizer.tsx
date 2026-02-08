import React, { useEffect, useMemo, useState } from "react";

interface FactorialStep {
  step: number;
  n: number;
  i: number; // current multiplier
  product: number; // current result
  description: string;
}

interface FactorialFrame {
  depth: number;
  n: number;
  state: 'call' | 'return';
  result?: number;
}

export function clampN(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  // prevent huge numbers from breaking the UI
  if (n > 12) return 12;
  return Math.floor(n);
}

export function generateFactorialSteps(rawN: number): FactorialStep[] {
  const n = clampN(rawN);
  const steps: FactorialStep[] = [];

  // initial state
  steps.push({
    step: 0,
    n,
    i: 1,
    product: 1,
    description:
      n === 0
        ? "Start: by definition, 0! is 1."
        : `Start: we will multiply numbers from 1 up to ${n}. Initial result = 1.`,
  });

  let product = 1;

  if (n === 0) {
    steps.push({
      step: 1,
      n,
      i: 0,
      product: 1,
      description: "Return 1 because 0! is defined to be 1.",
    });
    return steps;
  }

  for (let i = 1; i <= n; i++) {
    product *= i;
    steps.push({
      step: i,
      n,
      i,
      product,
      description: `Step ${i}: result = previous result × ${i} = ${product}.`,
    });
  }

  steps.push({
    step: steps.length,
    n,
    i: n,
    product,
    description: `Finish: ${n}! = ${product}.`,
  });

  return steps;
}

function generateRecursionFrames(rawN: number): FactorialFrame[] {
  const n = clampN(rawN);
  const frames: FactorialFrame[] = [];

  function recurse(k: number): number {
    frames.push({ depth: n - k, n: k, state: 'call' });
    if (k === 0 || k === 1) {
      frames.push({ depth: n - k, n: k, state: 'return', result: 1 });
      return 1;
    }
    const sub = recurse(k - 1);
    const val = k * sub;
    frames.push({ depth: n - k, n: k, state: 'return', result: val });
    return val;
  }

  recurse(n);
  return frames;
}

interface FactorialVisualizerProps {
  initialN?: number;
}

const FactorialVisualizer: React.FC<FactorialVisualizerProps> = ({ initialN = 5 }) => {
  const [nInput, setNInput] = useState<string>(String(initialN));
  const [n, setN] = useState<number>(initialN);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'iterative' | 'recursion'>('iterative');

  const steps = useMemo(() => generateFactorialSteps(n), [n]);
  const current = steps[currentIndex] ?? steps[0];
  const recursionFrames = useMemo(() => generateRecursionFrames(n), [n]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const id = setTimeout(() => {
      setCurrentIndex((idx) => Math.min(idx + 1, steps.length - 1));
    }, 900);

    return () => clearTimeout(id);
  }, [isPlaying, currentIndex, steps.length]);

  const handleApplyN = () => {
    const parsed = clampN(Number(nInput));
    setN(parsed);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Factorial Visualizer</h3>
      <p className="text-sm text-gray-600 mb-4">
        This shows how the factorial of a number is built up step by step by multiplying
        consecutive integers.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4 justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span>View:</span>
          <button
            type="button"
            onClick={() => setViewMode('iterative')}
            className={`px-2 py-1 rounded-md border text-xs ${
              viewMode === 'iterative'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Loop steps
          </button>
          <button
            type="button"
            onClick={() => setViewMode('recursion')}
            className={`px-2 py-1 rounded-md border text-xs ${
              viewMode === 'recursion'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Recursion stack
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Number (n)
          </label>
          <input
            type="number"
            min={0}
            max={12}
            value={nInput}
            onChange={(e) => setNInput(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-[11px] text-gray-500">We clamp n to 0–12 for clarity.</p>
        </div>
        <button
          onClick={handleApplyN}
          className="h-9 px-3 rounded-md bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Apply
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((idx) => Math.max(0, idx - 1));
            }}
            disabled={currentIndex === 0}
            className="h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={steps.length <= 1}
            className="h-9 px-4 rounded-md bg-green-600 text-white text-sm font-medium shadow-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((idx) => Math.min(idx + 1, steps.length - 1));
            }}
            disabled={currentIndex >= steps.length - 1}
            className="h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {viewMode === 'iterative' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1 text-xs text-gray-600">
            <span>
              Step {currentIndex + 1} of {steps.length}
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-indigo-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">n</div>
          <div className="text-2xl font-bold text-indigo-700">{current.n}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Current multiplier (i)</div>
          <div className="text-2xl font-bold text-purple-700">{current.i}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Current result</div>
          <div className="text-2xl font-bold text-emerald-700">{current.product}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="text-xs font-semibold text-gray-500 mb-1">Explanation</div>
        {viewMode === 'iterative' ? (
          <p className="text-sm text-gray-800">{current.description}</p>
        ) : (
          <p className="text-sm text-gray-800">
            This view shows how recursive calls for factorial build up a call stack and then
            return values on the way back.
          </p>
        )}
      </div>

      {viewMode === 'iterative' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">
            Multiplication steps for {current.n}!
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-mono">
            {Array.from({ length: clampN(current.n) }, (_, idx) => idx + 1).map((value) => (
              <span
                key={value}
                className={`px-2 py-1 rounded-full border text-xs ${
                  value <= current.i
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {value}
              </span>
            ))}
            {clampN(current.n) === 0 && (
              <span className="px-2 py-1 rounded-full border text-xs bg-indigo-600 text-white border-indigo-700">
                0! = 1
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">
            Recursion call stack for {n}!
          </div>
          <div className="space-y-1 text-xs font-mono">
            {recursionFrames.map((frame, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-md border px-2 py-1 ${
                  frame.state === 'call'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span>
                  {frame.state === 'call'
                    ? `call factorial(${frame.n})`
                    : `return from factorial(${frame.n}) = ${frame.result}`}
                </span>
                <span className="text-[10px] text-gray-500">
                  depth {frame.depth}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorialVisualizer;