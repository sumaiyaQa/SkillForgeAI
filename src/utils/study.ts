export type StudyGroup = 'experimental' | 'control';

export interface StudyParticipant {
  id: string;
  group: StudyGroup;
  metrics: unknown;
}

// Accepts the live userProfile object directly — no localStorage dependency.
export function exportStudyData(profile: Record<string, unknown>): void {
  try {
    if (!profile) return;

    const lines: string[] = [];
    lines.push('metric,value');

    const simpleKeys = [
      'problemsSolved',
      'hintsUsed',
      'totalSubmissions',
      'successfulSubmissions',
      'totalSolveTimeSeconds',
      'averageSolveTimeSeconds',
      'lastSolveTimeSeconds',
      'skillLevel',
    ] as const;

    simpleKeys.forEach(key => {
      if (key in profile) {
        lines.push(`${key},${String(profile[key])}`);
      }
    });

    // Success rate derived metric
    const total = Number(profile['totalSubmissions'] ?? 0);
    const successful = Number(profile['successfulSubmissions'] ?? 0);
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
    lines.push(`successRate,${successRate}`);

    // Error patterns
    if (profile.errorPatterns && typeof profile.errorPatterns === 'object') {
      const errors = profile.errorPatterns as Record<string, number>;
      Object.entries(errors).forEach(([errType, count]) => {
        lines.push(`error_${errType},${count}`);
      });
    }

    // Concept mastery
    if (profile.conceptMastery && typeof profile.conceptMastery === 'object') {
      const mastery = profile.conceptMastery as Record<string, number>;
      Object.entries(mastery).forEach(([concept, value]) => {
        lines.push(`mastery_${concept},${value.toFixed(3)}`);
      });
    }

    // Solved problem IDs
    if (Array.isArray(profile.solvedProblemIds)) {
      lines.push(`solvedProblemIds,"${(profile.solvedProblemIds as number[]).join(';')}"`);
    }

    // Learning trajectory summary
    if (Array.isArray(profile.learningTrajectory) && profile.learningTrajectory.length > 0) {
      const traj = profile.learningTrajectory as Array<{ timestamp: number; overallMastery: number }>;
      const latest = traj[traj.length - 1];
      lines.push(`latestOverallMastery,${latest.overallMastery.toFixed(3)}`);
      lines.push(`trajectoryPoints,${traj.length}`);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillforge-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore download errors silently
  }
}