/**
 * AST Comparator - TypeScript Orchestrator
 * 
 * Provides a clean API for comparing student code against golden references.
 * Communicates with the Python AST engine running in the web worker.
 */

import type {
  ASTComparisonResult,
  FlexibilityRules,
  Divergence,
  GoldenReferencePattern,
} from './types';
import { getGoldenReference, hasGoldenReference } from './goldenReferences';

// Define missing return type interface locally
interface ProblemWithReferenceResult {
  result: ASTComparisonResult;
  patternCheck?: {
    passes: boolean;
    violations: Array<{ type: string; message: string }>;
  };
  reference: GoldenReferencePattern;
}

// Worker instance (reused across calls)
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('../../workers/pythonWorker.js', import.meta.url),
      { type: 'classic' }
    );
  }
  return worker;
}

/**
 * Compare student code against a reference implementation.
 * Returns detailed divergence information showing exactly where logic differs.
 */
export function compareAST(
  studentCode: string,
  referenceCode: string,
  flexibility?: FlexibilityRules
): Promise<ASTComparisonResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'ast_compare_result') {
        w.removeEventListener('message', handler);
        
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error || 'AST comparison failed'));
        }
      }
    };
    
    w.addEventListener('message', handler);
    w.postMessage({
      type: 'ast_compare',
      studentCode,
      referenceCode,
      flexibility: flexibility || {}
    });
  });
}

/**
 * Check if code matches required structural patterns.
 */
export function checkPatterns(
  code: string,
  options: {
    requiredPatterns?: string[];
    forbiddenPatterns?: string[];
    requiredNodes?: string[];
  }
): Promise<{
  passes: boolean;
  violations: Array<{
    type: string;
    pattern?: string;
    node_type?: string;
    message: string;
  }>;
}> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'check_patterns_result') {
        w.removeEventListener('message', handler);
        
        if (event.data.success) {
          resolve({
            passes: event.data.passes,
            violations: event.data.violations
          });
        } else {
          reject(new Error(event.data.error || 'Pattern check failed'));
        }
      }
    };
    
    w.addEventListener('message', handler);
    w.postMessage({
      type: 'check_patterns',
      code,
      requiredPatterns: options.requiredPatterns,
      forbiddenPatterns: options.forbiddenPatterns,
      requiredNodes: options.requiredNodes
    });
  });
}

/**
 * Compare student code against the golden reference for a specific problem.
 * Automatically fetches the reference and applies appropriate flexibility rules.
 */
export async function compareWithGoldenReference(
  problemId: number,
  studentCode: string
): Promise<ProblemWithReferenceResult | null> {
  if (!hasGoldenReference(problemId)) {
    console.warn(`No golden reference defined for problem ${problemId}`);
    return null;
  }
  
  const reference = getGoldenReference(problemId)!;
  
  // Compare AST structure
  const result = await compareAST(
    studentCode,
    reference.referenceCode,
    reference.flexibility
  );
  
  // If primary comparison fails and alternatives exist, try them
  if (!result.matches && reference.alternatives) {
    let bestResult = result;
    let bestScore = result.similarityScore;
    
    for (const altCode of reference.alternatives) {
      try {
        const altResult = await compareAST(
          studentCode,
          altCode,
          reference.flexibility
        );
        
        if (altResult.matches) {
          // Found a matching alternative
          bestResult = altResult;
          bestResult.bestMatchPattern = 'alternative';
          break;
        } else if (altResult.similarityScore > bestScore) {
          bestResult = altResult;
          bestScore = altResult.similarityScore;
        }
      } catch {
        // Continue trying other alternatives
      }
    }
    
    // Use the best result found
    if (bestResult !== result) {
      return {
        result: bestResult,
        reference
      };
    }
  }
  
  // Check structural patterns if defined
  let patternCheck;
  if (reference.requiredPatterns || reference.forbiddenPatterns || reference.requiredNodes) {
    patternCheck = await checkPatterns(studentCode, {
      requiredPatterns: reference.requiredPatterns,
      forbiddenPatterns: reference.forbiddenPatterns,
      requiredNodes: reference.requiredNodes
    });
  }
  
  return {
    result,
    patternCheck,
    reference
  };
}

/**
 * Format divergences into human-readable feedback messages.
 */
export function formatDivergenceFeedback(divergences: Divergence[]): string[] {
  const feedback: string[] = [];
  
  // Group by severity
  const errors = divergences.filter(d => d.severity === 'error');
  const warnings = divergences.filter(d => d.severity === 'warning');
  const info = divergences.filter(d => d.severity === 'info');
  
  // Format errors first (most important)
  for (const d of errors) {
    let msg = `❌ ${d.message}`;
    if (d.lineNo) {
      msg += ` (line ${d.lineNo})`;
    }
    if (d.suggestion) {
      msg += `\n   💡 Suggestion: ${d.suggestion}`;
    }
    feedback.push(msg);
  }
  
  // Then warnings
  for (const d of warnings) {
    let msg = `⚠️ ${d.message}`;
    if (d.lineNo) {
      msg += ` (line ${d.lineNo})`;
    }
    if (d.suggestion) {
      msg += `\n   💡 ${d.suggestion}`;
    }
    feedback.push(msg);
  }
  
  // Info messages only if there aren't too many errors
  if (errors.length < 3) {
    for (const d of info.slice(0, 2)) {
      feedback.push(`ℹ️ ${d.message}`);
    }
  }
  
  return feedback;
}

/**
 * Get a summary of the comparison result.
 */
export function getComparisonSummary(result: ASTComparisonResult): string {
  if (result.matches) {
    return `✅ Your code structure matches the expected pattern! (${Math.round(result.similarityScore * 100)}% similarity)`;
  }
  
  const errorCount = result.divergences.filter(d => d.severity === 'error').length;
  const warningCount = result.divergences.filter(d => d.severity === 'warning').length;
  
  let summary = `📊 Structure similarity: ${Math.round(result.similarityScore * 100)}%\n`;
  
  if (errorCount > 0) {
    summary += `❌ ${errorCount} structural issue${errorCount > 1 ? 's' : ''} found\n`;
  }
  if (warningCount > 0) {
    summary += `⚠️ ${warningCount} suggestion${warningCount > 1 ? 's' : ''} for improvement`;
  }
  
  return summary;
}

/**
 * Quick check if student code has the basic required structure.
 * Useful for early feedback before running full comparison.
 */
export async function quickStructureCheck(
  problemId: number,
  studentCode: string
): Promise<{
  hasRequiredElements: boolean;
  missingElements: string[];
}> {
  const reference = getGoldenReference(problemId);
  if (!reference) {
    return { hasRequiredElements: true, missingElements: [] };
  }
  
  const result = await checkPatterns(studentCode, {
    requiredNodes: reference.requiredNodes
  });
  
  const missingElements = result.violations
    .filter(v => v.type === 'missing_node')
    .map(v => v.node_type || 'unknown');
  
  return {
    hasRequiredElements: missingElements.length === 0,
    missingElements
  };
}