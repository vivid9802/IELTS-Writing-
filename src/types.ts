export interface CriterionScore {
  score: number;
  feedback: string;
}

export interface Criteria {
  taskAchievement: CriterionScore;
  coherenceCohesion: CriterionScore;
  lexicalResource: CriterionScore;
  grammaticalRange: CriterionScore;
}

export interface SevenCatCriteria {
  accuracy: CriterionScore;
  naturalness: CriterionScore;
  register: CriterionScore;
  terminology: CriterionScore;
  rhetoric: CriterionScore;
  smoothness: CriterionScore;
  tailoring: CriterionScore;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'punctuation' | 'style';
}

export interface Rewrites {
  band7: string;
  band8: string;
}

export interface IELTSEvaluation {
  overallBand: number;
  wordCount: number;
  criteria: Criteria;
  sevenCat?: SevenCatCriteria;
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
  corrections: Correction[];
  rewrites: Rewrites;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  taskType: '1' | '2';
  promptText: string;
  essayText: string;
  evaluation: IELTSEvaluation;
}

export interface IELTSPromptPreset {
  id: string;
  taskType: '1' | '2';
  title: string;
  promptText: string;
  sampleAnswer?: string;
  description: string;
}
