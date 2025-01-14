import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast,ToastContainer } from "react-toastify"; // Make sure to install react-toastify

const SupplierPayment = () => {
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    supplierId: "",
    amountPaid: "",
    paymentMethod: "cash", // Default to cash
    paymentReference: "", // This will be generated automatically
    paymentDate: new Date().toISOString(),
    documents: [], // To hold multiple documents
    errorMessage: "",
  });

  const [suppliers, setSuppliers] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch suppliers for dropdown
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Error fetching suppliers data.");
      }
    };
    fetchSuppliers();
  }, []);

  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
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

    // Generate a reference number for the payment
    const referenceNumber = generateReferenceNumber();

    setPaymentData((prevData) => ({
      ...prevData,
      paymentReference: referenceNumber,
    }));

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

    const paymentPayload = {
      reference_number: referenceNumber,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
      payment_reference: paymentData.paymentReference,
    };

    try {
      // Post payment data to the server
      const paymentResponse = await axios.post("http://localhost:5000/payments", paymentPayload);

      // If documents are attached, post them to /documents
      if (paymentData.documents.length > 0) {
        const formData = new FormData();
        formData.append("transaction_type", "payment"); // Define transaction type
        formData.append("reference_number", referenceNumber); // Attach the reference number

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

      // Handle success
      if (paymentResponse.status === 201) {
        toast.success("Supplier payment processed successfully.");
        setPaymentData({
          supplierId: "",
          amountPaid: "",
          paymentMethod: "cash",
          paymentReference: "",
          paymentDate: new Date().toISOString(),
          documents: [],
          errorMessage: "",
        });
      }
    } catch (error) {
      console.error("Error processing supplier payment:", error);
      toast.error("Error processing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-700">Supplier Payment</h2>
      {paymentData.errorMessage && <p className="text-red-600 text-sm">{paymentData.errorMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
      <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Supplier Dropdown */}
          <div className="flex flex-col">
            <label htmlFor="supplierId" className="text-gray-600">Supplier</label>
            <select
              name="supplierId"
              id="supplierId"
              value={paymentData.supplierId}
              onChange={handleInputChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
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

          {/* Payment Reference */}
          <div className="flex flex-col">
            <label htmlFor="paymentReference" className="text-gray-600">Payment Reference (Generated)</label>
            <input
              type="text"
              name="paymentReference"
              id="paymentReference"
              value={paymentData.paymentReference}
              readOnly
              className="mt-2 p-3 border border-gray-300 rounded-md bg-gray-100"
            />
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
            {loading ? "Processing..." : "Process Supplier Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierPayment;
