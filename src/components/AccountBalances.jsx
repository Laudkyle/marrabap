import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import "react-toastify/dist/ReactToastify.css";

const AccountBalances = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchText, setSearchText] = useState(""); // Search text

  // Fetch accounts from the backend
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/chart-of-accounts");
        const data = response.data.map((account) => ({
          ...account,
          balance: account.balance || 0, // Ensure balance has a default value
        }));
        setAccounts(data);
        setFilteredAccounts(data); // Initialize filtered accounts
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to fetch accounts.");
      }
    };

    fetchAccounts();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    const text = e.target.value.toLowerCase();
    setSearchText(text);

    // Filter accounts based on search text
    const filtered = accounts.filter(
      (account) =>
        account.account_name.toLowerCase().includes(text) ||
        account.account_type.toLowerCase().includes(text)
    );
    setFilteredAccounts(filtered);
  };

  // Columns for React Data Table
  const columns = [
    {
      name: "Account Name",
      selector: (row) => row.account_name,
      sortable: true,
    },
    {
      name: "Account Type",
      selector: (row) => row.account_type,
      sortable: true,
    },
    {
      name: "Balance",
      selector: (row) => parseFloat(row.balance).toFixed(2),
      sortable: true,
      right: true,
    },
  ];

  return (
    <div className="p-6 bg-white rounded shadow-md h-[calc(100vh-80px)] overflow-y-scroll">
      {/* Data Table with Search */}
      <DataTable
        title="Current Account Balances"
        columns={columns}
        data={filteredAccounts}
        pagination
        highlightOnHover
        responsive
        subHeader
        subHeaderComponent={
          <input
            type="text"
            value={searchText}
            onChange={handleSearch}
            placeholder="Search by account name or type..."
            className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
          />
        }
      />
    </div>
  );
};

export default AccountBalances;
