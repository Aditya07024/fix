import React, { useEffect, useMemo, useState } from "react";
import { Award, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { StatCard } from "@/components/DataDisplay";
import { useAuthGuard } from "@/hooks";
import { employeeAPI, EmployeeEarningsPayload } from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";

const COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#ef4444", "#8b5cf6"];

const EarningsPage: React.FC = () => {
  const { isAllowed: isEmployeeAllowed, isLoading: isAuthLoading } =
    useAuthGuard("employee");
  const [earnings, setEarnings] = useState<EmployeeEarningsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEmployeeAllowed) return;
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await employeeAPI.getEarnings();
        setEarnings(response.data || null);
      } catch (loadError: any) {
        setError(
          loadError?.error || loadError?.message || "Failed to load earnings",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [isEmployeeAllowed]);
  const transactions = earnings?.recent_payments || [];

  const currentMonth = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((item) => {
        const createdAt = new Date(item.created_at);
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const currentWeek = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    return transactions
      .filter((item) => new Date(item.created_at) >= weekStart)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const categoryData = useMemo(() => {
    const grouped = transactions.reduce<Record<string, number>>(
      (accumulator, item) => {
        const key = item.service_name || "Other";
        accumulator[key] = (accumulator[key] || 0) + Number(item.amount || 0);
        return accumulator;
      },
      {},
    );

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="container-main flex-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isEmployeeAllowed) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl">
          <h1 className="section-title mb-md">Earnings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Completed payment data from the backend.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-3xl">
          <StatCard
            title="This Month"
            value={formatCurrency(currentMonth)}
            icon={<Calendar size={32} />}
          />
          <StatCard
            title="This Week"
            value={formatCurrency(currentWeek)}
            icon={<TrendingUp size={32} />}
          />
          <StatCard
            title="Total Earnings"
            value={formatCurrency(earnings?.total_earnings || 0)}
            icon={<DollarSign size={32} />}
          />
          <StatCard
            title="Transactions"
            value={earnings?.total_transactions || 0}
            icon={<Award size={32} />}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-lg mb-3xl">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Recent Transactions" />
              <CardBody>
                {transactions.length > 0 ? (
                  <div className="space-y-md">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-md rounded-lg border border-gray-200 dark:border-gray-700 p-md"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {transaction.service_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transaction.client_name} •{" "}
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-50">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    No completed payments found.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="By Service" />
            <CardBody>
              {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-sm">
                    {categoryData.map((category, index) => (
                      <div key={category.name} className="flex-between text-sm">
                        <div className="flex items-center gap-md">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">
                            {category.name}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          {formatCurrency(category.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  No category data yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EarningsPage;
