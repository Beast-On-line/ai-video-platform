"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Video, Upload, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/search"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Search
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-lg"
        >
          <Video className="w-5 h-5 text-blue-600" />
          VideoAI
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/upload"
              className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Videos
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
