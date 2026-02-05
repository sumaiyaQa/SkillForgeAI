import React, { useState } from 'react';
import { useASTComparison } from '../hooks/useASTComparison';
import { Eye, CheckCircle, XCircle, Activity, Code2, AlertTriangle } from 'lucide-react';

interface Props {
  problemId: number;
  studentCode: string;
}

export default function ASTTestPanel({ problemId, studentCode }: Props) {
  const { compare, result, feedback, summary, isComparing, error, clear } = useASTComparison();
  const [showDetails, setShowDetails] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false);

  const handleCompare = () => {
    compare(problemId, studentCode);
  };

  // Extract complexity from result if available
  const complexity = result?.stats?.complexity || null;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 font-semibold">
          <XCircle size={20} />
          <span>AST Comparison Error</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button 
          onClick={clear}
          className="mt-2 text-sm text-red-700 underline"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Code2 size={20} />
          <span className="font-semibold">AST Structure Analysis</span>
        </div>
        <button
          onClick={handleCompare}
          disabled={isComparing}
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isComparing ? 'Analyzing...' : 'Analyze Structure'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 space-y-4">
          {/* Summary Card */}
          <div className={`p-3 rounded-lg border ${
            result.matches 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.matches ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <Activity className="text-amber-600" size={20} />
              )}
              <span className={`font-semibold ${
                result.matches ? 'text-green-800' : 'text-amber-800'
              }`}>
                {result.matches ? 'Structure Match!' : 'Structure Differences Found'}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{summary}</p>
            
            {/* Similarity Score Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Similarity Score</span>
                <span>{Math.round(result.similarityScore * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    result.similarityScore > 0.8 ? 'bg-green-500' :
                    result.similarityScore > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.similarityScore * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Complexity Metrics for Advanced Users */}
          {complexity && complexity.functions_analyzed > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <button
                onClick={() => setShowComplexity(!showComplexity)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                  <AlertTriangle size={18} />
                  <span>Complexity Analysis</span>
                </div>
                <span className="text-xs text-blue-600">
                  {showComplexity ? 'Hide' : 'Show'}
                </span>
              </button>
              
              {showComplexity && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average CC:</span>
                    <span className={`font-mono font-bold ${
                      complexity.average_complexity <= 10 ? 'text-green-600' :
                      complexity.average_complexity <= 20 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {complexity.average_complexity}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max CC:</span>
                    <span className={`font-mono font-bold ${
                      complexity.max_complexity <= 10 ? 'text-green-600' :
                      complexity.max_complexity <= 20 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {complexity.max_complexity}
                    </span>
                  </div>
                  
                  {complexity.high_risk_functions.length > 0 && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                      <strong>High Risk Functions:</strong>
                      <ul className="mt-1 space-y-1">
                        {complexity.high_risk_functions.map((fn: string) => (
                          <li key={fn}>• {fn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    CC (Cyclomatic Complexity): 1-10 Simple, 11-20 Moderate, 21-50 High, 50+ Very High
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {feedback.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">Detailed Feedback:</h4>
              {feedback.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`text-sm p-2 rounded border ${
                    msg.includes('❌') || msg.includes('🚨') ? 'bg-red-50 border-red-200 text-red-700' :
                    msg.includes('⚠️') ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-gray-50 border-gray-100 text-gray-700'
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Technical Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Eye size={16} />
            {showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
          </button>

          {showDetails && (
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify({
                  matches: result.matches,
                  similarityScore: result.similarityScore,
                  totalNodes: result.stats.totalNodes,
                  matchedNodes: result.stats.matchedNodes,
                  studentDepth: result.stats.studentDepth,
                  referenceDepth: result.stats.referenceDepth,
                  complexity: complexity,
                  divergences: result.divergences.map(d => ({
                    type: d.type,
                    severity: d.severity,
                    message: d.message,
                    line: d.lineNo
                  }))
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !isComparing && (
        <div className="p-8 text-center text-gray-500">
          <Code2 className="mx-auto mb-2 opacity-50" size={48} />
          <p className="text-sm">Click "Analyze Structure" to compare your code against the golden reference</p>
        </div>
      )}

      {/* Loading State */}
      {isComparing && (
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">Analyzing AST structure...</p>
        </div>
      )}
    </div>
  );
}