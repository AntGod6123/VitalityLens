import {
  Box,
  Button,
  LinearProgress,
  Paper,
  TextField,
  Typography
} from "@mui/material";
import { ChangeEvent, useState } from "react";
import { api } from "../api/client";
import { UploadResponse } from "../types/documents";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (notes) {
      formData.append("metadata", JSON.stringify({ notes }));
    }

    try {
      const response = await api.post<UploadResponse>("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data);
      setFile(null);
      setNotes("");
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Upload Medical Document
      </Typography>
      <Button variant="outlined" component="label">
        Select File
        <input type="file" hidden onChange={handleFileChange} accept="application/pdf,image/*" />
      </Button>
      {file && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected: {file.name}
        </Typography>
      )}
      <TextField
        label="Notes"
        multiline
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        sx={{ display: "block", mt: 2, width: "100%" }}
      />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleUpload} disabled={!file || uploading}>
          Upload
        </Button>
      </Box>
      {uploading && <LinearProgress sx={{ mt: 2 }} />}
      {result && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Upload complete.</Typography>
          <Typography variant="body2">Status: {result.status}</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default Upload;
