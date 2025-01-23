import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

const TrialBalance = () => {
  const [trialBalanceData, setTrialBalanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/reports/trial-balance");
        setTrialBalanceData(response.data);
      } catch (err) {
        setError("Failed to load trial balance data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialBalance();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-6">Trial Balance</h2>

      <table className="min-w-full table-auto border-collapse">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">Account Name</th>
            <th className="px-4 py-2 text-right">Debit</th>
            <th className="px-4 py-2 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {trialBalanceData.length > 0 ? (
            trialBalanceData.map((entry) => (
              <tr key={entry.account_name} className="border-b">
                <td className="px-4 py-2">{entry.account_name}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(entry.debit)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(entry.credit)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center py-4">No trial balance data available.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total Debit and Credit */}
      <div className="flex justify-between mt-6 font-bold text-lg">
        <span>Total Debit:</span>
        <span>{formatCurrency(
          trialBalanceData.reduce((total, entry) => total + entry.debit, 0)
        )}</span>
      </div>
      <div className="flex justify-between mt-2 font-bold text-lg">
        <span>Total Credit:</span>
        <span>{formatCurrency(
          trialBalanceData.reduce((total, entry) => total + entry.credit, 0)
        )}</span>
      </div>

      {/* Check if Trial Balance is Balanced */}
      <div className="mt-4">
        <span className={`text-lg font-bold ${(
          trialBalanceData.reduce((total, entry) => total + entry.debit, 0) ===
          trialBalanceData.reduce((total, entry) => total + entry.credit, 0)
        ) ? "text-green-500" : "text-red-500"}`}>
          {(
            trialBalanceData.reduce((total, entry) => total + entry.debit, 0) ===
            trialBalanceData.reduce((total, entry) => total + entry.credit, 0)
          ) ? "Trial Balance is Balanced" : "Trial Balance is Unbalanced"}
        </span>
      </div>
    </div>
  );
};

export default TrialBalance;
