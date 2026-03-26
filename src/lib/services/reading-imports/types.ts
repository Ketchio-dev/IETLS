export interface ImportedReadingQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  acceptedAnswers: string[];
  acceptedVariants: string[];
  explanation: string;
  evidenceHint: string;
}

export interface ImportedReadingSet {
  id: string;
  title: string;
  sourceLabel: string;
  sourceFile: string;
  importedAt: string;
  passage: string;
  passageWordCount: number;
  notes: string;
  questions: ImportedReadingQuestion[];
}

export interface PrivateReadingImportBankPayload {
  version: number;
  importedAt: string | null;
  sourceDir: string;
  sourceFiles: string[];
  sets: ImportedReadingSet[];
}

export interface ImportedReadingSetSummary {
  id: string;
  title: string;
  sourceLabel: string;
  sourceFile: string;
  importedAt: string;
  questionCount: number;
  passageWordCount: number;
  types: string[];
}

export interface PrivateReadingImportSummary {
  sourceDir: string;
  importCommand: string;
  detectedSourceFiles: string[];
  compiledSourceFiles: string[];
  importedSetCount: number;
  latestImportedAt: string | null;
  compiledOutputLabel: string;
  sets: ImportedReadingSetSummary[];
  warnings: string[];
}
