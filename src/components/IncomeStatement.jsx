import React, { useEffect, useState } from "react";
import API from "../api";
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
  const [date, setDate] = useState(""); // State for the selected date

  // Set today's date as the default value
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // Get date in 'YYYY-MM-DD' format
    setDate(formattedDate); // Set today's date as default
  }, []);

  useEffect(() => {
    const fetchIncomeStatement = async () => {
      if (!date) return; // Do not fetch if date is not set

      try {
        setLoading(true);
        console.log("Fetching income statement for date:", date); // Log the date being fetched
        const response = await API.get("http://localhost:5000/reports/income-statement", {
          params: { date },
        });
        console.log("Received response:", response.data); // Log the response data
        setIncomeStatementData(response.data);
      } catch (err) {
        setError("Failed to load income statement data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeStatement();
  }, [date]); // Fetch data when the date changes

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = incomeStatementData;

  if (!date) {
    return <p>Please select a date to generate the income statement.</p>;
  }

  return (
    <div className="max-w-4xl max-h-[calc(100vh-100px)] overflow-y-scroll mx-auto p-6 bg-white shadow rounded-md">
      <h2 className="text-2xl font-bold mb-6">Income Statement</h2>

      {/* Date Picker */}
      <div className="mb-6">
        <label className="block text-sm font-semibold">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)} // Update the date state
          className="mt-2 p-2 border border-gray-300 rounded"
        />
      </div>

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
