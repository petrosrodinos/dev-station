import axios from "axios";
import { environments } from "@/config/environments";

const axiosInstance = axios.create({
  baseURL: environments.apiUrl,
});

axiosInstance.interceptors.request.use((config) => {
  // TODO: attach auth token once auth is implemented
  return config;
});

export default axiosInstance;
