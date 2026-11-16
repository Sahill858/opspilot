
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function CreateRequestForm() {
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    workflow_id: "",
  });

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const response = await fetch("/api/workflows", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load workflows");
        }

        setWorkflows(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load workflows"
        );
      } finally {
        setLoadingWorkflows(false);
      }
    }

    fetchWorkflows();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          workflow_id: Number(form.workflow_id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create request");
      }

      setSuccess(`Request REQ-${String(data.id).padStart(3, "0")} created successfully!`);

      setForm({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        workflow_id: "",
      });

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
          <button
            type="button"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            className="ml-2 font-semibold underline"
          >
            View Dashboard
          </button>
        </div>
      )}

      {/* Request Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Request Title *
        </label>

        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          minLength={3}
          maxLength={200}
          required
          placeholder="e.g. Laptop Request"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Description *
        </label>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          minLength={5}
          required
          rows={4}
          placeholder="Explain why you need this request..."
          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Category and Priority */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Category *
          </label>

          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            minLength={2}
            maxLength={100}
            required
            placeholder="e.g. IT Equipment"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Priority *
          </label>

          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Workflow */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Approval Workflow *
        </label>

        <select
          name="workflow_id"
          value={form.workflow_id}
          onChange={handleChange}
          required
          disabled={loadingWorkflows || workflows.length === 0}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
        >
          <option value="">
            {loadingWorkflows
              ? "Loading workflows..."
              : workflows.length === 0
                ? "No active workflows available"
                : "Select an approval workflow"}
          </option>

          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.name}
            </option>
          ))}
        </select>

        {workflows.length === 0 && !loadingWorkflows && !error && (
          <p className="mt-2 text-xs text-amber-600">
            Please contact your administrator to configure an active workflow.
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end border-t border-gray-200 pt-5">
        <button
          type="submit"
          disabled={submitting || loadingWorkflows || workflows.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={18} />
              Submit Request
            </>
          )}
        </button>
      </div>
    </form>
  );
}
