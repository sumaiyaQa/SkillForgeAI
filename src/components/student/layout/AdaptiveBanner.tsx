import React from 'react';
import { computeOverallMastery } from '../../../utils/userProfile';

interface AdaptiveBannerProps {
  conceptMastery: Record<string, number>;
  trajectoryLength: number;
}

const AdaptiveBanner: React.FC<AdaptiveBannerProps> = ({
  conceptMastery,
  trajectoryLength,
}) => (
  <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
    <div className="mx-auto flex max-w-7xl justify-end">
      {trajectoryLength > 1 && (
        <div className="text-xs text-slate-600">
          <span>
            Overall mastery: {Math.round(computeOverallMastery(conceptMastery) * 100)}%
          </span>
        </div>
      )}
    </div>
  </div>
);

export default AdaptiveBanner;