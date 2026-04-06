import React from 'react';
import type { UserProfile } from '../../../types';
import type { Problem } from '../../../utils/problemDatabase';

interface SidebarProps {
  recommendedProblems: Problem[];
  currentProblem: Problem;
  userProfile: UserProfile;
  visibleConceptMastery: Record<string, number>;
  onSelectProblem: (p: Problem) => void;
  onNextProblem: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  recommendedProblems,
  currentProblem,
  userProfile,
  visibleConceptMastery,
  onSelectProblem,
  onNextProblem,
}) => {
  const [masteryView, setMasteryView] = React.useState<'weakest' | 'strongest'>('weakest');

  const masteryItems = Object.entries(visibleConceptMastery)
    .sort((a, b) => masteryView === 'weakest' ? a[1] - b[1] : b[1] - a[1])
    .slice(0, 8);

  return (
  <div className="col-span-3 space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">
        Tasks
        <span className="ml-2 text-[10px] font-normal text-slate-400">sorted by mastery gap</span>
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
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-slate-50 hover:bg-slate-100 border-transparent'
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-slate-800">{p.title}</div>
                <div
                  className={`text-[10px] uppercase font-semibold mt-0.5 ${
                    p.difficulty === 'hard'
                      ? 'text-rose-600'
                      : p.difficulty === 'medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {p.difficulty}
                </div>
              </div>
              {solved && <span className="text-emerald-700 text-xs font-semibold">Solved</span>}
            </button>
          );
        })}
      </div>
    </div>

    <button
      onClick={onNextProblem}
      className="w-full rounded-xl bg-indigo-600 p-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
    >
      Next Problem
    </button>

    {Object.keys(visibleConceptMastery).length > 0 && (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-slate-500">
            {masteryView === 'weakest' ? 'Weakest Concepts (Global)' : 'Strongest Concepts (Global)'}
          </h3>
          <div className="flex rounded-md border border-slate-200 p-0.5 text-[10px]">
            <button
              onClick={() => setMasteryView('weakest')}
              className={`rounded px-2 py-0.5 ${
                masteryView === 'weakest' ? 'bg-indigo-600 text-white' : 'text-slate-500'
              }`}
            >
              Weakest
            </button>
            <button
              onClick={() => setMasteryView('strongest')}
              className={`rounded px-2 py-0.5 ${
                masteryView === 'strongest' ? 'bg-indigo-600 text-white' : 'text-slate-500'
              }`}
            >
              Strongest
            </button>
          </div>
        </div>

        <p className="mb-3 text-[10px] text-slate-400">
          Showing top 8 {masteryView} concepts that have matching practice problems.
        </p>

        {currentProblem.concepts.length > 0 && (
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase text-indigo-700">
              Current Problem Concepts
            </div>
            <div className="space-y-1.5">
              {currentProblem.concepts.map(concept => {
                const value = userProfile.conceptMastery[concept] ?? 0.3;
                return (
                  <div key={concept} className="flex items-center justify-between text-[11px] text-slate-700">
                    <span>{concept}</span>
                    <span className="font-semibold text-indigo-700">{Math.round(value * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {masteryItems.map(([concept, value]) => (
              <div key={concept}>
                <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                  <span>{concept}</span>
                  <span>{Math.round(value * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
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

    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
        Progress Stats
      </h3>
      <div className="space-y-1 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Hints used</span>
          <span className="font-semibold">{userProfile.hintsUsed}</span>
        </div>
        <div className="flex justify-between">
          <span>Total submissions</span>
          <span className="font-semibold">{userProfile.totalSubmissions}</span>
        </div>
        <div className="flex justify-between">
          <span>Last solve time</span>
          <span className="font-semibold">
            {userProfile.lastSolveTimeSeconds > 0 ? `${userProfile.lastSolveTimeSeconds}s` : '—'}
          </span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Sidebar;