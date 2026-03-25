export interface User {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  mimeType?: string;
  sizeBytes?: string;
  createdAt: string;
  playbackUrl?: string;
  tags?: string[];
}

export interface Chapter {
  title: string;
  start_time: number;
  end_time?: number;
  chapter_order: number;
}

export interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
}

export interface Transcript {
  language: string;
  status: string;
  fullText: string;
  segments: TranscriptSegment[];
}

export interface ChatSource {
  text: string;
  start_time: number;
  end_time: number;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  video_id: string;
}

export interface VideoDetail {
  video: Video;
  transcript: Transcript | null;
  chapters: Chapter[];
  summary: string | null;
}
