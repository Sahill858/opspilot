
import Sidebar from "@/components/dashboard/Sidebar";
import CreateRequestForm from "@/components/requests/CreateRequestForm";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function NewRequestPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 pt-20 md:ml-64 md:p-8">

        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Create New Request
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Submit a new request for approval.
            </p>
          </header>

          {/* Request Form */}
          <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">

            <div className="mb-6 border-b border-gray-200 pb-5">
              <h2 className="font-semibold text-gray-900">
                Request Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Fill in the details below to submit your request.
              </p>
            </div>

            <CreateRequestForm />

          </div>

        </div>
      </main>
    </div>
  );
}
