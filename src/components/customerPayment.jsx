import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify"; // Make sure to install react-toastify

const CustomerPayment = () => {
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    customerId: "",
    invoiceId: "", // To hold the selected invoice
    amountPaid: "",
    paymentMethod: "cash", // Default to cash
    paymentReference: "", // Will be set to the selected invoice reference
    paymentDate: new Date().toISOString(),
    documents: [], // To hold multiple documents
    errorMessage: "",
  });

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch customers for dropdown
    const fetchCustomers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/customers");
        setCustomers(response.data);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Error fetching customers data.");
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch invoices when a customer is selected
    const fetchInvoices = async (customerId) => {
      if (customerId) {
        try {
          const response = await axios.get(`http://localhost:5000/invoices/customer/${customerId}`);
          setInvoices(response.data);
        } catch (error) {
          console.error("Error fetching invoices:", error);
          toast.error("Error fetching invoices data.");
        }
      } else {
        setInvoices([]);
      }
    };

    if (paymentData.customerId) {
      fetchInvoices(paymentData.customerId);
    }
  }, [paymentData.customerId]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => {
      const newData = { ...prevData, [name]: value };
      // If the invoice is changed, set the payment reference to the selected invoice's reference number
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
        if (file.size <= maxFileSize) {
          validFiles.push(file);
        } else {
          rejectedFiles.push(file.name);
        }
      });

      // Update state with valid files
      setPaymentData((prevData) => ({
        ...prevData,
        documents: [...prevData.documents, ...validFiles],
      }));

      // Toast notification for rejected files
      if (rejectedFiles.length > 0) {
        toast.error(
          `The following files exceed the 4MB limit and were not added: ${rejectedFiles.join(
            ", "
          )}`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    // Ensure payment amount is valid
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      setLoading(false);
      setPaymentData((prevData) => ({
        ...prevData,
        errorMessage: "Please enter a valid payment amount.",
      }));
      toast.error("Please enter a valid payment amount.");
      return;
    }
  
    // Ensure that an invoice is selected
    if (!paymentData.invoiceId) {
      setLoading(false);
      setPaymentData((prevData) => ({
        ...prevData,
        errorMessage: "Please select an invoice.",
      }));
      toast.error("Please select an invoice.");
      return;
    }
  console.log("invoices : ",invoices)
    // Find the selected invoice based on invoiceId
    const selectedInvoice = invoices.find(
      (invoice) => invoice.id == paymentData.invoiceId
    );
  
    // Ensure that the selected invoice exists
    if (!selectedInvoice) {
      setLoading(false);
      setPaymentData((prevData) => ({
        ...prevData,
        errorMessage: "Invoice not found.",
      }));
      toast.error("Invoice not found.");
      return;
    }
  
    // Calculate remaining balance and determine invoice status
    const remainingBalance = selectedInvoice.total_amount - selectedInvoice.amount_paid;
    let updatedStatus = selectedInvoice.status;
  
    if (paymentData.amountPaid >= remainingBalance) {
      updatedStatus = "paid"; // Fully paid
    } else if (paymentData.amountPaid > 0) {
      updatedStatus = "partial"; // Partially paid
    }
  
    // Create the payment payload
    const paymentPayload = {
      reference_number: selectedInvoice.reference_number, // Use the selected invoice reference here
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
      payment_reference: selectedInvoice.reference_number, // Payment reference will be the invoice reference
    };
  
    try {
      // Post payment data to the server
      const paymentResponse = await axios.post("http://localhost:5000/payments", paymentPayload);
  
      // If documents are attached, post them to /documents
      if (paymentData.documents.length > 0) {
        const formData = new FormData();
        formData.append("transaction_type", "payment"); // Define transaction type
        formData.append("reference_number", selectedInvoice.reference_number); // Attach the reference number
  
        // Append each document to the FormData
        paymentData.documents.forEach((file) => {
          formData.append("files", file);
        });
  
        const documentResponse = await axios.post("http://localhost:5000/documents", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
  
        console.log("Documents uploaded successfully:", documentResponse.data);
      }
  
      // Update the invoice status based on the payment
      const invoiceUpdatePayload = {
        total_amount: selectedInvoice.total_amount,
        amount_paid: parseInt(selectedInvoice.amount_paid) + parseInt(paymentData.amountPaid),
        due_date: selectedInvoice.due_date,
        status: updatedStatus,
      };
  
      // Send PUT request to update the invoice status
      const invoiceUpdateResponse = await axios.put(
        `http://localhost:5000/invoices/${selectedInvoice.reference_number}`,
        invoiceUpdatePayload
      );
  
      // Handle success
      if (paymentResponse.status === 201 && invoiceUpdateResponse.status === 200) {
        toast.success("Customer payment processed successfully and invoice status updated.");
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
      }
    } catch (error) {
      console.error("Error processing customer payment:", error);
      toast.error("Error processing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-700">Customer Payment</h2>
      {paymentData.errorMessage && <p className="text-red-600 text-sm">{paymentData.errorMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Customer Dropdown */}
          <div className="flex flex-col">
            <label htmlFor="customerId" className="text-gray-600">Customer</label>
            <select
              name="customerId"
              id="customerId"
              value={paymentData.customerId}
              onChange={handleInputChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex flex-col">
            <label htmlFor="invoiceId" className="text-gray-600">Invoice</label>
            <select
              name="invoiceId"
              id="invoiceId"
              value={paymentData.invoiceId}
              onChange={handleInputChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.reference_number} - {(invoice.status).toUpperCase()} - ₵{" "}{invoice.balance_due}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Amount */}
          <div className="flex flex-col">
            <label htmlFor="amountPaid" className="text-gray-600">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              id="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              min="1"
              step="any"
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Payment Method */}
          <div className="flex flex-col">
            <label htmlFor="paymentMethod" className="text-gray-600">Payment Method</label>
            <select
              name="paymentMethod"
              id="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          {/* Document Upload */}
          <div className="flex flex-col">
            <label htmlFor="document" className="text-gray-600">Attach Documents (Optional)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="application/pdf, image/*"
              multiple
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300"
          >
            {loading ? "Processing..." : "Process Customer Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerPayment;
