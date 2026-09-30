const APP_NAME = "Dev Station";
const APP_VERSION = "0.1.1";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

export const environments = {
    APP_NAME,
    APP_VERSION,
    API_URL,
    APP_URL,
};
