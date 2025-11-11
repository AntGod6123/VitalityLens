import Keycloak, { KeycloakInstance } from "keycloak-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  keycloak: KeycloakInstance | null;
  initialized: boolean;
  authenticated: boolean;
  token: string | undefined;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost/auth",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "app",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "web-client"
};

export const KeycloakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<KeycloakInstance | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const kc = new Keycloak(keycloakConfig);
    setKeycloak(kc);
    kc
      .init({ onLoad: "check-sso", pkceMethod: "S256", checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(!!auth);
        setInitialized(true);
      })
      .catch((error) => {
        console.error("Keycloak initialization failed", error);
        setInitialized(true);
      });

    kc.onAuthSuccess = () => setAuthenticated(true);
    kc.onAuthLogout = () => setAuthenticated(false);

    const tokenRefresh = setInterval(() => {
      if (kc.authenticated) {
        kc.updateToken(60).catch(() => {
          kc.clearToken();
        });
      }
    }, 30000);

    return () => {
      clearInterval(tokenRefresh);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      keycloak,
      initialized,
      authenticated,
      token: keycloak?.token,
      login: () => keycloak?.login(),
      logout: () => keycloak?.logout({ redirectUri: window.location.origin })
    }),
    [keycloak, initialized, authenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within KeycloakProvider");
  }
  return context;
};
