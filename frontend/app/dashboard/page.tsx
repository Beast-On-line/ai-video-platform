"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { videoApi } from "@/lib/api";
import { Video } from "@/types";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Video as VideoIcon,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    UPLOADING: {
      label: "Uploading",
      className: "bg-blue-50 text-blue-700",
      icon: <Loader className="w-3 h-3 animate-spin" />,
    },
    PROCESSING: {
      label: "Processing",
      className: "bg-yellow-50 text-yellow-700",
      icon: <Clock className="w-3 h-3" />,
    },
    READY: {
      label: "Ready",
      className: "bg-green-50 text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    FAILED: {
      label: "Failed",
      className: "bg-red-50 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const s = map[status] || map.PROCESSING;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}
    >
      {s.icon} {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      videoApi
        .getMyVideos()
        .then((res) => setVideos(res.data.videos))
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">My Videos</h1>
            <p className="text-gray-500 text-sm mt-1">
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Upload className="w-4 h-4" />
            Upload video
          </Link>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <VideoIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Upload your first video to get started
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Upload className="w-4 h-4" />
              Upload video
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/videos/${video.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <VideoIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {video.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(video.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={video.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
