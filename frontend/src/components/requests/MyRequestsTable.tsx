
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
} from "lucide-react";

interface RequestItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  workflow_id: number | null;
  current_step: number;
  created_at: string;
}

interface MyRequestsTableProps {
  requests: RequestItem[];
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type SortOption =
  | "newest"
  | "oldest"
  | "priority-high"
  | "priority-low";

const PAGE_SIZE = 10;

const filters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function getStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return "bg-green-50 text-green-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    default:
      return "bg-yellow-50 text-yellow-700";
  }
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return <CheckCircle size={15} />;
    case "rejected":
      return <XCircle size={15} />;
    default:
      return <Clock size={15} />;
  }
}

function getPriorityStyle(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "text-red-600";
    case "low":
      return "text-green-600";
    default:
      return "text-yellow-600";
  }
}

export default function MyRequestsTable({
  requests,
}: MyRequestsTableProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<StatusFilter>("all");
  const [sortOption, setSortOption] =
  useState<SortOption>("newest");

const [currentPage, setCurrentPage] = useState(1);
  // Filter and search requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        activeFilter === "all" ||
        request.status.toLowerCase() === activeFilter;

      const requestId = `REQ-${String(request.id).padStart(3, "0")}`;

      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        request.title.toLowerCase().includes(searchText) ||
        requestId.toLowerCase().includes(searchText) ||
        String(request.id).includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, activeFilter]);
  // Sort filtered requests
const sortedRequests = useMemo(() => {
  const priorityOrder: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const sorted = [...filteredRequests];

  switch (sortOption) {
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
      break;

    case "oldest":
      sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
      break;

    case "priority-high":
      sorted.sort((a, b) => {
  const priorityDifference =
    (priorityOrder[b.priority.toLowerCase()] ?? 0) -
    (priorityOrder[a.priority.toLowerCase()] ?? 0);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return (
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
  );
});
      break;

    case "priority-low":
      sorted.sort((a, b) => {
  const priorityDifference =
    (priorityOrder[a.priority.toLowerCase()] ?? 0) -
    (priorityOrder[b.priority.toLowerCase()] ?? 0);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return (
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
  );
});
      break;
  }

  return sorted;
}, [filteredRequests, sortOption]);

// Pagination calculations
const totalPages = Math.ceil(sortedRequests.length / PAGE_SIZE);

const paginatedRequests = sortedRequests.slice(
  (currentPage - 1) * PAGE_SIZE,
  currentPage * PAGE_SIZE
);

const startItem =
  sortedRequests.length === 0
    ? 0
    : (currentPage - 1) * PAGE_SIZE + 1;

const endItem = Math.min(
  currentPage * PAGE_SIZE,
  sortedRequests.length
);

const handleExportCSV = () => {
  const headers = [
    "Request ID",
    "Title",
    "Description",
    "Category",
    "Priority",
    "Status",
    "Created At",
  ];

  const rows = sortedRequests.map((request) => [
    `REQ-${String(request.id).padStart(3, "0")}`,
    request.title,
    request.description,
    request.category,
    request.priority,
    request.status,
    new Date(request.created_at).toLocaleDateString("en-IN"),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "opspilot-my-requests.csv";
  link.click();

  URL.revokeObjectURL(url);
};

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
<div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h2 className="font-semibold text-gray-900">
      Request History
    </h2>
    <p className="mt-1 text-sm text-gray-500">
      All requests submitted by you.
    </p>
  </div>

  <button
    onClick={handleExportCSV}
    disabled={sortedRequests.length === 0}
    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Download size={16} />
    Export CSV
  </button>
</div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}

            placeholder="Search by request title or ID..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Sorting */}
<div className="flex items-center gap-2">
  <label
    htmlFor="request-sort"
    className="whitespace-nowrap text-sm text-gray-500"
  >
    Sort by:
  </label>

  <select
    id="request-sort"
    value={sortOption}
    onChange={(e) => {
      setSortOption(e.target.value as SortOption);
      setCurrentPage(1);
    }}
    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  >
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
    <option value="priority-high">Highest Priority</option>
    <option value="priority-low">Lowest Priority</option>
  </select>
</div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value;

            const count =
              filter.value === "all"
                ? requests.length
                : requests.filter(
                    (r) =>
                      r.status.toLowerCase() === filter.value
                  ).length;

            return (
              <button
                key={filter.value}
                onClick={() => {
                  setActiveFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <FileText
            size={42}
            className="mx-auto text-gray-300"
          />

          <h3 className="mt-4 font-semibold text-gray-900">
            {requests.length === 0
              ? "No requests yet"
              : "No matching requests"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {requests.length === 0
              ? "You haven't submitted any requests."
              : "Try changing your search or status filter."}
          </p>

          {requests.length === 0 && (
            <Link
              href="/requests/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create your first request
            </Link>
          )}

          {requests.length > 0 && (
            <button
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
              }}
              className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Request</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedRequests.map((request) => (
                <tr
                  key={request.id}
                  className="transition hover:bg-gray-50"
                >
                  <td className="px-6 py-5">
                    <p className="font-medium text-gray-900">
                      {request.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      REQ-{String(request.id).padStart(3, "0")}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-gray-600">
                    {request.category}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`font-medium capitalize ${getPriorityStyle(
                        request.priority
                      )}`}
                    >
                      {request.priority}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyle(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-5 text-gray-500">
                    {new Date(request.created_at).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <Link
                      href={`/requests/${request.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination and Result Count */}
{filteredRequests.length > 0 && (
  <div className="flex flex-col gap-4 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

    {/* Result Count */}
    <p className="text-xs text-gray-500">
      Showing {startItem}–{endItem} of {sortedRequests.length} requests
    </p>

    {/* Pagination Buttons */}
    {totalPages > 1 && (
      <div className="flex items-center gap-2">

        <button
          onClick={() =>
            setCurrentPage((page) => Math.max(1, page - 1))
          }
          disabled={currentPage === 1}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="px-2 text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() =>
            setCurrentPage((page) =>
              Math.min(totalPages, page + 1)
            )
          }
          disabled={currentPage === totalPages}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>

      </div>
    )}
  </div>
)}
    </div>
  );
}
