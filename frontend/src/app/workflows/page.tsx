
import Link from "next/link";
import { cookies } from "next/headers";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  GitBranch,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Workflow {
  id: number;
  organization_id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default async function WorkflowsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  let workflows: Workflow[] = [];
  let errorMessage = "";

  try {
    const response = await fetch(
      `${process.env.OPSPILOT_API_URL}/workflows`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflows");
    }

    workflows = await response.json();
  } catch {
    errorMessage = "Unable to load workflows. Please try again.";
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Workflow Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage your organization's approval workflows.
            </p>
          </div>

          <Link
            href="/workflows/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Workflow
          </Link>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total Workflows</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {workflows.length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Active Workflows</p>
            <h2 className="mt-2 text-2xl font-bold text-green-600">
              {workflows.filter((w) => w.is_active).length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Inactive Workflows</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-500">
              {workflows.filter((w) => !w.is_active).length}
            </h2>
          </div>
        </div>

        {/* Workflow List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              All Workflows
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage approval processes for your organization.
            </p>
          </div>

          {errorMessage ? (
            <div className="p-8 text-center text-sm text-red-600">
              {errorMessage}
            </div>
          ) : workflows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <GitBranch
                size={42}
                className="mx-auto text-gray-300"
              />
              <h3 className="mt-4 font-semibold text-gray-900">
                No workflows found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first workflow to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex flex-col gap-4 p-6 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                      <GitBranch size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {workflow.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {workflow.description || "No description provided."}
                      </p>

                      <p className="mt-2 text-xs text-gray-400">
                        Workflow ID: #{workflow.id}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Created:{" "}
                        {new Date(workflow.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        workflow.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {workflow.is_active ? (
                        <CheckCircle size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {workflow.is_active ? "Active" : "Inactive"}
                    </span>

                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
