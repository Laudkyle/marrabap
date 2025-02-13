import React, { useEffect, useState } from "react";
import API from "../api";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

const TrialBalance = () => {
  const [trialBalanceData, setTrialBalanceData] = useState([]);
  const [expandedParents, setExpandedParents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("detailed"); // 'detailed' or 'net' mode

  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        setLoading(true);
        const response = await API.get(
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

  const toggleParent = (parentId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  // Separate parent and child accounts
  const groupedAccounts = trialBalanceData.reduce((acc, account) => {
    if (account.parent_account_id) {
      if (!acc[account.parent_account_id]) acc[account.parent_account_id] = [];
      acc[account.parent_account_id].push(account);
    } else {
      acc[account.id] = acc[account.id] || [];
    }
    return acc;
  }, {});

  // Calculate aggregated balances for parent accounts
  const getParentAggregatedBalances = (parentId) => {
    const children = groupedAccounts[parentId] || [];
    if (children.length === 0) {
      // If no children, return the parent's actual balance
      const parent = trialBalanceData.find((acc) => acc.id === parseInt(parentId));
      return {
        totalDebit: parent?.debit || 0,
        totalCredit: parent?.credit || 0,
      };
    }

    const totalDebit = children.reduce(
      (total, child) => total + (child.debit || 0),
      0
    );
    const totalCredit = children.reduce(
      (total, child) => total + (child.credit || 0),
      0
    );
    return { totalDebit, totalCredit };
  };

  const totalDebit = trialBalanceData.reduce(
    (total, entry) => total + (entry.debit || 0),
    0
  );
  const totalCredit = trialBalanceData.reduce(
    (total, entry) => total + (entry.credit || 0),
    0
  );
  const netBalance = totalDebit - totalCredit;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-6">Trial Balance</h2>

      {/* View Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          className={`px-4 py-2 ${
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
          {Object.keys(groupedAccounts).length > 0 ? (
            Object.keys(groupedAccounts).map((parentId) => {
              const parentAccount = trialBalanceData.find(
                (acc) => acc.id === parseInt(parentId)
              );

              if (!parentAccount) {
                console.warn(
                  `Parent account with ID ${parentId} not found in trialBalanceData.`
                );
                return null; // Skip if the parent account doesn't exist
              }

              const childAccounts = groupedAccounts[parentId];
              const aggregatedBalances = getParentAggregatedBalances(parentId);

              return (
                <React.Fragment key={parentId}>
                  {/* Parent Row */}
                  <tr
                    className="cursor-pointer bg-gray-100"
                    onClick={() => toggleParent(parentId)}
                  >
                    <td className="px-4 py-2">
                      <span>
                        {expandedParents[parentId] ? "▼" : "▶"}{" "}
                        {parentAccount.account_name}
                      </span>
                    </td>
                    {viewMode === "detailed" ? (
                      <>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(aggregatedBalances.totalDebit)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(aggregatedBalances.totalCredit)}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(
                          aggregatedBalances.totalDebit -
                            aggregatedBalances.totalCredit
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Child Rows */}
                  {expandedParents[parentId] &&
                    childAccounts.map((child) => (
                      <tr key={child.account_name} className="border-b">
                        <td className="px-4 py-2 pl-8">{child.account_name}</td>
                        {viewMode === "detailed" ? (
                          <>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(child.debit || 0)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(child.credit || 0)}
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(
                              (child.debit || 0) - (child.credit || 0)
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan="3" className="text-center py-4">
                No trial balance data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 font-bold text-lg">
        {viewMode === "detailed" ? (
          <>
            <div className="flex justify-between">
              <span>Total Debit</span>
              <span>{formatCurrency(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Credit</span>
              <span>{formatCurrency(totalCredit)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>Net Balance</span>
            <span
              className={`${
                netBalance === 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(netBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Trial Balance Status */}
      <div className="mt-4">
        <span
          className={`text-lg font-bold ${
            Math.round(netBalance) === 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {Math.round(netBalance) === 0
            ? "Trial Balance is Balanced"
            : `Trial Balance is Unbalanced: ${formatCurrency(netBalance)}`}
        </span>
      </div>
    </div>
  );
};

export default TrialBalance;
