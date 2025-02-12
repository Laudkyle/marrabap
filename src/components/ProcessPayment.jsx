import { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

const ProcessPayment = () => {
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState({
    payment_date: "",
    amount: "",
    account_id: "",
    payment_method_id: "",
    description: "",
  });
  const [editId, setEditId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    fetchPayments();
    fetchAccounts();
    fetchPaymentMethods();
  }, []);

  // Fetch Payments
  const fetchPayments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/processpayment");
      setPayments(response.data);
    } catch (error) {
      toast.error("Error fetching payments");
    }
  };

  // Fetch Accounts
  const fetchAccounts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/accounts");
      setAccounts(response.data);
    } catch (error) {
      toast.error("Error fetching accounts");
    }
  };

  // Fetch Payment Methods
  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get("http://localhost:5000/payment-methods");
      setPaymentMethods(response.data);
    } catch (error) {
      toast.error("Error fetching payment methods");
    }
  };

  // Handle Form Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/processpayment/${editId}`, formData);
        toast.success("Payment updated successfully");
      } else {
        await axios.post("http://localhost:5000/processpayment", formData);
        toast.success("Payment added successfully");
      }
      setFormData({ payment_date: "", amount: "", account_id: "", payment_method_id: "", description: "" });
      setEditId(null);
      fetchPayments();
    } catch (error) {
      toast.error("Error saving payment");
    }
  };

  // Handle Edit
  const handleEdit = (payment) => {
    setEditId(payment.id);
    setFormData({
      payment_date: payment.payment_date,
      amount: payment.amount,
      account_id: payment.account_id,
      payment_method_id: payment.payment_method_id,
      description: payment.description,
    });
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        await axios.delete(`http://localhost:5000/processpayment/${id}`);
        toast.success("Payment deleted");
        fetchPayments();
      } catch (error) {
        toast.error("Error deleting payment");
      }
    }
  };

  // Table Columns
  const columns = [
    { name: "Date", selector: (row) => row.payment_date, sortable: true },
    { name: "Amount", selector: (row) => row.amount, sortable: true },
    { name: "Account", selector: (row) => row.account_name, sortable: true },
    { name: "Payment Method", selector: (row) => row.payment_method_name, sortable: true },
    { name: "Description", selector: (row) => row.description, sortable: true },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button className="text-blue-500" onClick={() => handleEdit(row)}>
            <FaEdit />
          </button>
          <button className="text-red-500" onClick={() => handleDelete(row.id)}>
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Process Payment</h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 shadow-md rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700">Date</label>
            <input
              type="date"
              name="payment_date"
              value={formData.payment_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Debit Account</label>
            <select
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Credit Account (Payment Method)</label>
            <select
              name="payment_method_id"
              value={formData.payment_method_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Payment Method</option>
              {paymentMethods.map((pay) => (
                <option key={pay.id} value={pay.id}>
                  {pay.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <button type="submit" className="mt-4 bg-blue-500 text-white py-2 px-4 rounded">
          {editId ? "Update Payment" : "Add Payment"}
        </button>
      </form>

      {/* Table */}
      <div className="bg-white p-4 shadow-md rounded-lg">
        <DataTable columns={columns} data={payments} pagination highlightOnHover />
      </div>
    </div>
  );
};

export default ProcessPayment;
