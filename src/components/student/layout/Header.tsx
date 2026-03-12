import React from 'react';
import { Code2, Download, TrendingUp, Clock, Target } from 'lucide-react';
import type { AuthUser, UserProfile } from '../../../types';
import { exportStudyData } from '../../../utils/study';

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
  <header className="bg-white border-b shadow-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      {/* Logo */}
      <div className="flex gap-3 items-center">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Code2 className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-xl">SkillForge AI</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Adaptive Python Tutor
          </p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex gap-5 items-center">
        <button
          onClick={() => exportStudyData(userProfile as unknown as Record<string, unknown>)}
          className="flex items-center gap-2 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
          title="Download your progress as CSV"
        >
          <Download size={12} /> EXPORT DATA
        </button>

        {authUser.role === 'admin' && (
          <button
            onClick={onAdminClick}
            className="text-xs font-bold text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors"
          >
            Admin Dashboard
          </button>
        )}

        <div className="border-l pl-5 flex gap-5 items-center">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Level</div>
            <div className="font-bold text-indigo-600 capitalize text-sm">{userProfile.skillLevel}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Solved</div>
            <div className="font-bold text-sm">
              {solvedCount}<span className="text-gray-400">/{totalProblems}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Success</div>
            <div className="font-bold text-emerald-600 text-sm">{successRate}%</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Time</div>
            <div className="font-bold text-purple-600 text-sm">
              {userProfile.averageSolveTimeSeconds > 0 ? `${userProfile.averageSolveTimeSeconds}s` : '—'}
            </div>
          </div>

          <div className="w-28">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Progress</div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-right text-gray-500 mt-0.5">{Math.round(progressPercent)}%</div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged in as</span>
            <span className="text-xs font-black text-indigo-600">{authUser.email.split('@')[0]}</span>
          </div>

          <button
            onClick={onLogout}
            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;