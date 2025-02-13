import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DataTable from "react-data-table-component";
import API from "../api";
const GeneralLedgerComponent = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount.id);
    }
  }, [selectedAccount, filters]);

  const fetchAccounts = async () => {
    try {
      const res = await API.get("http://localhost:5000/accounts");
      const data = await res.data;
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchTransactions = async (accountId) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }).toString();

      const res = await API.get(`/ledger?${queryParams}`);
      const data = await res.data;
      setTransactions(data);
    } catch (error) {
      toast.error("Error fetching transactions.");
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((account) =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      name: "Date",
      selector: (row) => format(new Date(row.date), "dd MMM yyyy"),
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => row.description || "N/A",
      grow: 2,
    },
    {
      name: "Debit ",
      selector: (row) => (row.debit > 0 ? row.debit.toFixed(2) : ""),
      right: true,
    },
    {
      name: "Credit",
      selector: (row) => (row.credit > 0 ? row.credit.toFixed(2) : ""),
      right: true,
    },
    { name: "Balance", selector: (row) => row.balance.toFixed(2), right: true },
  ];

  return (
    <div className="flex max-h-[calc(100vh-100px)] overflow-y-scroll bg-gray-100">
      {/* Sidebar - Accounts List */}
      <aside className="w-1/4 bg-white border-r shadow-md p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Accounts</h3>
        <input
          type="text"
          placeholder="Search accounts..."
          className="border rounded-md p-2 mb-3 w-full focus:ring focus:ring-blue-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className="overflow-y-auto flex-grow">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => (
              <li
                key={account.id}
                className={`p-2 cursor-pointer rounded-md transition ${
                  selectedAccount?.id === account.id
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                {account.account_name}
              </li>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No accounts found.</p>
          )}
        </ul>
      </aside>

      {/* Main Content */}
      <div className="w-3/4 p-6 bg-white shadow-lg rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">General Ledger</h2>
          <div className="flex space-x-4 items-center">
            {/* From Date */}
            <label className="text-gray-700 font-medium">From:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="border rounded-md p-2 focus:ring focus:ring-blue-200"
            />

            {/* To Date */}
            <label className="text-gray-700 font-medium">To:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="border rounded-md p-2 focus:ring focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border rounded-lg shadow-sm max-h-[calc(100vh-200px)] overflow-y-scroll">
          <DataTable
            columns={columns}
            data={transactions}
            progressPending={loading}
            pagination
            highlightOnHover
            striped
            customStyles={{
              rows: { style: { minHeight: "50px", fontSize: "14px" } },
              headCells: {
                style: {
                  backgroundColor: "#f3f4f6",
                  fontWeight: "bold",
                  fontSize: "15px",
                },
              },
              pagination: { style: { fontSize: "14px" } },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralLedgerComponent;
