
import Sidebar from "@/components/dashboard/Sidebar";
import { getAuthenticatedUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import UserManagementControls from "@/components/users/UserManagementControls";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface UserDetails {
  id: number;
  organization_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

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

  const response = await fetch(
    `${apiUrl}/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user details");
  }

  const selectedUser: UserDetails = await response.json();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={user.role} />

      <main className="min-w-0 p-4 pt-20 md:ml-64 md:p-8">
        <div className="mx-auto max-w-5xl">

          {/* Back Navigation */}
          <Link
            href="/users"
            className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Users
          </Link>

          {/* User Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <User size={28} />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500">
                  User #{selectedUser.id}
                </p>

                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedUser.full_name}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedUser.email}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                selectedUser.is_active
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {selectedUser.is_active ? (
                <CheckCircle size={14} />
              ) : (
                <XCircle size={14} />
              )}

              {selectedUser.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* User Information Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-gray-400">
                <User size={17} />
                <span className="text-xs">User ID</span>
              </div>

              <p className="text-lg font-semibold text-gray-900">
                #{selectedUser.id}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-gray-400">
                <Shield size={17} />
                <span className="text-xs">User Role</span>
              </div>

              <p className="text-lg font-semibold capitalize text-blue-600">
                {selectedUser.role}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-gray-400">
                <CheckCircle size={17} />
                <span className="text-xs">Account Status</span>
              </div>

              <p
                className={`text-lg font-semibold ${
                  selectedUser.is_active
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {selectedUser.is_active ? "Active" : "Inactive"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-gray-400">
                <Calendar size={17} />
                <span className="text-xs">Organization ID</span>
              </div>

              <p className="text-lg font-semibold text-gray-900">
                #{selectedUser.organization_id}
              </p>
            </div>
          </div>

          {/* User Information */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

              <div>
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <User size={16} />
                  <span className="text-xs">Full Name</span>
                </div>

                <p className="text-sm font-medium text-gray-900">
                  {selectedUser.full_name}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <Mail size={16} />
                  <span className="text-xs">Email Address</span>
                </div>

                <p className="break-all text-sm font-medium text-gray-900">
                  {selectedUser.email}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <Shield size={16} />
                  <span className="text-xs">Assigned Role</span>
                </div>

                <p className="text-sm font-medium capitalize text-gray-900">
                  {selectedUser.role}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <CheckCircle size={16} />
                  <span className="text-xs">Account Status</span>
                </div>

                <p className="text-sm font-medium text-gray-900">
                  {selectedUser.is_active ? "Active" : "Inactive"}
                </p>
              </div>

            </div>
          </div>
        <UserManagementControls
          userId={selectedUser.id}
          currentRole={selectedUser.role}
          isActive={selectedUser.is_active}
          isCurrentUser={user.id === selectedUser.id}
        />
        </div>
      </main>
    </div>
  );
}
