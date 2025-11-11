import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  Typography
} from "@mui/material";
import { Link } from "react-router-dom";
import { useDocuments } from "../hooks/useDocuments";

const Dashboard = () => {
  const { documents, loading } = useDocuments(true);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Grid container spacing={2}>
      {documents.map((doc) => (
        <Grid item xs={12} md={6} key={doc.id}>
          <Card>
            <CardHeader title={doc.original_filename} subheader={new Date(doc.created_at).toLocaleString()} />
            <CardContent>
              <Typography variant="body2">Status: {doc.status}</Typography>
              {doc.ai_summary && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {doc.ai_summary.length > 120 ? `${doc.ai_summary.slice(0, 120)}...` : doc.ai_summary}
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button component={Link} to={`/documents/${doc.id}`}>
                View details
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
      {documents.length === 0 && (
        <Grid item xs={12}>
          <Typography>No documents uploaded yet. Click upload to get started.</Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default Dashboard;
