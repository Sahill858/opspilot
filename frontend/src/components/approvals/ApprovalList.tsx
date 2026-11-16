
"use client";

import { useEffect, useState } from "react";

interface ApprovalRequest {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  current_step: number;
  created_at: string;
}

export default function ApprovalList() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/requests/pending-approvals",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load approvals");
      }

      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (
    requestId: number,
    decision: "approved" | "rejected"
  ) => {
    try {
      setSubmittingId(requestId);
      setError("");

      const response = await fetch(
        `/api/requests/${requestId}/approval`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            comment: comments[requestId]?.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to submit decision");
      }

      setComments((previous) => {
        const updated = { ...previous };
        delete updated[requestId];
        return updated;
      });

      await fetchApprovals();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading approvals...</p>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h3 className="font-semibold text-gray-900">
            No pending approvals
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            You're all caught up! New approval requests will appear here.
          </p>
        </div>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {request.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  REQ-{String(request.id).padStart(3, "0")} ·{" "}
                  {request.category.trim()}
                </p>
              </div>

              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                Pending
              </span>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {request.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>
                Priority:{" "}
                <strong className="capitalize text-gray-800">
                  {request.priority}
                </strong>
              </span>
              <span>Workflow step: {request.current_step}</span>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Approval comment (optional)
              </label>

              <textarea
                value={comments[request.id] || ""}
                onChange={(event) =>
                  setComments((previous) => ({
                    ...previous,
                    [request.id]: event.target.value,
                  }))
                }
                maxLength={1000}
                rows={3}
                placeholder="Write a comment..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => handleDecision(request.id, "rejected")}
                disabled={submittingId !== null}
                className="rounded-lg border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingId === request.id ? "Processing..." : "Reject"}
              </button>

              <button
                onClick={() => handleDecision(request.id, "approved")}
                disabled={submittingId !== null}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingId === request.id ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
