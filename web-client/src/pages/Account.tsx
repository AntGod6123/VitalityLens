import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { useAuth } from "../auth/KeycloakContext";

const Account = () => {
  const { keycloak } = useAuth();
  const profile = keycloak?.tokenParsed ?? {};

  return (
    <Card>
      <CardHeader title="Account" />
      <CardContent>
        <Typography variant="body1">Email: {profile.email ?? "Unknown"}</Typography>
        <Typography variant="body1">User ID: {profile.sub}</Typography>
      </CardContent>
    </Card>
  );
};

export default Account;
