export interface CornellData {
  title: string;
  classPeriod: string;
  essentialQuestion: string;
  cues: string[];
  notes: string[];
  summary: string;
}

export interface Note {
  id: string;
  title: string;
  classPeriod: string;
  essentialQuestion: string;
  cues: string[];
  notes: string[];
  summary: string;
  image_url?: string;
  created_at: string;
  study_enabled?: boolean;
  last_opened_at?: string | null;
}
