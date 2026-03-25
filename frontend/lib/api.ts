import axios from "axios";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
const UPLOAD_URL = process.env.NEXT_PUBLIC_UPLOAD_SERVICE_URL;
const VIDEO_URL = process.env.NEXT_PUBLIC_VIDEO_SERVICE_URL;
const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    axios.post(
      `${AUTH_URL}/api/auth/register`,
      { email, password },
      { withCredentials: true },
    ),

  login: (email: string, password: string) =>
    axios.post(
      `${AUTH_URL}/api/auth/login`,
      { email, password },
      { withCredentials: true },
    ),

  logout: () =>
    axios.post(`${AUTH_URL}/api/auth/logout`, {}, { withCredentials: true }),

  me: () => axios.get(`${AUTH_URL}/api/auth/me`, { headers: authHeaders() }),

  refresh: () =>
    axios.post(`${AUTH_URL}/api/auth/refresh`, {}, { withCredentials: true }),
};

// Videos
export const videoApi = {
  getMyVideos: () =>
    axios.get(`${VIDEO_URL}/api/videos`, { headers: authHeaders() }),

  getVideo: (id: string) =>
    axios.get(`${VIDEO_URL}/api/videos/${id}`, { headers: authHeaders() }),

  getChapters: (id: string) =>
    axios.get(`${VIDEO_URL}/api/videos/${id}/chapters`, {
      headers: authHeaders(),
    }),

  getTranscript: (id: string) =>
    axios.get(`${VIDEO_URL}/api/videos/${id}/transcript`, {
      headers: authHeaders(),
    }),
};

// Upload
export const uploadApi = {
  uploadVideo: (formData: FormData, onProgress?: (pct: number) => void) =>
    axios.post(`${UPLOAD_URL}/api/upload`, formData, {
      headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),

  getVideoStatus: (id: string) =>
    axios.get(`${UPLOAD_URL}/api/upload/${id}/status`, {
      headers: authHeaders(),
    }),
};

// Chat
export const chatApi = {
  ask: (videoId: string, question: string) =>
    axios.post(
      `${CHAT_URL}/api/chat`,
      { video_id: videoId, question },
      { headers: authHeaders() },
    ),
};
