import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchDocumentDetail, fetchDocumentSummary } from "../hooks/useDocuments";
import { DocumentDetail as DocumentDetailType, DocumentSummary } from "../types/documents";

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentDetailType | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchDocumentDetail(id), fetchDocumentSummary(id)])
      .then(([doc, summaryData]) => {
        setDocument(doc);
        setSummary(summaryData);
      })
      .catch((error) => {
        console.error("Failed to load document", error);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!document) {
    return <Typography>Document not found.</Typography>;
  }

  const tests = (document.extracted_data?.tests as Array<Record<string, string | number>> | undefined) ?? [];

  return (
    <Box display="grid" gap={2}>
      <Card>
        <CardHeader title={document.original_filename} subheader={`Uploaded ${new Date(document.created_at).toLocaleString()}`} />
        <CardContent>
          <Typography>Status: {document.status}</Typography>
          {summary?.summary && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              {summary.summary}
            </Typography>
          )}
          {summary?.recommendations && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Recommendations</Typography>
              <ul>
                {summary.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </Box>
          )}
        </CardContent>
      </Card>
      {tests.length > 0 && (
        <Card>
          <CardHeader title="Extracted Results" />
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Test</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((test, index) => (
                  <TableRow key={`${test.name}-${index}`}>
                    <TableCell>{String(test.name ?? "")}</TableCell>
                    <TableCell>{test.value !== undefined ? String(test.value) : ""}</TableCell>
                    <TableCell>{test.unit ? String(test.unit) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DocumentDetail;
