import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 401 handling is owned by AuthGuard + auth-provider, not here.
// This interceptor stays as pass-through to avoid double redirects.
api.interceptors.response.use(
  (r) => r,
  (error) => Promise.reject(error)
);
