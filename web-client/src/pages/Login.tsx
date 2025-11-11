import { Box, Button, Paper, Typography } from "@mui/material";
import { useAuth } from "../auth/KeycloakContext";

const Login = () => {
  const { login, keycloak } = useAuth();
  const disabled = !keycloak;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Welcome to VitalityLens
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Sign in with Google or your email to manage your medical documents securely.
        </Typography>
        <Button variant="contained" onClick={login} disabled={disabled}>
          Continue to Login
        </Button>
        {disabled && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Authentication service is unavailable. Please try again later.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
