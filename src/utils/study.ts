export type StudyGroup = 'experimental' | 'control';

export interface StudyParticipant {
  id: string;
  group: StudyGroup;
  // We deliberately keep metrics loosely typed so we can evolve UserProfile separately.
  metrics: unknown;
}

export function exportStudyData(): void {
  try {
    const profileRaw = localStorage.getItem('skillforge:userProfile');
    if (!profileRaw) return;

    const profile = JSON.parse(profileRaw) as Record<string, unknown>;

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

    if (profile.errorPatterns && typeof profile.errorPatterns === 'object') {
      const errors = profile.errorPatterns as Record<string, number>;
      Object.entries(errors).forEach(([errType, count]) => {
        lines.push(`error_${errType},${count}`);
      });
    }

    const csv = lines.join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skillforge-progress.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore download errors
  }
}
