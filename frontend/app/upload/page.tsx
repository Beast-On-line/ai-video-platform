"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/lib/auth-context";
import { uploadApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Upload, Video, CheckCircle, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [videoId, setVideoId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "youtube">("file");
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytJobId, setYtJobId] = useState("");
  const [ytStatus, setYtStatus] = useState<
    "idle" | "importing" | "done" | "error"
  >("idle");
  const [ytProgress, setYtProgress] = useState(0);
  const [ytVideoId, setYtVideoId] = useState("");

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("video/")) {
      handleFileSelect(dropped);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;

    setStatus("uploading");
    setError("");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title);
      if (description) formData.append("description", description);

      const res = await uploadApi.uploadVideo(formData, setProgress);
      setVideoId(res.data.video.id);
      setStatus("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed");
      setStatus("error");
    }
  }

  async function handleYoutubeImport(e: React.FormEvent) {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    setYtStatus("importing");
    setYtProgress(0);

    try {
      const UPLOAD_URL = process.env.NEXT_PUBLIC_UPLOAD_SERVICE_URL;
      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        `${UPLOAD_URL}/api/upload/youtube`,
        {
          url: ytUrl,
          title: ytTitle || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { jobId, videoId } = res.data;
      setYtJobId(jobId);
      setYtVideoId(videoId);

      // Poll for status
      const interval = setInterval(async () => {
        try {
          const status = await axios.get(
            `${UPLOAD_URL}/api/upload/youtube/${jobId}/status`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          setYtProgress(status.data.progress);

          if (status.data.status === "done") {
            clearInterval(interval);
            setYtStatus("done");
          } else if (status.data.status === "failed") {
            clearInterval(interval);
            setYtStatus("error");
          }
        } catch (err) {
          clearInterval(interval);
          setYtStatus("error");
        }
      }, 2000);
    } catch (err: any) {
      setYtStatus("error");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-2">Upload video</h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload a file or import directly from YouTube.
        </p>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("file")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "file"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Upload file
          </button>
          <button
            onClick={() => setActiveTab("youtube")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "youtube"
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Import from YouTube
          </button>
        </div>

        {/* File upload tab */}
        {activeTab === "file" && (
          // ... your existing file upload form JSX goes here (status === 'done' block + form)
          <>
            {status === "done" ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Upload complete!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Your video is being processed by AI.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/videos/${videoId}`)}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    View video
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setTitle("");
                      setDescription("");
                      setStatus("idle");
                      setProgress(0);
                    }}
                    className="border border-gray-300 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Upload another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div
                  className={`bg-white rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileSelect(e.target.files[0])
                    }
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <Video className="w-8 h-8 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">
                        Drop video here or click to browse
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        MP4, WebM, MOV up to 2GB
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter video title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="What is this video about?"
                  />
                </div>
                {status === "uploading" && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!file || !title || status === "uploading"}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "uploading"
                    ? `Uploading ${progress}%...`
                    : "Upload video"}
                </button>
              </form>
            )}
          </>
        )}

        {/* YouTube tab */}
        {activeTab === "youtube" && (
          <div>
            {ytStatus === "done" ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Import complete!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Your video is being processed by AI.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/videos/${ytVideoId}`)}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    View video
                  </button>
                  <button
                    onClick={() => {
                      setYtUrl("");
                      setYtTitle("");
                      setYtStatus("idle");
                      setYtProgress(0);
                    }}
                    className="border border-gray-300 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Import another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleYoutubeImport} className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <svg
                      className="w-8 h-8 text-red-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">
                        Import from YouTube
                      </p>
                      <p className="text-xs text-gray-500">
                        Paste any YouTube video URL
                      </p>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title{" "}
                    <span className="text-gray-400 font-normal">
                      (optional — uses YouTube title if empty)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Custom title (optional)"
                  />
                </div>

                {ytStatus === "importing" && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        {ytProgress < 60
                          ? "Downloading from YouTube..."
                          : ytProgress < 80
                            ? "Uploading to storage..."
                            : "Starting AI processing..."}
                      </span>
                      <span>{ytProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${ytProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {ytStatus === "error" && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Import failed. Check the URL and try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!ytUrl.trim() || ytStatus === "importing"}
                  className="w-full bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ytStatus === "importing"
                    ? "Importing..."
                    : "Import from YouTube"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
