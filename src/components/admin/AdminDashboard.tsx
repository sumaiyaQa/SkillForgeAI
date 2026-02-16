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
} from 'recharts';
import { Users, BarChart3, Award, MessageSquare } from 'lucide-react';
import { LineChart, Line } from 'recharts';

// TYPES

//  Represents aggregated progress statistics returned from the admin analytics endpoint.
 
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
  trajectory?: {
    timestamp: number;
    overallMastery: number;
  }[];
}



//  Represents a single feedback entry as seen by an admin.
// Combines student feedback with optional admin moderation data.
 
interface AdminFeedback {
  id: number;
  email: string;
  problem_id: number;
  rating: number | null;
  comment: string;
  status?: string;
  admin_response?: string;
  created_at: string;
}


// COMPONENT

export default function AdminDashboard({ token }: { token: string }) {
// STATE

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);

// FETCH ANALYTICS

  
  // Loads high-level progress analytics for instructors.
  // This data is used for charts and summary cards.
   
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
        setSummary(json);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchSummary();
  }, [token]);

  // FETCH FEEDBACK

  // Loads all student feedback for administrative review.
  // This endpoint is protected by role-based access control.
   
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch('http://localhost:4000/feedback', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load feedback');
        }

        const json = await res.json();
        setFeedback(json);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchFeedback();
  }, [token]);

  // LOADING STATES

  if (error) {
    return (
      <div className="p-10 text-red-600 font-semibold">
        Error loading admin dashboard: {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-10 font-mono text-gray-600">
        Loading Instructor Analytics…
      </div>
    );
  }


  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899'];


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/*HEADER*/}
        <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <BarChart3 className="text-indigo-600" />
          Instructor Analytics
        </h1>

        {/*SUMMARY CARDS*/}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <Users className="text-indigo-500 mb-2" />
            <div className="text-sm text-gray-500">
              Average Problems Solved
            </div>
            <div className="text-2xl font-bold">
              {Math.round(summary.averages.avg_solved)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <Award className="text-emerald-500 mb-2" />
            <div className="text-sm text-gray-500">
              Average Success Rate
            </div>
            <div className="text-2xl font-bold">
              {Math.round(summary.averages.avg_success * 100)}%
            </div>
          </div>
        </div>

        {/*CHARTS*/}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Skill Distribution Pie */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-4">Skill Level Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.skillDistribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {summary.skillDistribution.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class Overview Bar Chart */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-4">Class Performance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.skillDistribution}>
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


{summary.conceptHeatmap && Object.keys(summary.conceptHeatmap).length > 0 && (
  <div className="bg-white p-6 rounded-xl border shadow-sm mb-12">
    <h3 className="font-bold mb-4">Concept Mastery Heatmap</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={Object.entries(summary.conceptHeatmap).map(
            ([concept, value]) => ({
              concept,
              mastery: Math.round(value * 100),
            })
          )}
        >
          <XAxis dataKey="concept" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="mastery" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

{summary.trajectory && summary.trajectory.length > 0 && (
  <div className="bg-white p-6 rounded-xl border shadow-sm mb-12">
    <h3 className="font-bold mb-4">Learning Trajectory</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={summary.trajectory}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) =>
              new Date(t).toLocaleTimeString()
            }
          />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="overallMastery"
            stroke="#4f46e5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

{summary.errorFrequency && Object.keys(summary.errorFrequency).length > 0 && (
  <div className="bg-white p-6 rounded-xl border shadow-sm">
    <h3 className="font-bold mb-4">Error Pattern Frequency</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={Object.entries(summary.errorFrequency).map(
            ([error, count]) => ({
              error,
              count,
            })
          )}
        >
          <XAxis dataKey="error" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#ec4899" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)}



        {/* FEEDBACK TABLE */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="text-indigo-600" />
            Student Feedback
          </h2>

          <table className="w-full text-sm border-collapse">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2">Student</th>
                <th>Problem</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {feedback.map(f => (
                <tr key={f.id} className="border-b last:border-none">
                  <td className="py-2">{f.email}</td>
                  <td>{f.problem_id}</td>
                  <td>{f.rating ?? '—'}</td>
                  <td className="max-w-md">{f.comment}</td>
                  <td className="font-medium">
                    {f.status ?? 'open'}
                  </td>
                </tr>
              ))}

              {feedback.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-gray-500"
                  >
                    No feedback submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
