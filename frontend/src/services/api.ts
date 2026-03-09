import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL, // Your Python Backend URL
});

api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn(
        "No active session avaiable.Request proceeding unauthenticated.",
        error,
      );
      // No session available; leave the request unauthenticated.
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
