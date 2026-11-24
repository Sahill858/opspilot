
import { cookies } from "next/headers";
import Sidebar from "@/components/dashboard/Sidebar";
import UsersTable from "@/components/users/UsersTable";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

interface User {
  id: number;
  organization_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default async function UsersPage() {
  const currentUser = await getAuthenticatedUser();

  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  let users: User[] = [];
  let errorMessage = "";

  
  try {
    if (!token) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    const response = await fetch(
      `${process.env.OPSPILOT_API_URL}/users`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Users API Error:",
        response.status,
        errorText
      );

      throw new Error(
        `API Error ${response.status}: ${errorText}`
      );
    }

    users = await response.json();

  } catch (error) {
    console.error("Users Page Error:", error);

    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load users. Please try again.";
  }


  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={currentUser.role} />

      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage users in your organization.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Users</p>
              <Users className="text-blue-600" size={20} />
            </div>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {users.length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Active Users</p>
              <UserCheck className="text-green-600" size={20} />
            </div>
            <h2 className="mt-2 text-2xl font-bold text-green-600">
              {users.filter((user) => user.is_active).length}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Inactive Users</p>
              <UserX className="text-gray-500" size={20} />
            </div>
            <h2 className="mt-2 text-2xl font-bold text-gray-500">
              {users.filter((user) => !user.is_active).length}
            </h2>
          </div>
        </div>

        {/* Users List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              All Users
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage organization members and their access.
            </p>
          </div>

          {errorMessage ? (
            <div className="p-8 text-center text-sm text-red-600">
              {errorMessage}
            </div>
          ) : (
            <UsersTable users={users} />
          )}
        </div>
      </main>
    </div>
  );
}
