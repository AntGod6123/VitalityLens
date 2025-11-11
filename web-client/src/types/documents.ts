export type DocumentStatus = "pending" | "processed" | "error";

export interface DocumentListItem {
  id: string;
  status: DocumentStatus;
  original_filename: string;
  created_at: string;
  updated_at: string;
  ai_summary?: string | null;
}

export interface DocumentDetail extends DocumentListItem {
  user_id: string;
  metadata_raw?: Record<string, unknown> | null;
  extracted_data?: Record<string, unknown> | null;
  ai_recommendations?: string[] | null;
}

export interface DocumentSummary {
  summary: string | null;
  recommendations: string[] | null;
}

export interface UploadResponse extends DocumentDetail {}
