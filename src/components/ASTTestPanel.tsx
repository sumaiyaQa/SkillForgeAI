interface Props {
  problemId: number;
}

type RuleSeverity = 'critical' | 'warning' | 'info';

interface AstRule {
  severity: RuleSeverity;
  title: string;
  description: string;
}

// Keep rule descriptions simple and close to what students need during debugging.
const AST_RULES: AstRule[] = [
  {
    severity: 'critical',
    title: 'Infinite Loop Detection',
    description:
      'Detects while True: loops that have no break statement. Execution is blocked before it runs, preventing browser freezes.',
  },
  {
    severity: 'warning',
    title: 'Print Instead of Return',
    description:
      'Flags functions that only print output rather than returning a value. Most coding problems require a return statement.',
  },
  {
    severity: 'critical',
    title: 'Hard-coded Return Values',
    description:
      'Catches functions that return a constant (e.g. return 5). A correct solution must work for all inputs, not just the example.',
  },
  {
    severity: 'warning',
    title: 'Unimplemented Function (pass)',
    description:
      'Detects functions whose body contains only a pass statement, meaning the implementation is missing.',
  },
  {
    severity: 'warning',
    title: 'Recursive Function Without Base Case',
    description:
      'Identifies recursive functions that call themselves but have no if statement to stop the recursion, which would cause a stack overflow.',
  },
  {
    severity: 'info',
    title: 'Nested Loops (O(n²) Complexity)',
    description:
      'Notifies you when nested for-loops are detected. This is educational — nested loops are valid but have quadratic time complexity.',
  },
  {
    severity: 'info',
    title: 'Built-in sort() Usage',
    description:
      'Flags use of the built-in .sort() method. For sorting algorithm problems, you should implement the algorithm manually.',
  },
  {
    severity: 'warning',
    title: 'Function Without Return',
    description:
      'Detects functions that have no return statement at all. Functions that only print will fail automated test cases.',
  },
  {
    severity: 'warning',
    title: 'Unused Parameters',
    description:
      'Flags function parameters that are defined but never referenced inside the function body, which often indicates a logic error.',
  },
  {
    severity: 'critical',
    title: 'Syntax Error',
    description:
      'Reports any Python syntax errors with line numbers before execution begins, so you know exactly where to look.',
  },
];

const severityConfig: Record<RuleSeverity, { bg: string; border: string; badge: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

export default function ASTTestPanel({ problemId }: Props) {
  void problemId;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Automated Code Analysis</h2>
          <p className="text-xs text-slate-500">Powered by Python Abstract Syntax Tree (AST)</p>
        </div>

        <div className="space-y-4 p-5 text-sm text-slate-700">
          <p>
            Every time you click <strong>Run Code</strong>, your submission is statically analysed
            before execution using Python&apos;s built-in <code className="rounded bg-slate-100 px-1 text-xs">ast</code> module.
            This catches structural problems and common mistakes before runtime.
          </p>

          <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-3">
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">Sandboxed in a web worker</div>
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">Checks code before execution</div>
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">Hints support step-by-step learning</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Active Analysis Rules ({AST_RULES.length})
        </h3>
        <div className="space-y-2">
          {AST_RULES.map((rule, i) => {
            const styles = severityConfig[rule.severity];
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 ${styles.bg} ${styles.border}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{rule.title}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${styles.badge}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <strong>Note:</strong> AST analysis detects structural issues only. It does not compare
        your solution against a model answer. Correctness is verified separately by running your
        function against automated test cases.
      </div>
    </div>
  );
}