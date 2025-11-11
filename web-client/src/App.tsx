import { CssBaseline, LinearProgress } from "@mui/material";
import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { KeycloakProvider, useAuth } from "./auth/KeycloakContext";
import { attachTokenInterceptor } from "./api/client";
import AppLayout from "./components/AppLayout";
import Account from "./pages/Account";
import Dashboard from "./pages/Dashboard";
import DocumentDetail from "./pages/DocumentDetail";
import Login from "./pages/Login";
import Upload from "./pages/Upload";

const ProtectedApp = () => {
  const { initialized, authenticated, keycloak } = useAuth();

  useEffect(() => {
    if (!keycloak) return;
    const detach = attachTokenInterceptor(() => keycloak.token);
    return () => {
      detach();
    };
  }, [keycloak]);

  if (!initialized) {
    return <LinearProgress />;
  }

  if (!authenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="account" element={<Account />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <KeycloakProvider>
    <CssBaseline />
    <ProtectedApp />
  </KeycloakProvider>
);

export default App;
