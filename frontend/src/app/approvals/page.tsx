
import Sidebar from "@/components/dashboard/Sidebar";
import ApprovalList from "@/components/approvals/ApprovalList";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">

        <div className="mx-auto max-w-7xl">

          {/* Page Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Approvals
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review and manage pending approval requests.
            </p>
          </header>

          {/* User Information */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Logged in as
            </p>

            <p className="mt-1 font-semibold capitalize text-gray-900">
              {user.full_name} · {user.role}
            </p>
          </div>

          {/* Pending Approvals */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Requests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Requests waiting for your approval.
                </p>
              </div>
            </div>

            <ApprovalList />
          </section>

        </div>
      </main>
    </div>
  );
}
