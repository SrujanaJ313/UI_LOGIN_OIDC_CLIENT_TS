import Axios from "axios";
import authService from "./authService";

export const httpClient = Axios.create();

export const setAxiosInterceptors = () => {
  httpClient.interceptors.request.use(async (config) => {
    // Skip auth for certain requests
    if (config.skipAuth) {
      console.log(`[HTTP] Skipping auth for ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }
    
    if (authService.isLoggedIn()) {
      const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`[HTTP] Attached Authorization header for ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    return config;
  });
};

httpClient.interceptors.response.use(
  (response) => {
    // Debug trace for successful responses
    if (response && response.config) {
      console.log(`[HTTP] ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
    }
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message;
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    console.error(`[HTTP] ${method || ""} ${url || ""} -> ${status || ""} error: ${message}`);
    return Promise.reject(error);
  }
);
