import { useState, useEffect } from "react";
import API from "../api";
import DataTable from "react-data-table-component";
import { FaPlus, FaTrash, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const JournalEntry = () => {
  const [journalEntries, setJournalEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };
  const [formData, setFormData] = useState({
    reference_number: generateReferenceNumber(),
    date: "",
    description: "",
    adjustment_type: "NON ADJUSTMENT",
    status: "pending",
    journal_lines: [{ account_id: "", debit: 0, credit: 0 }],
  });
  const fetchJournalEntries = async () => {
    try {
      const response = await API.get("/journal_entry");
      setJournalEntries(response.data);
    } catch (error) {
      toast.error("Error fetching journal entries");
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await API.get("http://localhost:5000/accounts");
      setAccounts(response.data);
    } catch (error) {
      toast.error("Error fetching accounts");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index, e) => {
    const updatedLines = [...formData.journal_lines];
    updatedLines[index][e.target.name] = e.target.value;
    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const addJournalLine = () => {
    setFormData({
      ...formData,
      journal_lines: [...formData.journal_lines, { account_id: "", debit: 0, credit: 0 }],
    });
  };

  const removeJournalLine = (index) => {
    const updatedLines = [...formData.journal_lines];
    updatedLines.splice(index, 1);
    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const isBalanced = () => {
    const totalDebit = formData.journal_lines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0);
    const totalCredit = formData.journal_lines.reduce((sum, line) => sum + parseFloat(line.credit || 0), 0);
    return totalDebit.toFixed(2) === totalCredit.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced()) {
        {}
      toast.error(`Total Debits must equal Total Credits!`);
      return;
    }

    try {
      await API.post("/journal_entry", formData);
      toast.success("Journal Entry added successfully");
      setIsModalOpen(false);
      setFormData({
        reference_number: generateReferenceNumber(),
        date: "",
        description: "",
        adjustment_type: "NON ADJUSTMENT",
        status: "pending",
        journal_lines: [{ account_id: "", debit: 0, credit: 0 }],
      });
      fetchJournalEntries();
    } catch (error) {
      toast.error("Error saving journal entry");
    }
  };
  const totalDebit = formData.journal_lines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0);
  const totalCredit = formData.journal_lines.reduce((sum, line) => sum + parseFloat(line.credit || 0), 0);
  
  const columns = [
    { name: "Reference", selector: (row) => row.reference_number, sortable: true },
    { name: "Date", selector: (row) => row.date, sortable: true },
    { name: "Description", selector: (row) => row.description, sortable: true },
    { name: "Status", selector: (row) => row.status, sortable: true },
    
  ];

  return (
    <div className="p-6 bg-gray-100 max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-4">Journal Entries</h2>

      <button className="mb-4 bg-blue-600 text-white py-2 px-4 rounded flex items-center" onClick={() => setIsModalOpen(true)}>
        <FaPlus className="mr-2" /> Add Journal Entry
      </button>

      <div className="bg-white p-4 shadow-md rounded-lg">
        <DataTable columns={columns} data={journalEntries} pagination highlightOnHover />
      </div>


{isModalOpen && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg max-h-[calc(80vh-100px)] overflow-y-scroll shadow-lg w-3/4">
      <h3 className="text-xl font-bold mb-4">Add Journal Entry</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700">Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block text-gray-700">Description</label>
            <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
        </div>

        {/* Journal Lines */}
        <h4 className="text-lg font-bold mt-4">Journal Lines</h4>
        {formData.journal_lines.map((line, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 mt-2">
            <div>
              <label className="block text-gray-700">Account</label>
              <select name="account_id" value={line.account_id} onChange={(e) => handleLineChange(index, e)} className="p-2 border rounded w-full" required>
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700">Debit</label>
              <input type="number" name="debit" value={line.debit} onChange={(e) => handleLineChange(index, e)} className="p-2 border rounded w-full" />
            </div>
            <div>
              <label className="block text-gray-700">Credit</label>
              <input type="number" name="credit" value={line.credit} onChange={(e) => handleLineChange(index, e)} className="p-2 border rounded w-full" />
            </div>
            <div className="flex items-end">
              <button type="button" className="text-red-500" onClick={() => removeJournalLine(index)}>
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="mt-2 text-blue-500" onClick={addJournalLine}>
          <FaPlus /> Add Line
        </button>

        {/* Total Debit & Credit */}
        <div className="mt-4 p-2 border-t">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Debit: <span className="text-green-600">{totalDebit.toFixed(2)}</span></span>
            <span>Total Credit: <span className="text-red-600">{totalCredit.toFixed(2)}</span></span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-2 mt-4">
          <button type="button" className="bg-gray-500 text-white py-2 px-4 rounded" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded"><FaSave /> Save</button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
};

export default JournalEntry;
