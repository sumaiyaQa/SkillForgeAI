import React from 'react';
import { Info, Code2 } from 'lucide-react';

interface Props {
  problemId: number;
}

// Informational panel explaining how code analysis works.
  // NOTE:
  // AST analysis is performed automatically during execution
  // There is no structural comparison or grading
  // This panel exists for transparency and educational clarity

export default function ASTTestPanel({ problemId }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-2 text-white">
        <Code2 size={20} />
        <span className="font-semibold">Code Analysis</span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 text-sm text-gray-700">
        <div className="flex items-start gap-3">
          <Info className="text-indigo-600 mt-0.5" size={18} />
          <p>
            Your Python code is automatically analyzed before execution using
            Python’s <strong>Abstract Syntax Tree (AST)</strong>.
          </p>
        </div>

        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Detects unsafe patterns (e.g. infinite loops)</li>
          <li>Provides educational hints for common mistakes</li>
          <li>Does <strong>not</strong> grade or compare against a solution</li>
          <li>Runs entirely in a sandboxed environment</li>
        </ul>

        <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-indigo-800">
          Analysis happens automatically when you run your code — no manual
          action is required.
        </div>
      </div>
    </div>
  );
}
