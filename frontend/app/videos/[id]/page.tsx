"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { videoApi, chatApi } from "@/lib/api";
import { VideoDetail, ChatResponse } from "@/types";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import {
  Clock,
  MessageSquare,
  FileText,
  List,
  Send,
  Loader,
  ChevronRight,
  Info,
} from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "chapters" | "transcript" | "chat"
  >("chapters");

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { q: string; r: ChatResponse }[]
  >([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);

  useEffect(() => {
    if (!id) return;
    videoApi
      .getVideo(id)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !id) return;
    setChatLoading(true);
    try {
      const res = await chatApi.ask(id, question);
      setChatHistory((prev) => [...prev, { q: question, r: res.data }]);
      setQuestion("");
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20 text-gray-500">Video not found</div>
      </div>
    );
  }

  const { video, transcript, chapters, summary } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — video + info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video player */}
            <div className="bg-black rounded-2xl overflow-hidden aspect-video">
              {video.playbackUrl ? (
                <video
                  src={video.playbackUrl}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  {video.status === "PROCESSING" ? (
                    <div className="text-center">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Video is being processed...</p>
                    </div>
                  ) : (
                    <p>Video unavailable</p>
                  )}
                </div>
              )}
            </div>

            {/* Video info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h1 className="text-xl font-semibold text-gray-900">
                {video.title}
              </h1>
              {video.description && (
                <p className="text-gray-500 text-sm mt-1">
                  {video.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Uploaded{" "}
                {new Date(video.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Summary */}
            {summary && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    AI Summary
                  </span>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
          </div>

          {/* Right — tabs */}
          <div
            className="bg-white rounded-2xl border border-gray-200 flex flex-col"
            style={{ height: "680px" }}
          >
            {/* Tab headers */}
            <div className="flex border-b border-gray-200">
              {[
                {
                  key: "chapters",
                  label: "Chapters",
                  icon: <List className="w-4 h-4" />,
                },
                {
                  key: "transcript",
                  label: "Transcript",
                  icon: <FileText className="w-4 h-4" />,
                },
                {
                  key: "chat",
                  label: "Chat",
                  icon: <MessageSquare className="w-4 h-4" />,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2 ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Chapters tab */}
              {activeTab === "chapters" && (
                <div className="space-y-2">
                  {chapters.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Chapters not generated yet
                    </div>
                  ) : (
                    chapters.map((ch, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition"
                      >
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded min-w-fit">
                          {formatTime(ch.start_time)}
                        </span>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {ch.title}
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-400 ml-auto opacity-0 group-hover:opacity-100" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Transcript tab */}
              {activeTab === "transcript" && (
                <div>
                  {!transcript ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Transcript not available yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {transcript.language?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {transcript.segments.length} segments
                        </span>
                      </div>
                      {transcript.segments.map((seg, i) => (
                        <div key={i} className="flex gap-3 group">
                          <span className="text-xs font-mono text-gray-400 mt-0.5 min-w-fit">
                            {formatTime(seg.start_time)}
                          </span>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {seg.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat tab */}
              {activeTab === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4 mb-4">
                    {chatHistory.length === 0 && (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Ask anything about this video</p>
                        <p className="text-xs mt-1">
                          Powered by AI — answers based on transcript
                        </p>
                      </div>
                    )}
                    {chatHistory.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-900 ml-4">
                          {item.q}
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 mr-4">
                          {item.r.answer}
                          {item.r.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-400 mb-1">
                                Sources:
                              </p>
                              {item.r.sources.slice(0, 2).map((src, j) => (
                                <p key={j} className="text-xs text-gray-500">
                                  <span className="font-mono text-blue-500">
                                    {formatTime(src.start_time)}
                                  </span>
                                  {" — "}
                                  {src.text.slice(0, 60)}...
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mr-4 bg-gray-50 rounded-xl px-3 py-2">
                        <Loader className="w-3 h-3 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chat input — only visible on chat tab */}
            {activeTab === "chat" && (
              <form
                onSubmit={handleAsk}
                className="p-3 border-t border-gray-200 flex gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about this video..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || chatLoading}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
