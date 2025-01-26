import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Printer, Download, RefreshCw, Menu } from "lucide-react";
import { formatCurrency } from "../utils/helpers";

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
  const [expandedSections, setExpandedSections] = useState({
    currentAssets: true,
    nonCurrentAssets: true,
    currentLiabilities: true,
    nonCurrentLiabilities: true,
    equity: true,
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); // Default to today's date

  useEffect(() => {
    const fetchBalanceSheetData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/reports/balance-sheet?date=${selectedDate}`);
        const data = await response.json();
        setBalanceSheetData({
          currentAssets: Array.isArray(data.currentAssets) ? data.currentAssets : [],
          nonCurrentAssets: Array.isArray(data.nonCurrentAssets) ? data.nonCurrentAssets : [],
          currentLiabilities: Array.isArray(data.currentLiabilities) ? data.currentLiabilities : [],
          nonCurrentLiabilities: Array.isArray(data.nonCurrentLiabilities) ? data.nonCurrentLiabilities : [],
          equity: Array.isArray(data.equity) ? data.equity : [],
        });
      } catch (error) {
        setError("Failed to load balance sheet data");
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceSheetData();
  }, [selectedDate]); // Fetch data whenever the selected date changes

  const calculateTotal = (data) => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate totals
  const totals = {
    totalAssets: calculateTotal(balanceSheetData.currentAssets) + calculateTotal(balanceSheetData.nonCurrentAssets),
    totalLiabilities: calculateTotal(balanceSheetData.currentLiabilities) + calculateTotal(balanceSheetData.nonCurrentLiabilities),
    totalEquity: calculateTotal(balanceSheetData.equity),
  };

  const renderSection = (title, data, sectionKey, indent = false) => {
    const total = calculateTotal(data);
    return (
      <div className={`w-full ${indent ? 'ml-2 md:ml-6' : ''}`}>
        <div 
          className="flex items-center py-3 cursor-pointer hover:bg-gray-100 transition-colors duration-150 px-2 md:px-4"
          onClick={() => toggleSection(sectionKey)}
        >
          {expandedSections[sectionKey] ? 
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 text-gray-600 flex-shrink-0" /> : 
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 text-gray-600 flex-shrink-0" />
          }
          <span className="flex-1 text-base md:text-lg font-semibold text-gray-800 break-words">{title}</span>
          <span className="font-semibold text-gray-900 text-sm md:text-base ml-2">{formatCurrency(total)}</span>
        </div>
        
        {expandedSections[sectionKey] && Array.isArray(data) && data.map((item, index) => (
          <div key={index} className="flex items-center py-2 pl-6 md:pl-8 text-xs md:text-sm hover:bg-gray-50 transition-colors duration-150 px-2 md:px-4">
            <span className="flex-1 text-gray-600 break-words pr-2">{item.account_name}</span>
            <span className="text-gray-900 whitespace-nowrap">{formatCurrency(item.amount)}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center ">
        <RefreshCw className="w-6 h-6 md:w-8 md:h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 md:py-10 px-4">
        <p className="text-red-600 text-lg md:text-xl">{error}</p>
        <button 
          className="mt-4 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 inline-flex items-center text-sm md:text-base"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <div className="bg-white rounded-lg shadow-xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Balance Sheet</h2>
              <p className="text-sm md:text-md text-gray-600 mt-1">As of {selectedDate}</p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center space-x-2">
              <input 
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 md:gap-4">
              <button className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-gray-100 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Printer className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden md:inline">Print</span>
              </button>
              <button className="flex-1 md:flex-none inline-flex items-center justify-center px-3 md:px-5 py-2 md:py-3 bg-gray-100 text-xs md:text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Download className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Assets Section */}
          <div className="mb-6 md:mb-10">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 px-2 md:px-4">Assets</h3>
            <div className="overflow-x-auto">
              {renderSection("Current Assets", balanceSheetData.currentAssets, "currentAssets")}
              {renderSection("Non-Current Assets", balanceSheetData.nonCurrentAssets, "nonCurrentAssets")}
              <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">Total Assets</span>
                <span className="font-semibold text-gray-900 text-sm md:text-base">{formatCurrency(totals.totalAssets)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-6 md:my-8"></div>

          {/* Liabilities & Equity Section */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 px-2 md:px-4">Liabilities & Equity</h3>
            <div className="overflow-x-auto">
              {renderSection("Current Liabilities", balanceSheetData.currentLiabilities, "currentLiabilities")}
              {renderSection("Non-Current Liabilities", balanceSheetData.nonCurrentLiabilities, "nonCurrentLiabilities")}
              <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">Total Liabilities</span>
                <span className="font-semibold text-gray-900 text-sm md:text-base">{formatCurrency(totals.totalLiabilities)}</span>
              </div>

              {renderSection("Equity", balanceSheetData.equity, "equity")}
              <div className="flex items-center py-3 mt-3 border-t border-gray-300 px-2 md:px-4">
                <span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">Total Equity</span>
                <span className="font-semibold text-gray-900 text-sm md:text-base">{formatCurrency(totals.totalEquity)}</span>
              </div>

              <div className="flex items-center py-4 mt-6 border-t-2 border-gray-300 px-2 md:px-4">
                <span className="flex-1 text-base md:text-lg font-semibold text-gray-900">Total Liabilities & Equity</span>
                <span className="text-base md:text-lg font-semibold text-gray-900">{formatCurrency(totals.totalLiabilities + totals.totalEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
