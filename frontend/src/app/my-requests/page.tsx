
import Sidebar from "@/components/dashboard/Sidebar";
import MyRequestsTable from "@/components/requests/MyRequestsTable";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";

interface RequestItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  workflow_id: number | null;
  current_step: number;
  created_at: string;
}

function getStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return "bg-green-50 text-green-700";

    case "rejected":
      return "bg-red-50 text-red-700";

    default:
      return "bg-yellow-50 text-yellow-700";
  }
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return <CheckCircle size={15} />;

    case "rejected":
      return <XCircle size={15} />;

    default:
      return <Clock size={15} />;
  }
}

function getPriorityStyle(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "text-red-600";

    case "low":
      return "text-green-600";

    default:
      return "text-yellow-600";
  }
}

export default async function MyRequestsPage() {
  const user = await getAuthenticatedUser();
  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  let requests: RequestItem[] = [];
  let error = "";

  if (!token) {
    error = "Your session has expired. Please log in again.";
  } else {
    try {
      const apiUrl = process.env.OPSPILOT_API_URL;

      if (!apiUrl) {
        throw new Error("Backend API URL is not configured.");
      }

      const response = await fetch(
        `${apiUrl}/requests/my-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load your requests.");
      }

      requests = await response.json();
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Something went wrong while loading requests.";
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={user.role} />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage the requests you have submitted.
            </p>
          </div>

          <Link
            href="/requests/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Request
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Requests</p>
              <FileText className="text-blue-600" size={21} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {requests.length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pending</p>
              <Clock className="text-yellow-600" size={21} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {requests.filter((r) => r.status === "pending").length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Completed</p>
              <CheckCircle className="text-green-600" size={21} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {
                requests.filter((r) =>
                  ["approved", "rejected"].includes(r.status)
                ).length
              }
            </h2>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Requests List */}
        {!error && <MyRequestsTable requests={requests} />}
      </main>
    </div>
  );
}
