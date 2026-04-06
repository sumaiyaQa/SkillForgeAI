import React from 'react';
import type { AuthUser, UserProfile } from '../../../types';

interface HeaderProps {
  authUser: AuthUser;
  userProfile: UserProfile;
  solvedCount: number;
  totalProblems: number;
  progressPercent: number;
  successRate: number;
  onLogout: () => void;
  onAdminClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  authUser,
  userProfile,
  solvedCount,
  totalProblems,
  progressPercent,
  successRate,
  onLogout,
  onAdminClick,
}) => (
  <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">SkillForge AI</h1>
        <p className="text-xs text-slate-500">Adaptive Python Tutor</p>
      </div>

      <div className="flex items-center gap-4">
        {authUser.role === 'admin' && (
          <button
            onClick={onAdminClick}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Admin Dashboard
          </button>
        )}

        <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Level</div>
            <div className="text-sm font-semibold capitalize text-indigo-700">{userProfile.skillLevel}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Solved</div>
            <div className="text-sm font-semibold text-slate-800">
              {solvedCount}<span className="text-slate-400">/{totalProblems}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Success</div>
            <div className="text-sm font-semibold text-emerald-700">{successRate}%</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Avg Time</div>
            <div className="text-sm font-semibold text-slate-700">
              {userProfile.averageSolveTimeSeconds > 0 ? `${userProfile.averageSolveTimeSeconds}s` : '-'}
            </div>
          </div>

          <div className="w-28">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Progress</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-0.5 text-[10px] text-right text-slate-500">{Math.round(progressPercent)}%</div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Logged in as</span>
            <span className="text-xs font-semibold text-slate-800">{authUser.email.split('@')[0]}</span>
          </div>

          <button
            onClick={onLogout}
            className="rounded px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;