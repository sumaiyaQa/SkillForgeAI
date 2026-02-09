export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze';

export interface Hint {
  id: string;
  level: BloomLevel;
  content: string;
  scaffolding: number; // 1 = earliest, higher = more detailed
  concept: string;
}

export interface RuntimeHint {
  content: string;
  level?: BloomLevel;
  source: 'ast' | 'problem';
}