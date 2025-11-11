import axios from "axios";

export const api = axios.create({
  baseURL: "/api"
});

export const attachTokenInterceptor = (getToken: () => string | undefined) => {
  const interceptorId = api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return () => api.interceptors.request.eject(interceptorId);
};
