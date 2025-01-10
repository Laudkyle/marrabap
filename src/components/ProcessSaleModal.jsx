import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

function ProcessSaleModal({
  showModal,
  setShowModal,
  refNum,
  handleProcessSale,
}) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch customers from the database
  const fetchCustomers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/customers", {
        timeout: 5000,
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to fetch customers. Please try again.");
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchCustomers();
    }
  }, [showModal]);

  // Handle file uploads
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (documents.length + files.length > 3) {
      toast.error("You can attach up to 3 documents only.");
    } else {
      setDocuments([...documents, ...files]);
    }
  };

  const handleRemoveDocument = (index) => {
    const updatedDocuments = [...documents];
    updatedDocuments.splice(index, 1);
    setDocuments(updatedDocuments);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer.");
      return;
    }

    if (documents.length > 3) {
      toast.error("You can attach up to 3 documents only.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("refNum", refNum);
      formData.append("customerId", selectedCustomer.id);
      documents.forEach((file, index) => {
        formData.append(`document${index + 1}`, file);
      });

      // Make the API call to process the sale
      await axios.post("http://localhost:5000/process-sale", formData);
      toast.success("Sale processed successfully!");
      setShowModal(false);
      handleProcessSale(); // Call callback to update the parent state if needed
    } catch (error) {
      toast.error("Failed to process the sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    showModal && (
      <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 w-[90%] sm:w-[60%] md:w-[50%] lg:w-[40%] shadow-2xl">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Process Sale
          </h2>
          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-2">
              Select Customer:
            </label>
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) =>
                setSelectedCustomer(
                  customers.find((c) => c.id === parseInt(e.target.value))
                )
              }
              className="w-full p-2 border rounded"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.customer_type})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-2">
              Attach Documents (up to 3):
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="w-full p-2 border rounded"
            />
            <ul className="mt-2">
              {documents.map((doc, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center bg-gray-100 p-2 rounded mb-2"
                >
                  <span className="truncate">{doc.name}</span>
                  <button
                    onClick={() => handleRemoveDocument(index)}
                    className="text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 mr-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={loading}
            >
              {loading ? "Processing..." : "Process Sale"}
            </button>
          </div>
        </div>
      </div>
    )
  );
}

export default ProcessSaleModal;
