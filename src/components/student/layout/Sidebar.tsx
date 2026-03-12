import React from 'react';
import { BookOpen, TrendingUp, Clock, Zap } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface SidebarProps {
  recommendedProblems: any[];
  currentProblem: any;
  userProfile: UserProfile;
  onSelectProblem: (p: any) => void;
  onNextProblem: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  recommendedProblems,
  currentProblem,
  userProfile,
  onSelectProblem,
  onNextProblem,
}) => (
  <div className="col-span-3 space-y-6">
    {/* Problem list */}
    <div className="bg-white p-4 rounded-xl border">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <BookOpen size={16} /> Tasks
        <span className="ml-auto text-[10px] font-normal text-gray-400">sorted by mastery gap</span>
      </h3>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {recommendedProblems.map(p => {
          const solved = userProfile.solvedProblemIds.includes(p.id);
          const isActive = p.id === currentProblem.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectProblem(p)}
              className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-colors ${
                isActive
                  ? 'bg-indigo-50 border-indigo-400'
                  : 'bg-gray-50 hover:bg-gray-100 border-transparent'
              }`}
            >
              <div>
                <div className="text-xs font-bold">{p.title}</div>
                <div
                  className={`text-[10px] uppercase font-bold mt-0.5 ${
                    p.difficulty === 'hard'
                      ? 'text-red-500'
                      : p.difficulty === 'medium'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {p.difficulty}
                </div>
              </div>
              {solved && <span className="text-emerald-600 font-bold text-base">✓</span>}
            </button>
          );
        })}
      </div>
    </div>

    {/* Next problem button */}
    <button
      onClick={onNextProblem}
      className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors"
    >
      <Zap size={16} /> NEXT PROBLEM
    </button>

    {/* Mastery summary card */}
    {Object.keys(userProfile.conceptMastery).length > 0 && (
      <div className="bg-white p-4 rounded-xl border">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
          <TrendingUp size={14} /> Concept Mastery
        </h3>
        <div className="space-y-2">
          {Object.entries(userProfile.conceptMastery)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 8)
            .map(([concept, value]) => (
              <div key={concept}>
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>{concept}</span>
                  <span>{Math.round(value * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      value >= 0.75 ? 'bg-emerald-500' : value >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    )}

    {/* Session stats card */}
    <div className="bg-white p-4 rounded-xl border">
      <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
        <Clock size={14} /> Session Stats
      </h3>
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Hints used</span>
          <span className="font-bold">{userProfile.hintsUsed}</span>
        </div>
        <div className="flex justify-between">
          <span>Total submissions</span>
          <span className="font-bold">{userProfile.totalSubmissions}</span>
        </div>
        <div className="flex justify-between">
          <span>Last solve time</span>
          <span className="font-bold">
            {userProfile.lastSolveTimeSeconds > 0 ? `${userProfile.lastSolveTimeSeconds}s` : '—'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default Sidebar;