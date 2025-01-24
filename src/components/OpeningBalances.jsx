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
  const [addAccount, setAddAccount] = useState({ account_name: "", account_type: "", balance: "" }); // For adding a new account
  const [editModalOpen, setEditModalOpen] = useState(false); // Edit modal state
  const [addModalOpen, setAddModalOpen] = useState(false); // Add modal state
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
    setEditModalOpen(true);
  };

  // Close modals
  const handleCloseEditModal = () => {
    setEditAccount(null);
    setEditModalOpen(false);
  };

  const handleCloseAddModal = () => {
    setAddAccount({ account_name: "", account_type: "", balance: "" });
    setAddModalOpen(false);
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
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account.");
    }
  };

  // Add a new account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    const { account_name, account_type, balance } = addAccount;

    if (!account_name || !account_type || balance === "") {
      toast.error("All fields are required.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/accounts", {
        account_name,
        account_type,
        balance: parseFloat(balance),
      });

      setAccounts((prev) => [...prev, response.data]);
      setFilteredAccounts((prev) => [...prev, response.data]);
      toast.success("Account added successfully!");
      handleCloseAddModal();
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account.");
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

      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add Account
        </button>
        <input
          type="text"
          value={searchText}
          onChange={handleSearch}
          placeholder="Search by account name or type..."
          className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
        />
      </div>

      <DataTable
        title="Current Account Balances"
        columns={columns}
        data={filteredAccounts}
        pagination
        highlightOnHover
        responsive
      />

      {/* Modal for editing account balance */}
      {editModalOpen && (
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
                  onClick={handleCloseEditModal}
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

      {/* Modal for adding a new account */}
      {addModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Add New Account</h3>
            <form onSubmit={handleAddAccount}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" htmlFor="account_name">
                  Account Name
                </label>
                <input
                  type="text"
                  id="account_name"
                  value={addAccount.account_name}
                  onChange={(e) =>
                    setAddAccount({ ...addAccount, account_name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" htmlFor="account_type">
                  Account Type
                </label>
                <select
                  id="account_type"
                  value={addAccount.account_type}
                  onChange={(e) =>
                    setAddAccount({ ...addAccount, account_type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Type</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" htmlFor="balance">
                  Opening Balance
                </label>
                <input
                  type="number"
                  id="balance"
                  value={addAccount.balance}
                  onChange={(e) =>
                    setAddAccount({ ...addAccount, balance: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add
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
