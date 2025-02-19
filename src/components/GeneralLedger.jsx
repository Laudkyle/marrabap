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
  const [selectedTransaction, setSelectedTransaction] = useState(null);
const [journalEntries, setJournalEntries] = useState([]);
const [modalOpen, setModalOpen] = useState(false);

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
      const res = await API.get("/accounts");
      const data = await res.data;
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleRowClick = async (row) => {
    setSelectedTransaction(row);
    setModalOpen(true);
  
    try {
      const res = await API.get(`/journal-entries`, {
        params: {
          date: row.date,
          description: row.description,
        },
      });
  
      setJournalEntries(res.data);
    } catch (error) {
      toast.error("Error fetching journal entries.");
      console.error("Error fetching journal entries:", error);
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
        {modalOpen && (
  <div className="fixed inset-0 flex z-10 items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[80vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4">
        Journal Entries for {selectedTransaction?.description}
      </h3>

      {journalEntries.length > 0 ? (
        journalEntries.map((entry, index) => (
          <div key={index} className="mb-6 p-4 border border-gray-300 rounded-lg shadow">
            <h4 className="text-lg font-semibold text-gray-700">
              Journal Entry #{entry.journal_entry_id} - {entry.date}
            </h4>
            <p className="text-gray-600">Description: {entry.description}</p>

            <table className="w-full border-collapse border border-gray-300 mt-3">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2 text-left">Account</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Debit</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.accounts.map((acc, i) => (
                  <tr key={i} className="hover:bg-gray-100">
                    <td className="border border-gray-300 px-4 py-2">{acc.account_name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {acc.debit > 0 ? acc.debit.toFixed(2) : ""}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {acc.credit > 0 ? acc.credit.toFixed(2) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center">No journal entries found.</p>
      )}

      <div className="flex justify-end mt-4">
        <button className="bg-gray-500 text-white py-2 px-4 rounded" onClick={() => setModalOpen(false)}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

        {/* Transactions Table */}
        <div className="border rounded-lg shadow-sm max-h-[calc(100vh-200px)] overflow-y-scroll">
        <DataTable
  columns={columns}
  data={transactions}
  progressPending={loading}
  pagination
  highlightOnHover
  striped
  onRowClicked={(row) => handleRowClick(row)}
  pointerOnHover
  customStyles={{
    rows: {
      style: { cursor: "pointer", minHeight: "50px", fontSize: "14px",zIndex:1 },
    },
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
