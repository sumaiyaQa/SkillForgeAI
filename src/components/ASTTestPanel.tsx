import React from 'react';
import { Info, Code2, ShieldCheck, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  problemId: number;
}

// Maps each AST rule to a friendly explanation shown in this panel.
const AST_RULES = [
  {
    icon: '🚨',
    severity: 'critical',
    title: 'Infinite Loop Detection',
    description:
      'Detects while True: loops that have no break statement. Execution is blocked before it runs, preventing browser freezes.',
  },
  {
    icon: '💡',
    severity: 'warning',
    title: 'Print Instead of Return',
    description:
      'Flags functions that only print output rather than returning a value. Most coding problems require a return statement.',
  },
  {
    icon: '🚨',
    severity: 'critical',
    title: 'Hard-coded Return Values',
    description:
      'Catches functions that return a constant (e.g. return 5). A correct solution must work for all inputs, not just the example.',
  },
  {
    icon: '⚠️',
    severity: 'warning',
    title: 'Unimplemented Function (pass)',
    description:
      'Detects functions whose body contains only a pass statement, meaning the implementation is missing.',
  },
  {
    icon: '🔁',
    severity: 'warning',
    title: 'Recursive Function Without Base Case',
    description:
      'Identifies recursive functions that call themselves but have no if statement to stop the recursion, which would cause a stack overflow.',
  },
  {
    icon: '🐢',
    severity: 'info',
    title: 'Nested Loops (O(n²) Complexity)',
    description:
      'Notifies you when nested for-loops are detected. This is educational — nested loops are valid but have quadratic time complexity.',
  },
  {
    icon: '🚀',
    severity: 'info',
    title: 'Built-in sort() Usage',
    description:
      'Flags use of the built-in .sort() method. For sorting algorithm problems, you should implement the algorithm manually.',
  },
  {
    icon: '⚠️',
    severity: 'warning',
    title: 'Function Without Return',
    description:
      'Detects functions that have no return statement at all. Functions that only print will fail automated test cases.',
  },
  {
    icon: '⚠️',
    severity: 'warning',
    title: 'Unused Parameters',
    description:
      'Flags function parameters that are defined but never referenced inside the function body, which often indicates a logic error.',
  },
  {
    icon: '🚨',
    severity: 'critical',
    title: 'Syntax Error',
    description:
      'Reports any Python syntax errors with line numbers before execution begins, so you know exactly where to look.',
  },
];

const severityConfig: Record<string, { bg: string; border: string; badge: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

export default function ASTTestPanel({ problemId: _problemId }: Props) {
  return (
    <div className="space-y-6">
      {/* Header explanation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center gap-3 text-white">
          <Code2 size={20} />
          <div>
            <div className="font-bold">Automated Code Analysis</div>
            <div className="text-xs text-indigo-200">
              Powered by Python's Abstract Syntax Tree (AST)
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <Info className="text-indigo-500 mt-0.5 shrink-0" size={18} />
            <p>
              Every time you click <strong>Run Code</strong>, your submission is statically
              analysed before execution using Python's built-in <code className="bg-gray-100 px-1 rounded text-xs">ast</code> module.
              This catches structural problems and common mistakes in real time — without running
              your code first.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <ShieldCheck className="mx-auto text-emerald-500 mb-1" size={20} />
              <div className="text-xs font-bold text-gray-600">Sandboxed</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Runs in a web worker — cannot affect your browser
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <AlertTriangle className="mx-auto text-amber-500 mb-1" size={20} />
              <div className="text-xs font-bold text-gray-600">Pre-execution</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Analysis happens before the code runs
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <Lightbulb className="mx-auto text-indigo-500 mb-1" size={20} />
              <div className="text-xs font-bold text-gray-600">Educational</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Hints are tailored to your Bloom's level
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
          Active Analysis Rules ({AST_RULES.length})
        </h3>
        <div className="space-y-2">
          {AST_RULES.map((rule, i) => {
            const styles = severityConfig[rule.severity];
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}
              >
                <span className="text-lg leading-none mt-0.5">{rule.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-800">{rule.title}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${styles.badge}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-700">
        <strong>Note:</strong> AST analysis detects structural issues only. It does not compare
        your solution against a model answer. Correctness is verified separately by running your
        function against automated test cases.
      </div>
    </div>
  );
}