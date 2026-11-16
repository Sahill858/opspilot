
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, UserCheck, UserX } from "lucide-react";

interface UserManagementControlsProps {
  userId: number;
  currentRole: string;
  isActive: boolean;
  isCurrentUser: boolean;
}

export default function UserManagementControls({
  userId,
  currentRole,
  isActive,
  isCurrentUser,
}: UserManagementControlsProps) {
  const router = useRouter();

  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updateRole() {
    if (role === currentRole) return;

    if (isCurrentUser && role !== "admin") {
      setError("You cannot change your own admin role.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change this user's role to ${role}?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update user role.");
      }

      setMessage("User role updated successfully.");
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

  async function updateStatus() {
    const nextStatus = !isActive;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } this account?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update account status."
        );
      }

      setMessage(
        `Account ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );

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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Account Management
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage this user's role and account access.
        </p>
      </div>

      {/* Role Management */}
      <div className="mb-6">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Shield size={16} />
          User Role
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading || (isCurrentUser && currentRole === "admin")}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="employee">Employee</option>
            <option value="approver">Approver</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={updateRole}
            disabled={loading || role === currentRole}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "Updating..." : "Update Role"}
          </button>
        </div>

        {isCurrentUser && currentRole === "admin" && (
          <p className="mt-2 text-xs text-gray-500">
            You cannot change your own admin role.
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Account Status
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              This account is currently{" "}
              <span className="font-medium">
                {isActive ? "active" : "inactive"}.
              </span>
            </p>
          </div>

          <button
            onClick={updateStatus}
            disabled={loading || isCurrentUser}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 ${
              isActive
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {isActive ? (
              <UserX size={17} />
            ) : (
              <UserCheck size={17} />
            )}

            {isActive ? "Deactivate Account" : "Activate Account"}
          </button>
        </div>

        {isCurrentUser && (
          <p className="mt-2 text-xs text-gray-500">
            You cannot deactivate your own account.
          </p>
        )}
      </div>

      {message && (
        <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
