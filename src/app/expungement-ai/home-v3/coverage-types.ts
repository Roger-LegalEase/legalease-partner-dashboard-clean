export type CoverageTopic = {
  en: string;
  es: string;
};

export type CoverageSummary = {
  code: string;
  name: string;
  nameEs: string;
  questionCount: number;
  topics: CoverageTopic[];
};
