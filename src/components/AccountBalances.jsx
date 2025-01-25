import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import "react-toastify/dist/ReactToastify.css";

const AccountBalances = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [editAccount, setEditAccount] = useState(null); // For editing account
  const [modalOpen, setModalOpen] = useState(false); // Modal state
  const [searchText, setSearchText] = useState(""); // Search text

  // Fetch accounts from the backend
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/chart-of-accounts");
        setAccounts(response.data);
        setFilteredAccounts(response.data); // Initialize filtered accounts
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

  // Open modal to edit an account
  const handleEdit = (account) => {
    setEditAccount(account);
    setModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setEditAccount(null);
    setModalOpen(false);
  };

  // Update account balance
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!editAccount || editAccount.balance === "") {
      toast.error("Please provide a valid balance.");
      return;
    }

    try {
      await axios.put(`http://localhost:5000/accounts/${editAccount.id}`, {
        balance: parseFloat(editAccount.balance),
      });
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === editAccount.id ? { ...acc, balance: parseFloat(editAccount.balance) } : acc
        )
      );
      setFilteredAccounts((prev) =>
        prev.map((acc) =>
          acc.id === editAccount.id ? { ...acc, balance: parseFloat(editAccount.balance) } : acc
        )
      );
      toast.success("Account updated successfully!");
      handleCloseModal();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account.");
    }
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
      selector: (row) => row.balance.toFixed(2) || 0,
      sortable: true,
      right: true,
    },
   
  ];

  return (
    <div className="p-6 bg-white rounded shadow-md h-[calc(100vh-80px)] overflow-y-scroll">

      {/* Data Table with Search Subheader */}
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
