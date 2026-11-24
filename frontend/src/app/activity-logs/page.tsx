
import Sidebar from "@/components/dashboard/Sidebar";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ActivityLogsTable from "@/components/activity-logs/ActivityLogsTable";
import { cookies } from "next/headers";

interface ActivityLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  description: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
}

async function getActivityLogs(): Promise<ActivityLog[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  if (!token) {
    throw new Error("Your session has expired.");
  }

  const apiUrl = process.env.OPSPILOT_API_URL;

  if (!apiUrl) {
    throw new Error("Backend API URL is not configured.");
  }

  const response = await fetch(`${apiUrl}/activity-logs/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load activity logs.");
  }

  return await response.json();
}


export default async function ActivityLogsPage() {
  const user = await getAuthenticatedUser();

  // Protect the page itself.
  if (user.role !== "admin") {
    redirect("/");
  }

  let logs: ActivityLog[] = [];
  let error = "";

  try {
    logs = await getActivityLogs();
  } catch {
    error = "Unable to load activity logs. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={user.role} />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Activity Logs
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor important activities performed within your organization.
            </p>
          </header>

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Logged in as</p>
            <p className="mt-1 font-semibold text-gray-900">
              {user.full_name} · {user.role}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Activities</p>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">
                {logs.length}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Request Activities</p>
              <h2 className="mt-3 text-2xl font-bold text-blue-600">
                {logs.filter((log) => log.entity_type?.toLowerCase() === "request").length}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Workflow Activities</p>
              <h2 className="mt-3 text-2xl font-bold text-purple-600">
                {logs.filter((log) => log.entity_type?.toLowerCase() === "workflow").length}
              </h2>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <ActivityLogsTable logs={logs} />
          )}
        </div>
      </main>
    </div>
  );
}
