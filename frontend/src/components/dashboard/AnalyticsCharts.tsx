
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface DistributionItem {
  name: string;
  total: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
}

interface ApprovalPerformance {
  total_approvals: number;
  approved: number;
  rejected: number;
  approval_rate: number;
}

interface AnalyticsChartsProps {
  monthlyTrend: MonthlyTrend[];
  statusDistribution: DistributionItem[];
  priorityDistribution: DistributionItem[];
  approvalPerformance: ApprovalPerformance;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "#16a34a",
  pending: "#f59e0b",
  rejected: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#3b82f6",
  high: "#f97316",
};

export default function AnalyticsCharts({
  monthlyTrend,
  statusDistribution,
  priorityDistribution,
  approvalPerformance,
}: AnalyticsChartsProps) {
  const formatMonth = (month: string) => {
    const [year, monthNumber] = month.split("-");
    return new Date(
      Number(year),
      Number(monthNumber) - 1
    ).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  };

  return (
    <section className="mb-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Analytics & Insights
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Understand request trends and workflow performance.
        </p>
      </div>

      {/* Monthly Request Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-5 font-semibold text-gray-900">
          Monthly Request Trend
        </h3>

        {monthlyTrend.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            No monthly request data available.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => formatMonth(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Requests"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status and Priority Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-5 font-semibold text-gray-900">
            Request Status Distribution
          </h3>

          {statusDistribution.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No status data available.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {statusDistribution.map((item) => (
                      <Cell
                        key={item.name}
                        fill={
                          STATUS_COLORS[item.name.toLowerCase()] ?? "#9ca3af"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-5 font-semibold text-gray-900">
            Request Priority Distribution
          </h3>

          {priorityDistribution.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No priority data available.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    name="Requests"
                    radius={[6, 6, 0, 0]}
                  >
                    {priorityDistribution.map((item) => (
                      <Cell
                        key={item.name}
                        fill={
                          PRIORITY_COLORS[item.name.toLowerCase()] ??
                          "#64748b"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Approval Performance */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900">
          Approval Performance
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Overview of recorded approval decisions.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Total Decisions</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {approvalPerformance.total_approvals}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Approved</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {approvalPerformance.approved}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {approvalPerformance.rejected}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Approval Rate</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {approvalPerformance.approval_rate}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
