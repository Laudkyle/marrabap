import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

const IncomeStatement = () => {
  const [incomeStatementData, setIncomeStatementData] = useState({
    revenue: [],
    expenses: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIncomeStatement = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/reports/income-statement");
        setIncomeStatementData(response.data);
      } catch (err) {
        setError("Failed to load income statement data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeStatement();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = incomeStatementData;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md">
      <h2 className="text-2xl font-bold mb-6">Income Statement</h2>

      {/* Revenue Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Revenue</h3>
        <div className="bg-gray-100 p-4 rounded">
          {revenue.length > 0 ? (
            revenue.map((item) => (
              <div
                key={item.account_name}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <span>{item.account_name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No revenue recorded.</p>
          )}
        </div>
        <div className="flex justify-between mt-4 font-bold">
          <span>Total Revenue:</span>
          <span>{formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Expenses</h3>
        <div className="bg-gray-100 p-4 rounded">
          {expenses.length > 0 ? (
            expenses.map((item) => (
              <div
                key={item.account_name}
                className="flex justify-between items-center py-2 border-b last:border-b-0"
              >
                <span>{item.account_name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No expenses recorded.</p>
          )}
        </div>
        <div className="flex justify-between mt-4 font-bold">
          <span>Total Expenses:</span>
          <span>{formatCurrency(totalExpenses)}</span>
        </div>
      </div>

      {/* Net Income */}
      <div className={`p-4 rounded font-bold ${netIncome >= 0 ? "bg-green-100" : "bg-red-100"}`}>
        <div className="flex justify-between items-center">
          <span>Net Income:</span>
          <span>{formatCurrency(netIncome)}</span>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatement;
