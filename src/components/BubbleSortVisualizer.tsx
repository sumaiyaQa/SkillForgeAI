import React, { useEffect, useMemo, useState } from "react";

interface BubbleSortStep {
  step: number;
  array: number[];
  i: number; // outer loop pass index
  j: number; // inner loop comparison index
  swapped: boolean;
  description: string;
}

function parseArrayInput(input: string): number[] {
  try {
    const arr = JSON.parse(input);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  } catch {
    return [];
  }
}

function clampArray(arr: number[]): number[] {
  // limit length for visualization clarity
  if (arr.length > 12) {
    return arr.slice(0, 12);
  }
  return arr;
}

export function generateBubbleSortSteps(inputArr: number[]): BubbleSortStep[] {
  const base = clampArray(inputArr);
  const arr = [...base];
  const steps: BubbleSortStep[] = [];

  steps.push({
    step: 0,
    array: [...arr],
    i: 0,
    j: 0,
    swapped: false,
    description:
      "Start: we will repeatedly compare adjacent elements and swap if they are in the wrong order.",
  });

  const n = arr.length;
  let step = 1;

  for (let i = 0; i < n; i++) {
    let swappedThisPass = false;
    for (let j = 0; j < n - i - 1; j++) {
      let swapped = false;
      if (arr[j] > arr[j + 1]) {
        const tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
        swapped = true;
        swappedThisPass = true;
      }
      steps.push({
        step: step++,
        array: [...arr],
        i,
        j,
        swapped,
        description: swapped
          ? `Swapped elements at positions ${j} and ${j + 1} because ${arr[j]} <= ${
              arr[j + 1]
            } must hold in sorted order.`
          : `Compared elements at positions ${j} and ${j + 1}; no swap needed.`,
      });
    }
    steps.push({
      step: step++,
      array: [...arr],
      i,
      j: n - i - 1,
      swapped: swappedThisPass,
      description: swappedThisPass
        ? `End of pass ${i + 1}: largest unsorted element has bubbled to the end.`
        : `End of pass ${i + 1}: no swaps in this pass, array is sorted early.`,
    });
    if (!swappedThisPass) break;
  }

  steps.push({
    step: step,
    array: [...arr],
    i: n - 1,
    j: 0,
    swapped: false,
    description: "Finish: the array is fully sorted.",
  });

  return steps;
}

interface BubbleSortVisualizerProps {
  initialArray?: string;
}

const BubbleSortVisualizer: React.FC<BubbleSortVisualizerProps> = ({
  initialArray = "[64, 34, 25, 12, 22]",
}) => {
  const [arrayInput, setArrayInput] = useState<string>(initialArray);
  const [baseArray, setBaseArray] = useState<number[]>(
    parseArrayInput(initialArray) || [64, 34, 25, 12, 22],
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const steps = useMemo(() => generateBubbleSortSteps(baseArray), [baseArray]);
  const current = steps[currentIndex] ?? steps[0];

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const id = setTimeout(() => {
      setCurrentIndex((idx) => Math.min(idx + 1, steps.length - 1));
    }, 700);
    return () => clearTimeout(id);
  }, [isPlaying, currentIndex, steps.length]);

  const handleApplyArray = () => {
    const parsed = parseArrayInput(arrayInput);
    if (parsed.length === 0) return;
    setBaseArray(parsed);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-lg p-6 border border-sky-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Bubble Sort Visualizer</h3>
      <p className="text-sm text-gray-600 mb-4">
        Bubble sort repeatedly compares adjacent elements and swaps them if they are in the
        wrong order.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Array (JSON format)
          </label>
          <input
            type="text"
            value={arrayInput}
            onChange={(e) => setArrayInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. [64, 34, 25, 12, 22]"
          />
          <p className="mt-1 text-[11px] text-gray-500">Up to 12 elements are visualized.</p>
        </div>
        <button
          onClick={handleApplyArray}
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

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1 text-xs text-gray-600">
          <span>
            Step {currentIndex + 1} of {steps.length}
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-sky-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="text-xs font-semibold text-gray-500 mb-1">Explanation</div>
        <p className="text-sm text-gray-800">{current.description}</p>
      </div>

      <div className="flex items-end gap-2 h-40 bg-white rounded-lg border border-gray-200 p-3">
        {current.array.map((value, idx) => {
          const isCompared = idx === current.j || idx === current.j + 1;
          const isSortedTail = idx >= current.array.length - 1 - current.i;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 min-w-[20px]">
              <div
                className={`w-full rounded-t-md border flex items-end justify-center text-xs font-medium transition-all duration-300 ${
                  isCompared

                    ? "bg-orange-400/80 border-orange-500 text-white"
                    : isSortedTail
                    ? "bg-emerald-400/80 border-emerald-500 text-white"
                    : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
                style={{ height: `${Math.max(10, Math.min(100, Math.abs(value) * 5))}px` }}
              >
                <span className="pb-1">{value}</span>
              </div>
              <span className="mt-1 text-[11px] text-gray-500">{idx}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BubbleSortVisualizer;