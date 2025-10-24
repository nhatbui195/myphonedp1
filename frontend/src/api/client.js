import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
