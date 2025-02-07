import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CustomerPaymentModal = ({ customerId, onClose }) => {
  const [paymentData, setPaymentData] = useState({
    invoiceId: "",
    amountPaid: "",
    paymentMethod: "cash",
    paymentReference: "",
    paymentDate: new Date().toISOString(),
  });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (customerId) {
        try {
          const response = await axios.get(
            `http://localhost:5000/invoices?customerId=${customerId}`
          );
          const filteredInvoices = response.data.filter(
            (invoice) => invoice.status === "partial" || invoice.status === "unpaid"
          );
          setInvoices(filteredInvoices);
        } catch (error) {
          toast.error("Error fetching invoices.");
        }
      }
    };
    fetchInvoices();
  }, [customerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => {
      const newData = { ...prevData, [name]: value };
      if (name === "invoiceId") {
        const selectedInvoice = invoices.find(
          (invoice) => invoice.id === parseInt(value)
        );
        newData.paymentReference = selectedInvoice ? selectedInvoice.reference_number : "";
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      toast.error("Enter a valid payment amount.");
      setLoading(false);
      return;
    }
    if (!paymentData.invoiceId) {
      toast.error("Select an invoice.");
      setLoading(false);
      return;
    }

    const selectedInvoice = invoices.find(
      (invoice) => invoice.id === parseInt(paymentData.invoiceId)
    );
    if (!selectedInvoice) {
      toast.error("Invoice not found.");
      setLoading(false);
      return;
    }

    const remainingBalance = selectedInvoice.total_amount - selectedInvoice.amount_paid;
    const updatedStatus =
      parseFloat(paymentData.amountPaid) >= remainingBalance ? "paid" : "partial";

    if (parseFloat(paymentData.amountPaid) > remainingBalance) {
      toast.error("Payment amount exceeds the remaining balance.");
      setLoading(false);
      return;
    }

    const paymentPayload = {
      reference_number: selectedInvoice.reference_number,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
      payment_reference: selectedInvoice.reference_number,
    };

    try {
      await axios.post("http://localhost:5000/payments", paymentPayload);
      await axios.put(`http://localhost:5000/invoices/${selectedInvoice.reference_number}`, {
        total_amount: selectedInvoice.total_amount,
        amount_paid: parseFloat(selectedInvoice.amount_paid) + parseFloat(paymentData.amountPaid),
        due_date: selectedInvoice.due_date,
        status: updatedStatus,
      });
      
      toast.success("Payment processed successfully.");
      onClose(); // Close the modal after successful payment
    } catch (error) {
      toast.error("Error processing payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
        <h2 className="text-2xl font-semibold text-gray-800">Customer Payment</h2>
        <ToastContainer />
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <label className="block text-gray-600">Invoice</label>
            <select
              name="invoiceId"
              value={paymentData.invoiceId}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference_number} - ₵{(
                    invoice.total_amount - invoice.amount_paid
                  ).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="block text-gray-600">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mt-4">
            <label className="block text-gray-600">Payment Method</label>
            <select
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-gray-400 text-white rounded mr-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? "Processing..." : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerPaymentModal;
