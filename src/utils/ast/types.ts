/**
 * AST Comparison System - Type Definitions
 * 
 * These types define the structure for comparing student code ASTs
 * against Golden Reference ASTs and reporting divergences.
 */

// ============================================================================
// AST Node Types (Simplified representation of Python AST)
// ============================================================================

export type ASTNodeType =
  | 'Module'
  | 'FunctionDef'
  | 'AsyncFunctionDef'
  | 'ClassDef'
  | 'Return'
  | 'Delete'
  | 'Assign'
  | 'AugAssign'
  | 'AnnAssign'
  | 'For'
  | 'AsyncFor'
  | 'While'
  | 'If'
  | 'With'
  | 'AsyncWith'
  | 'Raise'
  | 'Try'
  | 'Assert'
  | 'Import'
  | 'ImportFrom'
  | 'Global'
  | 'Nonlocal'
  | 'Expr'
  | 'Pass'
  | 'Break'
  | 'Continue'
  | 'BoolOp'
  | 'NamedExpr'
  | 'BinOp'
  | 'UnaryOp'
  | 'Lambda'
  | 'IfExp'
  | 'Dict'
  | 'Set'
  | 'ListComp'
  | 'SetComp'
  | 'DictComp'
  | 'GeneratorExp'
  | 'Await'
  | 'Yield'
  | 'YieldFrom'
  | 'Compare'
  | 'Call'
  | 'FormattedValue'
  | 'JoinedStr'
  | 'Constant'
  | 'Attribute'
  | 'Subscript'
  | 'Starred'
  | 'Name'
  | 'List'
  | 'Tuple'
  | 'Slice';

export type OperatorType =
  | 'Add' | 'Sub' | 'Mult' | 'Div' | 'Mod' | 'Pow' | 'FloorDiv'
  | 'LShift' | 'RShift' | 'BitOr' | 'BitXor' | 'BitAnd' | 'MatMult'
  | 'And' | 'Or'
  | 'Eq' | 'NotEq' | 'Lt' | 'LtE' | 'Gt' | 'GtE' | 'Is' | 'IsNot' | 'In' | 'NotIn'
  | 'Invert' | 'Not' | 'UAdd' | 'USub';

// ============================================================================
// Normalized AST Node
// ============================================================================

/**
 * A normalized AST node with position-independent identifiers.
 * Variable names are replaced with canonical forms (v0, v1, etc.)
 */
export interface NormalizedASTNode {
  type: ASTNodeType;
  /** Canonical identifier (for variables/functions after α-renaming) */
  canonicalId?: string;
  /** Original name (preserved for debugging) */
  originalName?: string;
  /** Operator type for BinOp, Compare, etc. */
  operator?: OperatorType | OperatorType[];
  /** Constant value type (not the value itself) */
  valueType?: 'int' | 'float' | 'str' | 'bool' | 'None' | 'bytes' | 'ellipsis';
  /** Child nodes by role */
  children: Record<string, NormalizedASTNode | NormalizedASTNode[]>;
  /** Original line number (for error reporting) */
  lineNo?: number;
  /** Depth in the tree */
  depth: number;
  /** Path from root (e.g., "body[0].body[1]") */
  path: string;
}

// ============================================================================
// Golden Reference Pattern
// ============================================================================

/**
 * Defines acceptable structural patterns for a problem solution.
 * Supports multiple valid approaches (e.g., iterative vs recursive).
 */
export interface GoldenReferencePattern {
  /** Problem ID this pattern applies to */
  problemId: number;
  /** Human-readable pattern name */
  name: string;
  /** Reference solution code (one canonical implementation) */
  referenceCode: string;
  /** 
   * Alternative acceptable patterns.
   * If provided, student code can match ANY of these.
   */
  alternatives?: string[];
  /**
   * Required structural elements that MUST be present.
   * e.g., ["FunctionDef", "Return"] means function must have a return statement.
   */
  requiredNodes: ASTNodeType[];
  /**
   * Required structural patterns as path expressions.
   * e.g., "FunctionDef > For > If" means a function containing a for loop with an if inside.
   */
  requiredPatterns?: string[];
  /**
   * Forbidden patterns that indicate wrong approach.
   * e.g., "While > While" (nested while) might be forbidden for certain problems.
   */
  forbiddenPatterns?: string[];
  /**
   * Semantic constraints beyond structure.
   */
  semanticConstraints?: SemanticConstraint[];
  /**
   * Flexibility settings for comparison.
   */
  flexibility?: FlexibilityRules;
}

