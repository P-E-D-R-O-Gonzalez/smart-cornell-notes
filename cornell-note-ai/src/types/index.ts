export interface CornellData {
  title: string;
  cues: string[];
  notes: string[];
  summary: string;
}

export interface Note {
  id: string;
  title: string;
  cues: string[];
  notes: string[];
  summary: string;
  image_url?: string;
  created_at: string;
}
