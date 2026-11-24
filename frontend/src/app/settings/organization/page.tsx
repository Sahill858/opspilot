import EditOrganizationForm from "@/components/organizations/EditOrganizationForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  Building2,
  ArrowLeft,
  Calendar,
  ShieldCheck,
} from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default async function OrganizationSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("opspilot_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const response = await fetch(
    `${process.env.OPSPILOT_API_URL}/organizations/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    throw new Error("Unable to load organization details");
  }

  const organization: Organization = await response.json();
  const userResponse = await fetch(
  `${process.env.OPSPILOT_API_URL}/auth/me`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }
);

if (userResponse.status === 401) {
  redirect("/login");
}

if (!userResponse.ok) {
  throw new Error("Unable to load user information");
}

const currentUser = await userResponse.json();

const isAdmin = currentUser.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={currentUser.role} />

      <main className="md:ml-64 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Organization Settings
                </h1>
                <p className="text-sm text-slate-500">
                  Manage your organization information.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Organization Information
              </h2>

              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  organization.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {organization.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-5">
              <div>
  <p className="text-sm text-slate-500 mb-3">
    Organization Name
  </p>

  <EditOrganizationForm
  currentName={organization.name}
  isAdmin={isAdmin}
/>
</div>

              <div>
                <p className="text-sm text-slate-500 mb-1">
                  Organization Slug
                </p>
                <p className="font-medium text-slate-900">
                  {organization.slug}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">
                  Organization ID
                </p>
                <p className="font-medium text-slate-900">
                  #{organization.id}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Calendar size={15} />
                    Created At
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <ShieldCheck size={15} />
                    Last Updated
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(organization.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
