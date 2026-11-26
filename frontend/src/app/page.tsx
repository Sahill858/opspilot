
import Sidebar from "@/components/dashboard/Sidebar";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { getAuthenticatedUser } from "@/lib/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowUpRight,
} from "lucide-react";

interface RequestItem {
  id: number;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

interface AnalyticsData {
  summary: {
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
  };
  monthly_trend: {
    month: string;
    total: number;
  }[];
  status_distribution: {
    name: string;
    total: number;
  }[];
  priority_distribution: {
    name: string;
    total: number;
  }[];
  approval_performance: {
    total_approvals: number;
    approved: number;
    rejected: number;
    approval_rate: number;
  };
}

export default async function Home() {
  const user = await getAuthenticatedUser();

  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  const apiUrl = process.env.OPSPILOT_API_URL;

  if (!user || !token || !apiUrl) {
    throw new Error("Authentication or API configuration is missing");
  }

  // Select the appropriate request endpoint based on user role.
  const requestsEndpoint =
    user.role === "employee"
      ? "/requests/my-requests"
      : user.role === "approver"
        ? "/requests/pending-approvals"
        : "/requests";

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Fetch analytics and recent requests together.
  const [analyticsResponse, requestsResponse] = await Promise.all([
    fetch(`${apiUrl}/analytics/`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${apiUrl}${requestsEndpoint}`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!analyticsResponse.ok) {
    throw new Error("Unable to fetch dashboard analytics");
  }

  if (!requestsResponse.ok) {
    throw new Error("Unable to fetch dashboard requests");
  }

  const analytics: AnalyticsData = await analyticsResponse.json();
  const requests: RequestItem[] = await requestsResponse.json();

  // Statistics from the analytics API.
  const stats = [
    {
      title: "Total Requests",
      value: analytics.summary.total_requests,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Pending",
      value: analytics.summary.pending_requests,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Approved",
      value: analytics.summary.approved_requests,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Rejected",
      value: analytics.summary.rejected_requests,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
  ];

  const recentRequests = requests.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={user.role} />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user.full_name}! Here's what's happening
                with your requests.
              </p>
            </div>

            <Link
              href="/requests/new"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              New Request
            </Link>
          </header>

          {/* Statistics */}
          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">
                      {stat.title}
                    </p>

                    <div className={`rounded-lg p-2 ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>

                  <h2 className="mt-4 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </h2>
                </div>
              );
            })}
          </section>

          {/* Analytics Charts */}
          <AnalyticsCharts
            monthlyTrend={analytics.monthly_trend}
            statusDistribution={analytics.status_distribution}
            priorityDistribution={analytics.priority_distribution}
            approvalPerformance={analytics.approval_performance}
          />

          {/* Recent Requests */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Recent Requests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Overview of your latest requests
                </p>
              </div>

              <span className="flex items-center gap-2 text-sm font-medium text-gray-400">
                Latest 5
                <ArrowUpRight size={16} />
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Request ID</th>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentRequests.map((request) => {
                    const status = request.status.toLowerCase();

                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          REQ-{String(request.id).padStart(3, "0")}
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          {request.title}
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {request.category.trim()}
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {new Date(request.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              status === "approved"
                                ? "bg-green-50 text-green-700"
                                : status === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : status === "rejected"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/requests/${request.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {recentRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        No requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
