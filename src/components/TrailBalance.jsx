import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

const TrialBalance = () => {
  const [trialBalanceData, setTrialBalanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("detailed"); // 'detailed' or 'net' mode

  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "http://localhost:5000/reports/trial-balance"
        );
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

  const totalDebit = trialBalanceData.reduce(
    (total, entry) => total + entry.debit,
    0
  );
  const totalCredit = trialBalanceData.reduce(
    (total, entry) => total + entry.credit,
    0
  );
  const netBalance = totalDebit - totalCredit;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-6">Trial Balance</h2>

      {/* View Mode Toggle */}
      <div className="mb-4">
        <button
          className={`px-4 py-2 mr-2 ${
            viewMode === "detailed" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("detailed")}
        >
          Detailed View
        </button>
        <button
          className={`px-4 py-2 ${
            viewMode === "net" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("net")}
        >
          Net Balance View
        </button>
      </div>

      {/* Table */}
      <table className="min-w-full table-auto border-collapse">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">Account Name</th>
            {viewMode === "detailed" ? (
              <>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </>
            ) : (
              <th className="px-4 py-2 text-right">Net Balance</th>
            )}
          </tr>
        </thead>
        <tbody>
          {trialBalanceData.length > 0 ? (
            trialBalanceData.map((entry) => (
              <tr key={entry.account_name} className="border-b">
                <td className="px-4 py-2">{entry.account_name}</td>
                {viewMode === "detailed" ? (
                  <>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(entry.debit)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(entry.credit)}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(Math.abs(entry.debit - entry.credit))}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center py-4">
                No trial balance data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total Debit, Credit or Net Balance */}
      <div className="flex justify-between mt-6 font-bold text-lg">
        <span>
          {viewMode === "detailed" ? "Total Debit" : "Net Debit (Credit)"}
        </span>
        <span>
          {formatCurrency(
            viewMode === "detailed" ? totalDebit : Math.abs(netBalance)
          )}
        </span>
      </div>
      <div className="flex justify-between mt-2 font-bold text-lg">
        <span>
          {viewMode === "detailed" ? "Total Credit" : "Net Credit (Debit)"}
        </span>
        <span>
          {formatCurrency(
            viewMode === "detailed" ? totalCredit : Math.abs(netBalance)
          )}
        </span>
      </div>

      {/* Check if Trial Balance is Balanced */}
      <div className="mt-4">
        <span
          className={`text-lg font-bold ${
            Math.round(netBalance) === 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {Math.round(netBalance) === 0
            ? "Trial Balance is Balanced"
            : "Trial Balance is Unbalanced"}
        </span>
      </div>
    </div>
  );
};

export default TrialBalance;
