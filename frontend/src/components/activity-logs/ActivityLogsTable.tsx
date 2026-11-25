
"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

interface ActivityLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  description: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
}

interface ActivityLogsTableProps {
  logs: ActivityLog[];
}

const ITEMS_PER_PAGE = 10;

export default function ActivityLogsTable({
  logs,
}: ActivityLogsTableProps) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const actions = useMemo(
    () => [...new Set(logs.map((log) => log.action))],
    [logs]
  );

  const entityTypes = useMemo(
    () => [
      ...new Set(
        logs
          .map((log) => log.entity_type)
          .filter((type): type is string => Boolean(type))
      ),
    ],
    [logs]
  );

  const filteredLogs = useMemo(() => {
  return logs.filter((log) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      log.description.toLowerCase().includes(searchText) ||
      log.action.toLowerCase().includes(searchText) ||
      String(log.user_id ?? "").includes(searchText) ||
      String(log.entity_id ?? "").includes(searchText);

    const matchesAction =
      actionFilter === "all" || log.action === actionFilter;

    const matchesEntity =
      entityFilter === "all" ||
      log.entity_type?.toLowerCase() === entityFilter.toLowerCase();

    const logDate = new Date(log.created_at);

    const matchesStartDate =
      !startDate ||
      logDate >= new Date(`${startDate}T00:00:00`);

    const matchesEndDate =
      !endDate ||
      logDate < new Date(
        new Date(`${endDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000
      );

    return (
      matchesSearch &&
      matchesAction &&
      matchesEntity &&
      matchesStartDate &&
      matchesEndDate
    );
  });
}, [logs, search, actionFilter, entityFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const safePage = Math.min(currentPage, Math.max(totalPages, 1));

  const paginatedLogs = filteredLogs.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activities
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Search and review organization activity.
          </p>
        </div>

        
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
  {/* Search */}
  <div className="relative sm:col-span-2 xl:col-span-2">
    <Search
      size={18}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
    />
    <input
      type="text"
      value={search}
      onChange={(event) => {
        setSearch(event.target.value);
        setCurrentPage(1);
      }}
      placeholder="Search activities..."
      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  </div>

  {/* From Date */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">
      From Date
    </label>
    <input
      type="date"
      value={startDate}
      max={endDate || undefined}
      onChange={(event) => {
        setStartDate(event.target.value);
        setCurrentPage(1);
      }}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
    />
  </div>

  {/* To Date */}
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">
      To Date
    </label>
    <input
      type="date"
      value={endDate}
      min={startDate || undefined}
      onChange={(event) => {
        setEndDate(event.target.value);
        setCurrentPage(1);
      }}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
    />
  </div>

  {/* Action Filter */}
  <select
    value={actionFilter}
    onChange={(event) => {
      setActionFilter(event.target.value);
      setCurrentPage(1);
    }}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
  >
    <option value="all">All Actions</option>
    {actions.map((action) => (
      <option key={action} value={action}>
        {action.replaceAll("_", " ")}
      </option>
    ))}
  </select>

  {/* Resource Filter */}
  <select
    value={entityFilter}
    onChange={(event) => {
      setEntityFilter(event.target.value);
      setCurrentPage(1);
    }}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
  >
    <option value="all">All Resources</option>
    {entityTypes.map((type) => (
      <option key={type} value={type}>
        {type}
      </option>
    ))}
  </select>

  {/* Clear Filters */}
  <button
    type="button"
    onClick={() => {
      setSearch("");
      setActionFilter("all");
      setEntityFilter("all");
      setStartDate("");
      setEndDate("");
      setCurrentPage(1);
    }}
    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
  >
    Clear Filters
  </button>
</div>

      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-4 font-semibold">User</th>
              <th className="px-5 py-4 font-semibold">Action</th>
              <th className="px-5 py-4 font-semibold">Description</th>
              <th className="px-5 py-4 font-semibold">Resource</th>
              <th className="px-5 py-4 font-semibold">Date & Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="transition hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-5 py-4">
  <div className="font-medium text-gray-900">
    {log.user_name ?? "System"}
  </div>

  {log.user_id && (
    <div className="mt-1 text-xs text-gray-500">
      ID: {log.user_id}
    </div>
  )}
</td>

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {log.action.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="max-w-md px-5 py-4 text-gray-600">
                    {log.description}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {log.entity_type ? (
                      <span>
                        {log.entity_type} #{log.entity_id ?? "—"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <Activity
                    size={30}
                    className="mx-auto mb-3 text-gray-300"
                  />
                  <p className="font-medium text-gray-700">
                    No activities found
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your search or filters.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row">
        <p className="text-sm text-gray-500">
          Showing{" "}
          {filteredLogs.length === 0
            ? 0
            : (safePage - 1) * ITEMS_PER_PAGE + 1}
          {" "}to{" "}
          {Math.min(safePage * ITEMS_PER_PAGE, filteredLogs.length)}
          {" "}of {filteredLogs.length} activities
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage(safePage - 1)}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm font-medium text-gray-700">
            Page {safePage} of {Math.max(totalPages, 1)}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
