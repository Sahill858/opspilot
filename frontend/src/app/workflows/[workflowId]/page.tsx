
import DeleteWorkflowButton from "@/components/workflows/DeleteWorkflowButton";
import Link from "next/link";
import { cookies } from "next/headers";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  GitBranch,
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserCheck,
  Calendar,
} from "lucide-react";

interface WorkflowStep {
  id: number;
  workflow_id: number;
  step_order: number;
  name: string;
  approver_role: string;
}

interface Workflow {
  id: number;
  organization_id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  steps: WorkflowStep[];
}

export default async function WorkflowDetailsPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  let workflow: Workflow | null = null;
  let errorMessage = "";

  try {
    const response = await fetch(
      `${process.env.OPSPILOT_API_URL}/workflows/${workflowId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow");
    }

    workflow = await response.json();
  } catch {
    errorMessage = "Unable to load workflow details.";
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        <Link
          href="/workflows"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Workflows
        </Link>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-white p-8 text-center text-red-600">
            {errorMessage}
          </div>
        ) : !workflow ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            Workflow not found.
          </div>
        ) : (
          <>
            {/* Workflow Header */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <GitBranch size={26} />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {workflow.name}
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                      {workflow.description || "No description provided."}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      Workflow ID: #{workflow.id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
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

  <DeleteWorkflowButton
    workflowId={workflow.id}
    workflowName={workflow.name}
  />
</div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500">
                <Calendar size={16} />
                Created on{" "}
                {new Date(workflow.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Approval Steps */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="font-semibold text-gray-900">
                  Approval Process
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review the approval sequence for this workflow.
                </p>
              </div>

              {workflow.steps.length === 0 ? (
                <div className="p-10 text-center">
                  <GitBranch
                    size={36}
                    className="mx-auto text-gray-300"
                  />
                  <p className="mt-3 text-sm text-gray-500">
                    No approval steps configured.
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-6">
                    {workflow.steps
                      .sort((a, b) => a.step_order - b.step_order)
                      .map((step, index) => (
                        <div key={step.id} className="relative flex gap-4">
                          {index !== workflow.steps.length - 1 && (
                            <div className="absolute left-5 top-12 h-full w-px bg-gray-200" />
                          )}

                          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                            {step.step_order}
                          </div>

                          <div className="flex-1 rounded-xl border border-gray-200 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {step.name}
                                </h3>

                                <p className="mt-1 text-xs text-gray-500">
                                  Approval Step {step.step_order}
                                </p>
                              </div>

                              <span className="inline-flex items-center gap-2 self-start rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium capitalize text-gray-700">
                                <UserCheck size={15} />
                                {step.approver_role}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