export interface SemanticConstraint {
  type: 'must_call' | 'must_not_call' | 'must_use_operator' | 'must_return_type';
  value: string;
  message: string;
}

export interface FlexibilityRules {
  /** Allow while<->for loop interchange */
  allowLoopTypeChange?: boolean;
  /** Allow iteration<->recursion interchange */
  allowRecursionSwap?: boolean;
  /** Ignore variable naming completely */
  ignoreVariableNames?: boolean;
  /** Allow equivalent operator substitutions (e.g., != vs not ==) */
  allowOperatorEquivalents?: boolean;
  /** Allow comprehension<->loop interchange */
  allowComprehensionSwap?: boolean;
}

// ============================================================================
// Complexity Metrics (NEW - for Goal 4)
// ============================================================================

export interface ComplexityMetrics {
  average_complexity: number;
  max_complexity: number;
  functions_analyzed: number;
  high_risk_functions: string[];
  metrics: Array<{
    function: string;
    cc: number;
    depth: number;
    score: 'low' | 'moderate' | 'high' | 'very_high';
  }>;
}

// ============================================================================
// Comparison Result Types
// ============================================================================

export type DivergenceType =
  | 'missing_node'      // Expected node not found
  | 'extra_node'        // Unexpected node present
  | 'type_mismatch'     // Different node type at same position
  | 'operator_mismatch' // Wrong operator used
  | 'structure_mismatch'// Different nesting/ordering
  | 'semantic_violation'// Violates semantic constraint
  | 'forbidden_pattern' // Uses a forbidden pattern
  | 'missing_pattern';  // Required pattern not found

export interface Divergence {
  type: DivergenceType;
  /** Path in student AST where divergence occurred */
  studentPath: string;
  /** Path in reference AST (if applicable) */
  referencePath?: string;
  /** Line number in student code */
  lineNo?: number;
  /** What was expected */
  expected: string;
  /** What was found */
  found: string;
  /** Human-readable explanation */
  message: string;
  /** Severity: 'error' blocks execution, 'warning' is informational */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestion?: string;
}

// ============================================================================
// SINGLE DECLARATION of ASTComparisonResult with complexity included
// ============================================================================

export interface ASTComparisonResult {
  /** Did the student code match the golden reference structure? */
  matches: boolean;
  /** Overall similarity score (0-1) */
  similarityScore: number;
  /** List of divergences found */
  divergences: Divergence[];
  /** Which alternative pattern matched best (if multiple) */
  bestMatchPattern?: string;
  /** Normalized student AST (for debugging) */
  studentAST?: NormalizedASTNode;
  /** Normalized reference AST (for debugging) */
  referenceAST?: NormalizedASTNode;
  /** Summary statistics */
  stats: {
    totalNodes: number;
    matchedNodes: number;
    studentDepth: number;
    referenceDepth: number;
    complexity?: ComplexityMetrics; // NEW: Optional complexity metrics
  };
}

// ============================================================================
// Comparison Request/Response (Worker Communication)
// ============================================================================

export interface ASTCompareRequest {
  type: 'ast_compare';
  studentCode: string;
  referenceCode: string;
  flexibility?: FlexibilityRules;
}

export interface ASTCompareResponse {
  type: 'ast_compare_result';
  result: ASTComparisonResult;
  error?: string;
}

// ============================================================================
// Problem with Golden Reference
// ============================================================================

export interface ProblemWithReference {
  id: number;
  title: string;
  goldenReference: GoldenReferencePattern;
}