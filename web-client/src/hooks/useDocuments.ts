import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DocumentDetail, DocumentListItem, DocumentSummary } from "../types/documents";

export const useDocuments = (enabled: boolean) => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    api
      .get<DocumentListItem[]>("/documents")
      .then((response) => setDocuments(response.data))
      .catch((error) => {
        console.error("Failed to load documents", error);
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { documents, setDocuments, loading };
};

export const fetchDocumentDetail = async (id: string) => {
  const response = await api.get<DocumentDetail>(`/documents/${id}`);
  return response.data;
};

export const fetchDocumentSummary = async (id: string) => {
  const response = await api.get<DocumentSummary>(`/documents/${id}/summary`);
  return response.data;
};
