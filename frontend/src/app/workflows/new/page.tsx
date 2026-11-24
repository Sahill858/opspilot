
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface WorkflowStep {
  name: string;
  approver_role: string;
}

interface CreatedWorkflow {
  id: number;
}

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | undefined>(undefined);

useEffect(() => {
  async function fetchUserRole() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const user = await response.json();
      setRole(user.role);
    } catch (error) {
      console.error("Unable to fetch user role:", error);
    }
  }

  fetchUserRole();
}, []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: "", approver_role: "manager" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Add a new approval step
  const addStep = () => {
    setSteps([
      ...steps,
      { name: "", approver_role: "manager" },
    ]);
  };

  // Remove an approval step
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Update approval step fields
  const updateStep = (
    index: number,
    field: keyof WorkflowStep,
    value: string
  ) => {
    setSteps((currentSteps) =>
      currentSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  };

  // Create workflow and its approval steps
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !description.trim()) {
      setError("Please enter the workflow name and description.");
      return;
    }

    if (steps.length === 0) {
      setError("Please add at least one approval step.");
      return;
    }

    if (steps.some((step) => !step.name.trim())) {
      setError("Please enter a name for every approval step.");
      return;
    }

    setIsSubmitting(true);

    let createdWorkflowId: number | null = null;

    try {
      // First: Create the workflow
      const workflowResponse = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const workflowData = await workflowResponse.json().catch(() => ({}));

      if (!workflowResponse.ok) {
        throw new Error(
          workflowData.detail || "Failed to create workflow."
        );
      }

      const workflow = workflowData as CreatedWorkflow;
      createdWorkflowId = workflow.id;

      if (!createdWorkflowId) {
        throw new Error("Workflow was created, but no workflow ID was returned.");
      }

      // Second: Add approval steps one by one
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        const stepResponse = await fetch(
          `/api/workflows/${createdWorkflowId}/steps`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: step.name.trim(),
              step_order: i + 1,
              approver_role: step.approver_role,
            }),
          }
        );

        const stepData = await stepResponse.json().catch(() => ({}));

        if (!stepResponse.ok) {
          setError(
            `Workflow #${createdWorkflowId} was created, but step ${
              i + 1
            } failed: ${stepData.detail || "Unable to add approval step."} Please check the workflow details.`
          );
          return;
        }
      }

      // All operations succeeded
      router.push(`/workflows/${createdWorkflowId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the workflow."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Sidebar role={role} />
    <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/workflows"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Workflows
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Workflow
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Create a workflow and define its approval process.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Workflow Details */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Workflow Details
            </h2>

            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Workflow Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. IT Equipment Approval"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this workflow..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

            </div>
          </section>

          {/* Approval Steps */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Approval Steps
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define who needs to approve this workflow.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {steps.length} Steps
              </span>
            </div>

            <div className="space-y-4">

              {steps.map((step, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">

                    <h3 className="font-semibold text-gray-800">
                      Step {index + 1}
                    </h3>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}

                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Step Name
                      </label>

                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) =>
                          updateStep(index, "name", e.target.value)
                        }
                        placeholder="e.g. Manager Approval"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Approver Role
                      </label>

                      <select
                        value={step.approver_role}
                        onChange={(e) =>
                          updateStep(index, "approver_role", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="approver">Approver</option>
                      </select>
                    </div>

                  </div>
                </div>
              ))}

            </div>

            <button
              type="button"
              onClick={addStep}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <Plus size={17} />
              Add Approval Step
            </button>

          </section>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">

            <Link
              href="/workflows"
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2 size={17} className="animate-spin" />
              )}

              {isSubmitting ? "Creating Workflow..." : "Create Workflow"}
            </button>

          </div>

        </form>
      </div>
    </main>
     </>
  );
}
