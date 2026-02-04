import React, { useEffect, useMemo, useState } from "react";

interface BinarySearchStep {
  step: number;
  array: number[];
  low: number;
  high: number;
  mid: number;
  comparison: "less" | "greater" | "equal" | "none";
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
  if (arr.length > 16) return arr.slice(0, 16);
  return arr;
}

export function generateBinarySearchSteps(arrayInput: number[], target: number): BinarySearchStep[] {
  const array = clampArray([...arrayInput].sort((a, b) => a - b));
  const steps: BinarySearchStep[] = [];

  steps.push({
    step: 0,
    array: [...array],
    low: 0,
    high: array.length - 1,
    mid: -1,
    comparison: "none",
    description:
      "Start: we will repeatedly check the middle of the current range and then discard half of the search space.",
  });
if (array.length === 0) {
  return [{
    step: 0,
    array: [],
    low: 0,
    high: -1,
    mid: -1,
    comparison: "none",
    description: "Array is empty; target cannot be found."
  }];
}
  let low = 0;
  let high = array.length - 1;
  let step = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = array[mid];
    let comparison: BinarySearchStep["comparison"] = "equal";
    let description: string;

    if (value === target) {
      comparison = "equal";
      description = `Found target ${target} at index ${mid}.`;
      steps.push({
        step: step++,
        array: [...array],
        low,
        high,
        mid,
        comparison,
        description,
      });
      break;
    } else if (value < target) {
      comparison = "less";
      description = `Target ${target} is greater than middle value ${value}, so we search the right half.`;
      steps.push({
        step: step++,
        array: [...array],
        low,
        high,
        mid,
        comparison,
        description,
      });
      low = mid + 1;
    } else {
      comparison = "greater";
      description = `Target ${target} is less than middle value ${value}, so we search the left half.`;
      steps.push({
        step: step++,
        array: [...array],
        low,
        high,
        mid,
        comparison,
        description,
      });
      high = mid - 1;
    }
  }

  if (steps.length === 1) {
    steps.push({
      step: 1,
      array: [...array],
      low: 0,
      high: array.length - 1,
      mid: -1,
      comparison: "none",
      description: "Array is empty; target cannot be found.",
    });
  } else if (steps[steps.length - 1].comparison !== "equal") {
    steps.push({
      step: step,
      array: [...array],
      low,
      high,
      mid: -1,
      comparison: "none",
      description: `Search space became empty; target ${target} is not in the array.`,
    });
  }

  return steps;
}

interface BinarySearchVisualizerProps {
  initialArray?: string;
  initialTarget?: number;
}

const BinarySearchVisualizer: React.FC<BinarySearchVisualizerProps> = ({
  initialArray = "[1, 3, 5, 7, 9]",
  initialTarget = 5,
}) => {
  const [arrayInput, setArrayInput] = useState<string>(initialArray);
  const [targetInput, setTargetInput] = useState<string>(String(initialTarget));
  const [baseArray, setBaseArray] = useState<number[]>(parseArrayInput(initialArray));
  const [target, setTarget] = useState<number>(initialTarget);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const steps = useMemo(
    () => generateBinarySearchSteps(baseArray, target),
    [baseArray, target],
  );
  const current = steps[currentIndex] ?? steps[0];

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

  const handleApply = () => {
    const arr = parseArrayInput(arrayInput);
    if (arr.length === 0) return;
    const t = Number(targetInput);
    if (!Number.isFinite(t)) return;
    setBaseArray(arr);
    setTarget(t);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Binary Search Visualizer</h3>
      <p className="text-sm text-gray-600 mb-4">
        Binary search works on sorted arrays by repeatedly checking the middle element and
        discarding half of the remaining search space.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Sorted array (JSON format)
          </label>
          <input
            type="text"
            value={arrayInput}
            onChange={(e) => setArrayInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. [1, 3, 5, 7, 9]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Target</label>
          <input
            type="number"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700 transition-colors"
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
        <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="text-xs font-semibold text-gray-500 mb-1">Explanation</div>
        <p className="text-sm text-gray-800">{current.description}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          Search window and middle element
        </div>
        <div className="flex gap-2 justify-center">
          {current.array.map((value, idx) => {
            const inRange = idx >= current.low && idx <= current.high && current.high >= 0;
            const isMid = idx === current.mid;
            let colorClasses = "bg-slate-50 border-slate-300 text-slate-800";
            if (inRange) colorClasses = "bg-emerald-50 border-emerald-400 text-emerald-800";
            if (isMid)
              colorClasses =
                current.comparison === "equal"
                  ? "bg-emerald-500 border-emerald-600 text-white"
                  : "bg-amber-400 border-amber-500 text-white";
            return (
              <div
                key={idx}
                className={`px-3 py-2 rounded-md border text-sm font-mono ${colorClasses}`}
              >
                <div className="text-center">{value}</div>
                <div className="text-[10px] text-gray-500 text-center">{idx}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BinarySearchVisualizer;