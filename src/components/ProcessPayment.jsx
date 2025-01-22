import React, { useState, useEffect } from "react";
import axios from "axios";

const ProcessPayment = () => {
  // Payment form state
  const [paymentData, setPaymentData] = useState({
    referenceNumber: "",
    amountPaid: "",
    paymentMethod: "cash", // Default to cash
    paymentReference: "",
    paymentDate: new Date().toISOString(),
    errorMessage: "",
  });

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch customers and suppliers for dropdowns
    const fetchContacts = async () => {
      try {
        const customerResponse = await axios.get("http://localhost:5000/customers");
        const supplierResponse = await axios.get("http://localhost:5000/suppliers");
        setCustomers(customerResponse.data);
        setSuppliers(supplierResponse.data);
      } catch (error) {
        console.error("Error fetching customers/suppliers:", error);
        setPaymentData((prevData) => ({
          ...prevData,
          errorMessage: "Error fetching data for contacts.",
        }));
      }
    };
    fetchContacts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
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
      return;
    }

    try {
      const { referenceNumber, amountPaid, paymentMethod, paymentReference, paymentDate } = paymentData;

      // Build the payment object based on the reference fields
      const paymentPayload = {
        referenceNumber,
        amountPaid,
        paymentMethod,
        paymentReference,
        paymentDate,
      };

      // Call API to process the payment
      const response = await axios.post("http://localhost:5000/payments", paymentPayload);

      // Handle success
      if (response.status === 200) {
        alert("Payment processed successfully");
        setPaymentData({
          referenceNumber: "",
          amountPaid: "",
          paymentMethod: "cash",
          paymentReference: "",
          paymentDate: new Date().toISOString(),
          errorMessage: "",
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      setPaymentData((prevData) => ({
        ...prevData,
        errorMessage: "Error processing payment. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Process Payment</h2>
      {paymentData.errorMessage && <p className="text-red-600 text-sm">{paymentData.errorMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reference Number */}
        <div className="flex flex-col">
          <label htmlFor="referenceNumber" className="text-gray-600">Reference Number</label>
          <input
            type="text"
            name="referenceNumber"
            id="referenceNumber"
            value={paymentData.referenceNumber}
            onChange={handleInputChange}
            required
            className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            {/* Additional payment methods can be added here */}
          </select>
        </div>

        {/* Payment Reference */}
        <div className="flex flex-col">
          <label htmlFor="paymentReference" className="text-gray-600">Payment Reference (Optional)</label>
          <input
            type="text"
            name="paymentReference"
            id="paymentReference"
            value={paymentData.paymentReference}
            onChange={handleInputChange}
            className="mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300"
          >
            {loading ? "Processing..." : "Process Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProcessPayment;
