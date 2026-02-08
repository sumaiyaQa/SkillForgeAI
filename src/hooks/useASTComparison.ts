// import { useState, useCallback } from 'react';
// import { compareWithGoldenReference, formatDivergenceFeedback, getComparisonSummary } from '../utils/ast/comparator';
// import type { ASTComparisonResult } from '../workers/types';

// interface UseASTComparisonReturn {
//   compare: (problemId: number, studentCode: string) => Promise<void>;
//   result: ASTComparisonResult | null;
//   feedback: string[];
//   summary: string;
//   isComparing: boolean;
//   error: string | null;
//   clear: () => void;
// }

// export function useASTComparison(): UseASTComparisonReturn {
//   const [result, setResult] = useState<ASTComparisonResult | null>(null);
//   const [feedback, setFeedback] = useState<string[]>([]);
//   const [summary, setSummary] = useState<string>('');
//   const [isComparing, setIsComparing] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const compare = useCallback(async (problemId: number, studentCode: string) => {
//     setIsComparing(true);
//     setError(null);
    
//     try {
//       const comparison = await compareWithGoldenReference(problemId, studentCode);
      
//       if (!comparison) {
//         setError('No golden reference found for this problem');
//         setIsComparing(false);
//         return;
//       }

//       setResult(comparison.result);
//       setFeedback(formatDivergenceFeedback(comparison.result.divergences));
//       setSummary(getComparisonSummary(comparison.result));
      
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'AST comparison failed');
//     } finally {
//       setIsComparing(false);
//     }
//   }, []);

//   const clear = useCallback(() => {
//     setResult(null);
//     setFeedback([]);
//     setSummary('');
//     setError(null);
//   }, []);

//   return { compare, result, feedback, summary, isComparing, error, clear };
// }