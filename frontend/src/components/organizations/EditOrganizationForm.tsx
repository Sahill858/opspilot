
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";

interface EditOrganizationFormProps {
  currentName: string;
  isAdmin: boolean;
}
export default function EditOrganizationForm({
  currentName,
  isAdmin,
}: EditOrganizationFormProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Organization name must contain at least 2 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/organizations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update organization.");
      }

      setName(data.name);
      setIsEditing(false);
      setMessage("Organization updated successfully.");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setName(currentName);
    setError("");
    setMessage("");
    setIsEditing(false);
  }

  return (
    <div>
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter organization name"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-slate-900">{name}</p>

            {isAdmin && (
  <button
    onClick={() => {
      setError("");
      setMessage("");
      setIsEditing(true);
    }}
    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
  >
    <Pencil size={15} />
    Edit
  </button>
)}
          </div>

          {message && (
            <p className="text-sm text-green-600 mt-2">{message}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
