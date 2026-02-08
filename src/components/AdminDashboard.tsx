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
  Cell
} from 'recharts';
import { Users, BarChart3, Award } from 'lucide-react';

/* ================= TYPES ================= */

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
}

/* ================= COMPONENT ================= */

export default function AdminDashboard({ token }: { token: string }) {
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('http://localhost:4000/progress/summary', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load admin analytics');
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchSummary();
  }, [token]);

  /* ================= STATES ================= */

  if (error) {
    return (
      <div className="p-10 text-red-600 font-semibold">
        Error loading admin dashboard: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 font-mono text-gray-600">
        Loading Instructor Analytics…
      </div>
    );
  }

  /* ================= CONSTANTS ================= */

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899'];

  /* ================= RENDER ================= */

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* ---------- HEADER ---------- */}
        <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <BarChart3 className="text-indigo-600" />
          Instructor Analytics
        </h1>

        {/* ---------- SUMMARY CARDS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <Users className="text-indigo-500 mb-2" />
            <div className="text-sm text-gray-500">Average Problems Solved</div>
            <div className="text-2xl font-bold">
              {Math.round(data.averages.avg_solved)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <Award className="text-emerald-500 mb-2" />
            <div className="text-sm text-gray-500">Average Success Rate</div>
            <div className="text-2xl font-bold">
              {Math.round(data.averages.avg_success * 100)}%
            </div>
          </div>
        </div>

        {/* ---------- CHARTS ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-4">Skill Level Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.skillDistribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {data.skillDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-4">Class Performance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.skillDistribution}>
                  <XAxis dataKey="level" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
