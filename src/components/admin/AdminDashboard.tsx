import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  Users, BarChart3, Award, MessageSquare, TrendingUp,
  AlertCircle, Trash2, RefreshCw, BookOpen, Plus, Pencil,
  Save, X, Shield,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SkillDistributionItem {
  level: 'beginner' | 'intermediate' | 'advanced';
  count: number;
}

interface ProgressSummary {
  averages: { avg_solved: number; avg_success: number };
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
  created_at: string;
}

interface StudentUser {
  id: number;
  email: string;
  role: string;
  skill_level: string;
  created_at: string;
  problems_solved: number;
  total_submissions: number;
  successful_submissions: number;
  hints_used: number;
  last_active: string | null;
}

interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  starter_code: string;
  concepts: string[];
  function_name: string | null;
  example_cases: Array<{ input: string; output: string }>;
  updated_at: string;
}

type ProblemDraft = Omit<Problem, 'id' | 'updated_at'>;
type TabKey = 'overview' | 'concepts' | 'errors' | 'users' | 'problems' | 'feedback';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const BLANK_DRAFT: ProblemDraft = {
  title: '',
  difficulty: 'easy',
  description: '',
  starter_code: '',
  concepts: [],
  function_name: '',
  example_cases: [{ input: '', output: '' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable components
// ─────────────────────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center">
      <BarChart3 size={36} className="text-gray-200 mb-2" />
      <p className="text-sm font-medium text-gray-400">{message}</p>
      <p className="text-xs text-gray-300 mt-1">Data appears as students use the platform</p>
    </div>
  );
}

function SkillBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    beginner:     'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced:     'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors[level] ?? 'bg-gray-100 text-gray-500'}`}>
      {level}
    </span>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    easy:   'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    hard:   'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors[level] ?? 'bg-gray-100 text-gray-500'}`}>
      {level}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Problem Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function ProblemFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ProblemDraft;
  onSave: (draft: ProblemDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft]             = useState<ProblemDraft>(initial);
  const [conceptInput, setConceptInput] = useState((initial.concepts ?? []).join(', '));
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState('');

  const set = (key: keyof ProblemDraft, value: any) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const updateCase = (i: number, field: 'input' | 'output', value: string) =>
    set('example_cases', draft.example_cases.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c
    ));

  const handleSubmit = async () => {
    if (!draft.title.trim() || !draft.description.trim() || !draft.starter_code.trim()) {
      setErr('Title, description and starter code are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await onSave({
        ...draft,
        concepts: conceptInput.split(',').map(s => s.trim()).filter(Boolean),
      });
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-black text-lg text-gray-900">
            {initial.title ? `Edit: ${initial.title}` : 'New Problem'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Title + Difficulty */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title *</label>
              <input
                value={draft.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Two Sum"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty *</label>
              <select
                value={draft.difficulty}
                onChange={e => set('difficulty', e.target.value as any)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description *</label>
            <textarea
              value={draft.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe what the student needs to implement…"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Starter code */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starter Code *</label>
            <textarea
              value={draft.starter_code}
              onChange={e => set('starter_code', e.target.value)}
              placeholder={'def my_func(x):\n    # Write your code here\n    pass'}
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>

          {/* Function name + concepts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Function Name</label>
              <input
                value={draft.function_name ?? ''}
                onChange={e => set('function_name', e.target.value)}
                placeholder="e.g. my_func"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Concepts (comma-separated)
              </label>
              <input
                value={conceptInput}
                onChange={e => setConceptInput(e.target.value)}
                placeholder="e.g. loops, recursion, lists"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Test cases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Test Cases</label>
              <button
                onClick={() => set('example_cases', [...draft.example_cases, { input: '', output: '' }])}
                className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
              >
                <Plus size={12} /> Add case
              </button>
            </div>
            <div className="space-y-2">
              {draft.example_cases.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c.input}
                    onChange={e => updateCase(i, 'input', e.target.value)}
                    placeholder="Input (e.g. 5, 3)"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-gray-400 text-xs">→</span>
                  <input
                    value={c.output}
                    onChange={e => updateCase(i, 'output', e.target.value)}
                    placeholder="Expected output"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {draft.example_cases.length > 1 && (
                    <button
                      onClick={() => set('example_cases', draft.example_cases.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-red-600 font-medium">{err}</p>}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard({ token }: { token: string }) {

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Analytics
  const [summary,  setSummary]  = useState<ProgressSummary | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);

  // User management
  const [users,        setUsers]        = useState<StudentUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [skillOverride, setSkillOverride] = useState<Record<number, string>>({});
  const [userMsg, setUserMsg] = useState('');

  // Problem management
  const [problems,          setProblems]          = useState<Problem[]>([]);
  const [problemsLoading,   setProblemsLoading]   = useState(false);
  const [editingProblem,    setEditingProblem]    = useState<Problem | null>(null);
  const [creatingProblem,   setCreatingProblem]   = useState(false);
  const [problemMsg,        setProblemMsg]        = useState('');

  const [globalError, setGlobalError] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/progress/summary', { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load analytics');
      setSummary(await res.json());
    } catch (e: any) { setGlobalError(e.message); }
  }, [token]);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/feedback', { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load feedback');
      setFeedback(await res.json());
    } catch (e: any) { setGlobalError(e.message); }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('http://localhost:4000/admin/users', { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (e: any) { setGlobalError(e.message); }
    finally { setUsersLoading(false); }
  }, [token]);

  const fetchProblems = useCallback(async () => {
    setProblemsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/admin/problems', { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load problems');
      setProblems(await res.json());
    } catch (e: any) { setGlobalError(e.message); }
    finally { setProblemsLoading(false); }
  }, [token]);

  useEffect(() => { fetchSummary(); fetchFeedback(); }, []);
  useEffect(() => { if (activeTab === 'users')    fetchUsers();    }, [activeTab]);
  useEffect(() => { if (activeTab === 'problems') fetchProblems(); }, [activeTab]);

  // ── User actions ────────────────────────────────────────────────────────────

  const flash = (setter: React.Dispatch<React.SetStateAction<string>>, msg: string) => {
    setter(msg);
    setTimeout(() => setter(''), 3500);
  };

  const handleSkillOverride = async (userId: number) => {
    const level = skillOverride[userId];
    if (!level) return;
    await fetch(`http://localhost:4000/admin/users/${userId}/skill`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillLevel: level }),
    });
    flash(setUserMsg, 'Skill level updated.');
    fetchUsers();
  };

  const handleResetProgress = async (userId: number, email: string) => {
    if (!confirm(`Reset all progress for ${email}? This cannot be undone.`)) return;
    await fetch(`http://localhost:4000/admin/users/${userId}/reset`, {
      method: 'POST', headers: authHeader,
    });
    flash(setUserMsg, `Progress reset for ${email}.`);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Permanently delete account for ${email}?`)) return;
    await fetch(`http://localhost:4000/admin/users/${userId}`, {
      method: 'DELETE', headers: authHeader,
    });
    flash(setUserMsg, `${email} deleted.`);
    fetchUsers();
  };

  // ── Problem actions ─────────────────────────────────────────────────────────

  const handleCreateProblem = async (draft: ProblemDraft) => {
    const res = await fetch('http://localhost:4000/admin/problems', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    flash(setProblemMsg, 'Problem created successfully.');
    fetchProblems();
  };

  const handleUpdateProblem = async (draft: ProblemDraft) => {
    if (!editingProblem) return;
    const res = await fetch(`http://localhost:4000/admin/problems/${editingProblem.id}`, {
      method: 'PUT',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    flash(setProblemMsg, 'Problem updated successfully.');
    fetchProblems();
  };

  const handleDeleteProblem = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch(`http://localhost:4000/admin/problems/${id}`, {
      method: 'DELETE', headers: authHeader,
    });
    flash(setProblemMsg, `"${title}" deleted.`);
    fetchProblems();
  };

  // ── Derived chart data ──────────────────────────────────────────────────────

  const conceptData = Object.entries(summary?.conceptHeatmap ?? {})
    .map(([concept, mastery]) => ({ concept, mastery: Math.round(mastery * 100) }))
    .sort((a, b) => a.mastery - b.mastery);

  const errorData = Object.entries(summary?.errorFrequency ?? {})
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count);

  const trajectoryData = (summary?.trajectory ?? []).map(pt => ({
    time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mastery: Math.round(pt.overallMastery * 100),
  }));

  const totalStudents = summary?.totalStudents
    ?? summary?.skillDistribution.reduce((a, d) => a + d.count, 0)
    ?? 0;

  const avgRating = (() => {
    const rated = feedback.filter(f => f.rating !== null);
    if (!rated.length) return '—';
    return (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1);
  })();

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',  label: 'Overview',                       icon: <BarChart3 size={13} /> },
    { key: 'concepts',  label: 'Concept Mastery',                icon: <TrendingUp size={13} /> },
    { key: 'errors',    label: 'Error Patterns',                 icon: <AlertCircle size={13} /> },
    { key: 'users',     label: `Users (${totalStudents})`,       icon: <Users size={13} /> },
    { key: 'problems',  label: `Problems (${problems.length || '…'})`, icon: <BookOpen size={13} /> },
    { key: 'feedback',  label: `Feedback (${feedback.length})`,  icon: <MessageSquare size={13} /> },
  ];

  // ── Early returns ────────────────────────────────────────────────────────────

  if (globalError) {
    return (
      <div className="p-10 flex items-center gap-3 text-red-600 font-semibold">
        <AlertCircle size={20} /> {globalError}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-10 text-gray-500 text-sm animate-pulse font-mono">
        Loading instructor analytics…
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* Modals */}
      {creatingProblem && (
        <ProblemFormModal
          initial={BLANK_DRAFT}
          onSave={handleCreateProblem}
          onClose={() => setCreatingProblem(false)}
        />
      )}
      {editingProblem && (
        <ProblemFormModal
          initial={{
            title:         editingProblem.title,
            difficulty:    editingProblem.difficulty,
            description:   editingProblem.description,
            starter_code:  editingProblem.starter_code,
            concepts:      editingProblem.concepts,
            function_name: editingProblem.function_name,
            example_cases: editingProblem.example_cases,
          }}
          onSave={handleUpdateProblem}
          onClose={() => setEditingProblem(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl">
              <Shield className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Instructor Dashboard</h1>
              <p className="text-xs text-gray-400 uppercase tracking-wider">SkillForge AI Admin</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-mono bg-white border px-3 py-1.5 rounded-full">
            Live data · refreshes on tab switch
          </span>
        </div>

        {/* ── Insight banner ── */}
        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-8 rounded-r-xl">
          <h2 className="text-indigo-900 font-bold flex items-center gap-2 mb-1">💡 Instructor Insight</h2>
          <p className="text-indigo-700 text-sm">
            {conceptData.length > 0 ? (
              <>Your class is struggling most with <strong>"{conceptData[0]?.concept}"</strong>{' '}
              ({conceptData[0]?.mastery}% avg mastery). Most common error: <strong>{errorData[0]?.error ?? 'none'}</strong>.</>
            ) : (
              'No mastery data yet — insights will appear once students solve problems.'
            )}
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {[
            { icon: <Users size={18} className="text-indigo-500" />,   label: 'Students',           value: totalStudents },
            { icon: <Award size={18} className="text-emerald-500" />,  label: 'Avg Problems Solved', value: Math.round(summary.averages.avg_solved ?? 0) },
            { icon: <TrendingUp size={18} className="text-purple-500" />, label: 'Avg Success Rate', value: `${Math.round((summary.averages.avg_success ?? 0) * 100)}%` },
            { icon: <MessageSquare size={18} className="text-amber-500" />, label: 'Avg Problem Rating', value: `${avgRating}/5` },
          ].map((card, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow-sm border">
              <div className="mb-2">{card.icon}</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">{card.label}</div>
              <div className="text-3xl font-black text-gray-800 mt-1">{card.value}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold mb-4 text-gray-700">Skill Level Distribution</h3>
                {summary.skillDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={summary.skillDistribution} dataKey="count" nameKey="level"
                          cx="50%" cy="50%" outerRadius={90}
                          label={({ name, value }: any) => `${name}: ${value}`}>
                          {summary.skillDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyChart message="No students enrolled yet" />}
              </div>

              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold mb-4 text-gray-700">Students by Level</h3>
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
                ) : <EmptyChart message="No students enrolled yet" />}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-1 text-gray-700">Class Learning Trajectory</h3>
              <p className="text-xs text-gray-400 mb-4">Average concept mastery over time across all students</p>
              {trajectoryData.length >= 2 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Mastery']} />
                      <Legend />
                      <Line type="monotone" dataKey="mastery" stroke="#4f46e5" strokeWidth={2} dot={false} name="Overall Mastery" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart message="Requires students to solve at least one problem" />}
            </div>
          </div>
        )}

        {/* ════ CONCEPTS ════ */}
        {activeTab === 'concepts' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-1 text-gray-700">Concept Mastery Heatmap</h3>
            <p className="text-xs text-gray-400 mb-4">
              Average mastery per concept across all students. Lower = more practice needed.
            </p>
            {conceptData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conceptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="concept" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Avg Mastery']} />
                    <Bar dataKey="mastery" radius={[0, 4, 4, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart message="No concept mastery data yet" />}
          </div>
        )}

        {/* ════ ERRORS ════ */}
        {activeTab === 'errors' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-1 text-gray-700">Error Pattern Frequency</h3>
            <p className="text-xs text-gray-400 mb-4">
              Total occurrences of each error type across all submissions.
            </p>
            {errorData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={errorData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="error" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart message="No error data yet — appears after students submit failing code" />}
          </div>
        )}

        {/* ════ USERS ════ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {userMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-3 rounded-lg">
                ✓ {userMsg}
              </div>
            )}

            {usersLoading ? (
              <div className="text-gray-400 text-sm animate-pulse p-6">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No students registered yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500 font-bold tracking-wider">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Solved</th>
                      <th className="px-4 py-3">Success</th>
                      <th className="px-4 py-3">Hints</th>
                      <th className="px-4 py-3">Last Active</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const rate = u.total_submissions > 0
                        ? Math.round((u.successful_submissions / u.total_submissions) * 100)
                        : 0;
                      return (
                        <tr key={u.id} className="border-b last:border-none hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-indigo-600">{u.email.split('@')[0]}</div>
                            <div className="text-[10px] text-gray-400">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <SkillBadge level={u.skill_level} />
                              <select
                                value={skillOverride[u.id] ?? u.skill_level}
                                onChange={e => setSkillOverride(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="text-xs border rounded px-1 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              >
                                <option value="beginner">beginner</option>
                                <option value="intermediate">intermediate</option>
                                <option value="advanced">advanced</option>
                              </select>
                              <button
                                onClick={() => handleSkillOverride(u.id)}
                                title="Save override"
                                className="text-indigo-500 hover:text-indigo-700 transition-colors"
                              >
                                <Save size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-700">{u.problems_solved}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${rate >= 60 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.hints_used}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleResetProgress(u.id, u.email)}
                                className="flex items-center gap-1 text-xs text-amber-600 border border-amber-200 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                              >
                                <RefreshCw size={11} /> Reset
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ PROBLEMS ════ */}
        {activeTab === 'problems' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-lg">
                Problems created here are stored in the database and available to all students immediately — no code changes required.
              </p>
              <button
                onClick={() => setCreatingProblem(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={15} /> New Problem
              </button>
            </div>

            {problemMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-3 rounded-lg">
                ✓ {problemMsg}
              </div>
            )}

            {problemsLoading ? (
              <div className="text-gray-400 text-sm animate-pulse p-6">Loading problems…</div>
            ) : problems.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border text-center text-gray-400">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm mb-2">No database problems yet.</p>
                <p className="text-xs text-gray-300">
                  The built-in problemDatabase.ts is always available. Use this tab to add or manage extra problems.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500 font-bold tracking-wider">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Concepts</th>
                      <th className="px-4 py-3">Tests</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map(p => (
                      <tr key={p.id} className="border-b last:border-none hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{p.id}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{p.title}</td>
                        <td className="px-4 py-3"><DifficultyBadge level={p.difficulty} /></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.concepts ?? []).slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
                            ))}
                            {(p.concepts ?? []).length > 3 && (
                              <span className="text-[10px] text-gray-400">+{p.concepts.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{(p.example_cases ?? []).length}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingProblem(p)}
                              className="flex items-center gap-1 text-xs text-indigo-500 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProblem(p.id, p.title)}
                              className="flex items-center gap-1 text-xs text-red-400 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ FEEDBACK ════ */}
        {activeTab === 'feedback' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
              <MessageSquare className="text-indigo-600" size={18} /> Student Feedback
            </h2>
            {feedback.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No feedback submitted yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500 font-bold tracking-wider">
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Problem</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Comment</th>
                    <th className="py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map(f => (
                    <tr key={f.id} className="border-b last:border-none hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-indigo-600">{f.email.split('@')[0]}</td>
                      <td className="py-3 px-3">#{f.problem_id}</td>
                      <td className="py-3 px-3">
                        {f.rating !== null ? (
                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                            f.rating >= 4 ? 'bg-emerald-100 text-emerald-700'
                            : f.rating === 3 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>{f.rating}/5</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-3 max-w-sm text-gray-600">
                        {f.comment || <span className="text-gray-300 italic">no comment</span>}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-400">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}