"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteWorkflowButtonProps {
  workflowId: number;
  workflowName: string;
}

export default function DeleteWorkflowButton({
  workflowId,
  workflowName,
}: DeleteWorkflowButtonProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workflowName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        setError(
          data.detail || "Unable to delete workflow. Please try again."
        );
        return;
      }

      router.push("/workflows");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={16} />
        {deleting ? "Deleting..." : "Delete Workflow"}
      </button>

      {error && (
        <p className="max-w-xs text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}