import React, { useEffect, useState } from "react";
import axios from "axios";

const BalanceSheet = () => {
  const [balanceSheetData, setBalanceSheetData] = useState({
    currentAssets: [],
    nonCurrentAssets: [],
    currentLiabilities: [],
    nonCurrentLiabilities: [],
    equity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalanceSheetData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/reports/balance-sheet");
        const data = response.data;
        console.log(data)
    
        // Ensure all keys are arrays
        setBalanceSheetData({
          currentAssets: Array.isArray(data.currentAssets) ? data.currentAssets : [],
          nonCurrentAssets: Array.isArray(data.nonCurrentAssets) ? data.nonCurrentAssets : [],
          currentLiabilities: Array.isArray(data.currentLiabilities) ? data.currentLiabilities : [],
          nonCurrentLiabilities: Array.isArray(data.nonCurrentLiabilities) ? data.nonCurrentLiabilities : [],
          equity: Array.isArray(data.equity) ? data.equity : [],
        });
      } catch (error) {
        console.error("Error fetching balance sheet data:", error);
        setBalanceSheetData({
          currentAssets: [],
          nonCurrentAssets: [],
          currentLiabilities: [],
          nonCurrentLiabilities: [],
          equity: [],
        });
      } finally {
        setLoading(false);
      }
    };
    

    fetchBalanceSheetData();
  }, []);

  const calculateTotal = (data) => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const renderTable = (data) => {
    return Array.isArray(data) && data.length > 0 ? (
      data.map((item, index) => (
        <tr key={index} className="border-b">
          <td className="px-6 py-4">{item.account_name}</td>
          <td className="px-6 py-4 text-right">{item.amount.toFixed(2)}</td>
        </tr>
      ))
    ) : (
      <tr>
        <td className="px-6 py-4 text-center text-gray-500" colSpan="2">
          No data available
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div className="text-center py-10 text-xl">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-xl text-red-500">{error}</div>;
  }

  const totals = {
    totalAssets: calculateTotal(balanceSheetData.currentAssets) + calculateTotal(balanceSheetData.nonCurrentAssets),
    totalLiabilities:
      calculateTotal(balanceSheetData.currentLiabilities) + calculateTotal(balanceSheetData.nonCurrentLiabilities),
    totalEquity: calculateTotal(balanceSheetData.equity),
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-semibold text-center mb-6">Balance Sheet</h2>

      {/* Assets Section */}
      <div className="mb-8">
        <h3 className="text-2xl font-medium mb-4">Assets</h3>

        {/* Current Assets */}
        <h4 className="text-xl font-medium mb-2">Current Assets</h4>
        <table className="min-w-full table-auto border-collapse mb-4">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-6 py-3 text-left">Account Name</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>{renderTable(balanceSheetData.currentAssets)}</tbody>
        </table>

        {/* Non-Current Assets */}
        <h4 className="text-xl font-medium mb-2">Non-Current Assets</h4>
        <table className="min-w-full table-auto border-collapse mb-4">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-6 py-3 text-left">Account Name</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>{renderTable(balanceSheetData.nonCurrentAssets)}</tbody>
        </table>

        {/* Total Assets */}
        <div className="text-right font-semibold text-lg mt-4">
          Total Assets: {totals.totalAssets.toFixed(2)}
        </div>
      </div>

      {/* Liabilities and Equity Section */}
      <div>
        <h3 className="text-2xl font-medium mb-4">Liabilities & Equity</h3>

        {/* Current Liabilities */}
        <h4 className="text-xl font-medium mb-2">Current Liabilities</h4>
        <table className="min-w-full table-auto border-collapse mb-4">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-6 py-3 text-left">Account Name</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>{renderTable(balanceSheetData.currentLiabilities)}</tbody>
        </table>

        {/* Non-Current Liabilities */}
        <h4 className="text-xl font-medium mb-2">Non-Current Liabilities</h4>
        <table className="min-w-full table-auto border-collapse mb-4">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-6 py-3 text-left">Account Name</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>{renderTable(balanceSheetData.nonCurrentLiabilities)}</tbody>
        </table>

        {/* Total Liabilities */}
        <div className="text-right font-semibold text-lg mt-4">
          Total Liabilities: {totals.totalLiabilities.toFixed(2)}
        </div>

        {/* Equity */}
        <h4 className="text-xl font-medium mb-2">Equity</h4>
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-6 py-3 text-left">Account Name</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>{renderTable(balanceSheetData.equity)}</tbody>
        </table>

        {/* Total Equity */}
        <div className="text-right font-semibold text-lg mt-4">
          Total Equity: {totals.totalEquity.toFixed(2)}
        </div>
      </div>

      {/* Total Liabilities & Equity */}
      <div className="text-right font-bold text-xl mt-6">
        Total Liabilities & Equity: {(totals.totalLiabilities + totals.totalEquity).toFixed(2)}
      </div>
    </div>
  );
};

export default BalanceSheet;
