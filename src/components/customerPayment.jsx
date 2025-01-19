import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify"; // Ensure react-toastify is installed

const CustomerPayment = () => {
  const [paymentData, setPaymentData] = useState({
    customerId: "",
    invoiceId: "", // Selected invoice
    amountPaid: "",
    paymentMethod: "cash", // Default to cash
    paymentReference: "", // Set automatically based on invoice
    paymentDate: new Date().toISOString(),
    documents: [], // Attached documents
    errorMessage: "",
  });

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch customers for dropdown
    const fetchCustomers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/customers");
        setCustomers(response.data);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Error fetching customers.");
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch invoices when a customer is selected
    const fetchInvoices = async (customerId) => {
      if (customerId) {
        try {
          const response = await axios.get(`http://localhost:5000/invoices?customerId=${customerId}`);
          setInvoices(response.data);
        } catch (error) {
          console.error("Error fetching invoices:", error);
          toast.error("Error fetching invoices.");
        }
      } else {
        setInvoices([]);
      }
    };

    if (paymentData.customerId) {
      fetchInvoices(paymentData.customerId);
    }
  }, [paymentData.customerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => {
      const newData = { ...prevData, [name]: value };
      // Automatically set payment reference when an invoice is selected
      if (name === "invoiceId") {
        const selectedInvoice = invoices.find((invoice) => invoice.id === parseInt(value));
        newData.paymentReference = selectedInvoice ? selectedInvoice.reference_number : "";
      }
      return newData;
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    const maxFileSize = 4 * 1024 * 1024; // 4MB in bytes
    if (selectedFiles) {
      const validFiles = [];
      const rejectedFiles = [];
      Array.from(selectedFiles).forEach((file) => {
        if (file.size <= maxFileSize) validFiles.push(file);
        else rejectedFiles.push(file.name);
      });
      setPaymentData((prevData) => ({
        ...prevData,
        documents: [...prevData.documents, ...validFiles],
      }));
      if (rejectedFiles.length > 0) {
        toast.error(`Files rejected (exceeding 4MB): ${rejectedFiles.join(", ")}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate input fields
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

    // Find the selected invoice
    const selectedInvoice = invoices.find((invoice) => invoice.id === parseInt(paymentData.invoiceId));
    if (!selectedInvoice) {
      toast.error("Invoice not found.");
      setLoading(false);
      return;
    }

    // Determine new invoice status based on payment
    const remainingBalance = selectedInvoice.total_amount - selectedInvoice.amount_paid;
    const updatedStatus =
      parseFloat(paymentData.amountPaid) >= remainingBalance
        ? "paid"
        : parseFloat(paymentData.amountPaid) > 0
        ? "partial"
        : selectedInvoice.status;

    // Payload for the payment
    const paymentPayload = {
      reference_number: selectedInvoice.reference_number,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
      payment_reference: selectedInvoice.reference_number,
    };

    try {
      // Post payment data to the server
      await axios.post("http://localhost:5000/payments", paymentPayload);

      // If documents are attached, upload them
      if (paymentData.documents.length > 0) {
        const formData = new FormData();
        formData.append("transaction_type", "payment");
        formData.append("reference_number", selectedInvoice.reference_number);
        paymentData.documents.forEach((file) => formData.append("files", file));

        await axios.post("http://localhost:5000/documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Update invoice status
      const invoiceUpdatePayload = {
        total_amount: selectedInvoice.total_amount,
        amount_paid: parseFloat(selectedInvoice.amount_paid) + parseFloat(paymentData.amountPaid),
        due_date: selectedInvoice.due_date,
        status: updatedStatus,
      };
      await axios.put(`http://localhost:5000/invoices/${selectedInvoice.id}`, invoiceUpdatePayload);

      toast.success("Payment processed and invoice updated.");
      setPaymentData({
        customerId: "",
        invoiceId: "",
        amountPaid: "",
        paymentMethod: "cash",
        paymentReference: "",
        paymentDate: new Date().toISOString(),
        documents: [],
        errorMessage: "",
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Error processing payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-700">Customer Payment</h2>
      <form onSubmit={handleSubmit}>
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Dropdown */}
          <div>
            <label htmlFor="customerId" className="block text-gray-600">Customer</label>
            <select
              name="customerId"
              value={paymentData.customerId}
              onChange={handleInputChange}
              required
              className="w-full mt-2 p-2 border rounded"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          {/* Invoice Dropdown */}
          <div>
            <label htmlFor="invoiceId" className="block text-gray-600">Invoice</label>
            <select
              name="invoiceId"
              value={paymentData.invoiceId}
              onChange={handleInputChange}
              required
              className="w-full mt-2 p-2 border rounded"
            >
              <option value="">Select Invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference_number} - {invoice.status.toUpperCase()} - ₵{invoice.total_amount - invoice.amount_paid}
                </option>
              ))}
            </select>
          </div>
          {/* Payment Amount */}
          <div>
            <label htmlFor="amountPaid" className="block text-gray-600">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              className="w-full mt-2 p-2 border rounded"
            />
          </div>
          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-gray-600">Payment Method</label>
            <select
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              className="w-full mt-2 p-2 border rounded"
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          {/* Document Upload */}
          <div>
            <label htmlFor="document" className="block text-gray-600">Attach Documents (Optional)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="application/pdf, image/*"
              multiple
              className="w-full mt-2 p-2 border rounded"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Processing..." : "Submit Payment"}
        </button>
      </form>
    </div>
  );
};

export default CustomerPayment;
