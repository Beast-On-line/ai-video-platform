"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/layout/Navbar";
import { Search, Loader, Clock, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface SearchResult {
  text: string;
  start_time: number;
  end_time: number;
  video_id: string;
  similarity: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearched(false);

    try {
      const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL;
      const res = await axios.get(`${CHAT_URL}/api/search`, {
        params: { q: query, limit: 10 },
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setResults(res.data.results);
      setSearched(true);
    } catch (err: any) {
      setError("Search failed. Make sure the search service is running.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-2">Search videos</h1>
        <p className="text-gray-500 text-sm mb-8">
          Semantic search across all your video transcripts — finds meaning, not
          just keywords.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "happiness and success" or "the keeper of light"'
              className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {searched && !error && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {results.length} result{results.length !== 1 ? "s" : ""} for
              &quot;{query}&quot;
            </p>

            {results.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No results found</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try different keywords or a more general search
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result, i) => (
                  <div
                    key={i}
                    onClick={() => router.push(`/videos/${result.video_id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-700 leading-relaxed flex-1">
                        {result.text}
                      </p>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {formatTime(result.start_time)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 group-hover:text-blue-500 transition">
                      <Video className="w-3 h-3" />
                      <span>Click to open video</span>
                      <Clock className="w-3 h-3 ml-1" />
                      <span>
                        {formatTime(result.start_time)} →{" "}
                        {formatTime(result.end_time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              Search your video content
            </p>
            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
              Find specific moments in any video using natural language —
              powered by AI embeddings
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {["happiness", "keeper of light", "watermelon", "success"].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full transition"
                  >
                    {s}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
