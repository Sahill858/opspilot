
import Sidebar from "@/components/dashboard/Sidebar";
import { getAuthenticatedUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface RequestDetails {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  workflow_id: number | null;
  current_step: number;
  created_at: string;
  updated_at: string;
}

interface Approval {
  id: number;
  request_id: number;
  workflow_step_id: number | null;
  approver_id: number;
  approver_name: string | null;
  approver_role: string | null;
  decision: string;
  comment: string | null;
  created_at: string;
}


interface WorkflowStep {
  id: number;
  workflow_id: number;
  step_order: number;
  name: string;
  approver_role: string;
}

interface WorkflowDetails {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  steps: WorkflowStep[];
}


export default async function RequestDetailsPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;
  const apiUrl = process.env.OPSPILOT_API_URL;

  if (!token || !apiUrl) {
    redirect("/login");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Fetch request details
  const response = await fetch(
    `${apiUrl}/requests/${requestId}`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Failed to fetch request details");
  }

  const request: RequestDetails = await response.json();

  // Fetch approval history
  const approvalResponse = await fetch(
    `${apiUrl}/requests/${requestId}/approvals`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!approvalResponse.ok) {
    throw new Error("Failed to fetch approval history");
  }

  const approvals: Approval[] = await approvalResponse.json();
  

// Fetch workflow details
let workflow: WorkflowDetails | null = null;

if (request.workflow_id) {
  const workflowResponse = await fetch(
    `${apiUrl}/workflows/${request.workflow_id}`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!workflowResponse.ok) {
    throw new Error("Failed to fetch workflow details");
  }

  workflow = await workflowResponse.json();
}
  // API returns newest first. Reverse for chronological timeline.
  const approvalHistory = [...approvals].reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="md:ml-64 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">

          {/* Back Navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          {/* Request Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Request #{request.id}
              </p>

              <h1 className="text-2xl font-bold text-gray-900">
                {request.title}
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                {request.category.trim()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-semibold capitalize">
                {request.priority} priority
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  request.status === "approved"
                    ? "bg-green-50 text-green-700"
                    : request.status === "rejected"
                    ? "bg-red-50 text-red-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {request.status}
              </span>
            </div>
          </div>

          {/* Request Information Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock size={16} />
                <span className="text-xs">Workflow Step</span>
              </div>

              <p className="text-lg font-semibold text-gray-900">
                Step {request.current_step}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <FileText size={16} />
                <span className="text-xs">Workflow ID</span>
              </div>

              <p className="text-lg font-semibold text-gray-900">
                {request.workflow_id ?? "Not assigned"}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar size={16} />
                <span className="text-xs">Created</span>
              </div>

              <p className="text-sm font-semibold text-gray-900">
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar size={16} />
                <span className="text-xs">Last Updated</span>
              </div>

              <p className="text-sm font-semibold text-gray-900">
                {new Date(request.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

{/* Workflow Progress Tracker */}
<div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">

  <div className="mb-6">
    <h2 className="text-lg font-semibold text-gray-900">
      Workflow Progress
    </h2>

    <p className="text-sm text-gray-500 mt-1">
      {workflow?.name ?? "Workflow not assigned"}
    </p>
  </div>

  {!workflow || workflow.steps.length === 0 ? (
    <p className="text-sm text-gray-500">
      No workflow steps available.
    </p>
  ) : (
    <div className="space-y-5">
      {workflow.steps.map((step, index) => {
        const stepApproval = approvalHistory.find(
          (approval) =>
            approval.workflow_step_id === step.id
        );

        const isApproved =
          stepApproval?.decision.toLowerCase() === "approved";

        const isRejected =
          stepApproval?.decision.toLowerCase() === "rejected";

        const isCurrent =
          !stepApproval &&
          request.status === "pending" &&
          step.step_order === request.current_step;

        const isSkipped =
          !stepApproval &&
          request.status === "rejected" &&
          step.step_order > request.current_step;

        let stepStatus = "Upcoming";

        if (isApproved) stepStatus = "Completed";
        else if (isRejected) stepStatus = "Rejected";
        else if (isCurrent) stepStatus = "Awaiting Approval";
        else if (isSkipped) stepStatus = "Skipped";

        return (
          <div
            key={step.id}
            className="flex items-start gap-4"
          >
            {/* Step Indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isApproved
                    ? "bg-green-100 text-green-600"
                    : isRejected
                    ? "bg-red-100 text-red-600"
                    : isCurrent
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isApproved ? (
                  <CheckCircle size={19} />
                ) : isRejected ? (
                  <XCircle size={19} />
                ) : isCurrent ? (
                  <Clock size={19} />
                ) : (
                  <span className="text-sm font-semibold">
                    {step.step_order}
                  </span>
                )}
              </div>

              {index !== workflow.steps.length - 1 && (
                <div className="h-10 w-px bg-gray-200" />
              )}
            </div>

            {/* Step Information */}
            <div className="flex-1 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {step.name}
                </h3>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isApproved
                      ? "bg-green-50 text-green-700"
                      : isRejected
                      ? "bg-red-50 text-red-700"
                      : isCurrent
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {stepStatus}
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-1 capitalize">
                Approver: {step.approver_role}
              </p>

              {stepApproval && (
                <p className="text-xs text-gray-400 mt-1">
                  Decision recorded by{" "}
                  {stepApproval.approver_name ??
                    `User #${stepApproval.approver_id}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>


          {/* Request Description */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Request Description
            </h2>

            <p className="text-sm text-gray-600 leading-6 whitespace-pre-wrap">
              {request.description}
            </p>
          </div>

          {/* Approval History */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Approval History
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Track the progress of this request.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {approvals.length}{" "}
                {approvals.length === 1 ? "Action" : "Actions"}
              </span>
            </div>

            {approvalHistory.length === 0 ? (
              <div className="text-center py-10">
                <Clock
                  size={32}
                  className="mx-auto text-gray-300 mb-3"
                />

                <p className="text-sm font-medium text-gray-700">
                  No approval activity yet
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Approval actions will appear here once someone reviews this request.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {approvalHistory.map((approval, index) => {
                  const isApproved =
                    approval.decision.toLowerCase() === "approved" ||
                    approval.decision.toLowerCase() === "approve";

                  return (
                    <div
                      key={approval.id}
                      className="relative flex gap-4"
                    >
                      {/* Timeline Line */}
                      {index !== approvalHistory.length - 1 && (
                        <div className="absolute left-4 top-9 h-full w-px bg-gray-200" />
                      )}

                      {/* Decision Icon */}
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isApproved
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}
                      </div>

                      {/* Approval Details */}
                      <div className="min-w-0 flex-1 pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 capitalize">
                            {approval.decision}
                          </h3>

                          <span className="text-xs text-gray-400">
                            {new Date(
                              approval.created_at
                            ).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
  <span className="inline-flex items-center gap-1">
    <User size={13} />
    {approval.approver_name ?? `User #${approval.approver_id}`}
  </span>

  {approval.approver_role && (
    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 capitalize font-medium">
      {approval.approver_role}
    </span>
  )}

  {approval.workflow_step_id !== null && (
    <span>
      Workflow Step: {approval.workflow_step_id}
    </span>
  )}
</div>

                        {approval.comment && (
                          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
                            <div className="flex items-center gap-2 mb-1 text-gray-500">
                              <MessageSquare size={13} />
                              <span className="text-xs font-medium">
                                Comment
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 leading-5">
                              {approval.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
