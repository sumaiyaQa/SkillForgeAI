import React from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { computeOverallMastery } from '../../../utils/userProfile';

interface AdaptiveBannerProps {
  weakestConcept: string | null;
  conceptMastery: Record<string, number>;
  trajectoryLength: number;
}

const AdaptiveBanner: React.FC<AdaptiveBannerProps> = ({
  weakestConcept,
  conceptMastery,
  trajectoryLength,
}) => (
  <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Target size={14} className="text-indigo-500" />
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
          Adaptive Focus:
        </span>
        <span className="text-xs text-indigo-600">
          {weakestConcept
            ? `Strengthen "${weakestConcept}" — problems requiring this concept are prioritised in your task list`
            : 'Complete your first problem to enable adaptive recommendations'}
        </span>
      </div>

      {trajectoryLength > 1 && (
        <div className="flex items-center gap-2 text-xs text-indigo-500">
          <TrendingUp size={12} />
          <span>
            Overall mastery: {Math.round(computeOverallMastery(conceptMastery) * 100)}%
          </span>
        </div>
      )}
    </div>
  </div>
);

export default AdaptiveBanner;