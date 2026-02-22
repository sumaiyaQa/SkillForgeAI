import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Users, BarChart3, Award, MessageSquare, TrendingUp, AlertCircle, Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillDistributionItem {
  level: 'beginner' | 'intermediate' | 'advanced';
  count: number;
}

interface ProgressSummary {
  averages: {
    avg_solved: number;
    avg_success: number;
  };
  skillDistribution: SkillDistributionItem[];
  conceptHeatmap?: Record<string, number>;
  errorFrequency?: Record<string, number>;
  trajectory?: Array<{ timestamp: number; overallMastery: number }>;
  totalStudents?: number;
}

interface AdminFeedback {
  id: number;
  email: string;
  problem_id: number;
  rating: number | null;
  comment: string;
  status?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-300">
      <BarChart3 size={40} className="mb-2" />
      <p className="text-sm font-medium text-gray-400">{message}</p>
      <p className="text-xs text-gray-300 mt-1">Data will appear as students use the platform</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard({ token }: { token: string }) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'concepts' | 'errors' | 'feedback'>(
    'overview'
  );

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  // -------------------------------------------------------------------------
  // Fetch analytics
  // -------------------------------------------------------------------------

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('http://localhost:4000/progress/summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load admin analytics');
        const json = await res.json();
        setSummary(json);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    fetchSummary();
  }, [token]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch('http://localhost:4000/feedback', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load feedback');
        const json = await res.json();
        setFeedback(json);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    fetchFeedback();
  }, [token]);

  // -------------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-10 flex items-center gap-3 text-red-600 font-semibold">
        <AlertCircle size={20} />
        Error loading admin dashboard: {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-10 font-mono text-gray-500 text-sm animate-pulse">
        Loading instructor analytics…
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const conceptHeatmapData = Object.entries(summary.conceptHeatmap ?? {})
    .map(([concept, mastery]) => ({ concept, mastery: Math.round(mastery * 100) }))
    .sort((a, b) => a.mastery - b.mastery);

  const errorFrequencyData = Object.entries(summary.errorFrequency ?? {})
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count);

  const trajectoryData = (summary.trajectory ?? []).map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mastery: Math.round(point.overallMastery * 100),
  }));

  const weakestConcept = conceptHeatmapData[0]?.concept ?? 'N/A';
  const mostCommonError = errorFrequencyData[0]?.error ?? 'None detected';
  const totalStudents =
    summary.totalStudents ??
    summary.skillDistribution.reduce((acc, d) => acc + d.count, 0);

  const avgRating =
    feedback.filter(f => f.rating !== null).length > 0
      ? (
          feedback.filter(f => f.rating !== null).reduce((s, f) => s + (f.rating ?? 0), 0) /
          feedback.filter(f => f.rating !== null).length
        ).toFixed(1)
      : '—';

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'concepts', label: 'Concept Mastery' },
    { key: 'errors', label: 'Error Patterns' },
    { key: 'feedback', label: `Feedback (${feedback.length})` },
  ] as const;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-indigo-600" />
            Instructor Analytics
          </h1>
          <span className="text-xs text-gray-400 font-mono">
            Live data · refreshes on page load
          </span>
        </div>

        {/* Insight banner */}
        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-8 rounded-r-xl">
          <h2 className="text-indigo-900 font-bold flex items-center gap-2 mb-1">
            💡 Instructor Insight
          </h2>
          <p className="text-indigo-700 text-sm">
            {conceptHeatmapData.length > 0 ? (
              <>
                Your class is struggling most with{' '}
                <strong>"{weakestConcept}"</strong> (avg mastery:{' '}
                {conceptHeatmapData[0]?.mastery ?? 0}%). The most frequent
                error type is <strong>{mostCommonError}</strong>. Consider
                revisiting related problems in your next session.
              </>
            ) : (
              'No mastery data yet. Students need to solve problems before insights appear here.'
            )}
          </p>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <Users className="text-indigo-500 mb-2" size={20} />
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Students</div>
            <div className="text-3xl font-black text-gray-800 mt-1">{totalStudents}</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <Award className="text-emerald-500 mb-2" size={20} />
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Avg Problems Solved</div>
            <div className="text-3xl font-black text-gray-800 mt-1">
              {Math.round(summary.averages.avg_solved ?? 0)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <TrendingUp className="text-purple-500 mb-2" size={20} />
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Avg Success Rate</div>
            <div className="text-3xl font-black text-gray-800 mt-1">
              {Math.round((summary.averages.avg_success ?? 0) * 100)}%
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <MessageSquare className="text-amber-500 mb-2" size={20} />
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Avg Problem Rating</div>
            <div className="text-3xl font-black text-gray-800 mt-1">{avgRating} <span className="text-sm text-gray-400">/ 5</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---- Overview Tab ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Skill distribution pie */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold mb-4 text-gray-700">Skill Level Distribution</h3>
                {summary.skillDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.skillDistribution}
                          dataKey="count"
                          nameKey="level"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                            label={({ name, value }: any) => `${name}: ${value}`}
                        >
                          {summary.skillDistribution.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No students enrolled yet" />
                )}
              </div>

              {/* Skill level bar chart */}
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold mb-4 text-gray-700">Student Count by Level</h3>
                {summary.skillDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.skillDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="No students enrolled yet" />
                )}
              </div>
            </div>

            {/* Learning trajectory */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-1 text-gray-700">Class Learning Trajectory</h3>
              <p className="text-xs text-gray-400 mb-4">
                Average overall concept mastery over time across all students
              </p>
              {trajectoryData.length >= 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, 'Mastery']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="mastery"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={false}
                        name="Overall Mastery"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Trajectory data requires students to solve problems" />
              )}
            </div>
          </div>
        )}

        {/* ---- Concepts Tab ---- */}
        {activeTab === 'concepts' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-1 text-gray-700">Concept Mastery Heatmap</h3>
            <p className="text-xs text-gray-400 mb-4">
              Average mastery (0–100%) per concept across all students. Lower scores indicate where
              the class needs more practice.
            </p>
            {conceptHeatmapData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conceptHeatmapData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="concept" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Avg Mastery']} />
                    <Bar
                      dataKey="mastery"
                      radius={[0, 4, 4, 0]}
                      fill="#8b5cf6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No concept mastery data yet" />
            )}
          </div>
        )}

        {/* ---- Errors Tab ---- */}
        {activeTab === 'errors' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-1 text-gray-700">Error Pattern Frequency</h3>
            <p className="text-xs text-gray-400 mb-4">
              Total occurrences of each error type across all student submissions. Use this to
              identify systemic misconceptions.
            </p>
            {errorFrequencyData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={errorFrequencyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="error" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No error data yet — errors are tracked after students submit failing code" />
            )}
          </div>
        )}

        {/* ---- Feedback Tab ---- */}
        {activeTab === 'feedback' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
              <MessageSquare className="text-indigo-600" size={18} />
              Student Feedback
            </h2>

            {feedback.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No feedback submitted yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500 font-bold tracking-wider">
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Problem</th>
                      <th className="py-3 px-3">Rating</th>
                      <th className="py-3 px-3">Comment</th>
                      <th className="py-3 px-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map(f => (
                      <tr key={f.id} className="border-b last:border-none hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-indigo-600">
                          {f.email.split('@')[0]}
                        </td>
                        <td className="py-3 px-3">#{f.problem_id}</td>
                        <td className="py-3 px-3">
                          {f.rating !== null ? (
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                                f.rating >= 4
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : f.rating === 3
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {f.rating}/5
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs text-gray-600">
                          {f.comment || <span className="text-gray-300 italic">no comment</span>}
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {new Date(f.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}