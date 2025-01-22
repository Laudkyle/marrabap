import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import { FaEdit } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

const OpeningBalances = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [editAccount, setEditAccount] = useState(null); // For editing account
  const [modalOpen, setModalOpen] = useState(false); // Modal state
  const [searchText, setSearchText] = useState(""); // Search text
  const accountTypes = ["asset", "liability", "equity", "revenue", "expense"];

  // Fetch accounts from the backend
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/accounts");
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
      selector: (row) => row.balance.toFixed(2),
      sortable: true,
      right: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          onClick={() => handleEdit(row)}
          className="text-blue-500 hover:text-blue-700"
        >
          <FaEdit />
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <div className="p-6 bg-white rounded shadow-md h-[calc(100vh-80px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Manage Account Balances</h2>

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

      {/* Modal for editing account balance */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Edit Account Balance</h3>
            <form onSubmit={handleUpdateAccount}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" htmlFor="account_name">
                  Account Name
                </label>
                <input
                  type="text"
                  id="account_name"
                  name="account_name"
                  value={editAccount.account_name}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" htmlFor="account_balance">
                  Balance
                </label>
                <input
                  type="number"
                  id="account_balance"
                  name="balance"
                  value={editAccount.balance}
                  onChange={(e) =>
                    setEditAccount({ ...editAccount, balance: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningBalances;
