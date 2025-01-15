import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { FaTrash, FaEye } from "react-icons/fa";
import ReactModal from "react-modal";
import { ToastContainer, toast } from "react-toastify";

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Fetch payments from the backend
  const fetchPayments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/payments");
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments.");
    }
  };

  // Fetch documents related to a payment
  const fetchDocuments = async (referenceNumber) => {
    try {
      const response = await axios.get(`http://localhost:5000/documents/by-reference/${referenceNumber}`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents.");
    }
  };

  // Handle delete confirmation
  const handleDelete = (payment) => {
    setShowDeleteConfirmation(true);
    setPaymentToDelete(payment);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/payments/${paymentToDelete.id}`);
      toast.success("Payment deleted successfully.");
      setShowDeleteConfirmation(false);
      fetchPayments(); // Refresh payments list
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment.");
    }
  };

  // Handle view payment
  const handleView = (payment) => {
    setSelectedPayment(payment);
    fetchDocuments(payment.reference_number); // Fetch related documents
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchText.toLowerCase();
    return (
      payment.reference_number.toLowerCase().includes(searchLower) ||
      payment.payment_date.toLowerCase().includes(searchLower) ||
      payment.amount_paid.toString().toLowerCase().includes(searchLower) ||
      (payment.payment_method && payment.payment_method.toLowerCase().includes(searchLower))
    );
  });

  // DataTable columns definition
  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Payment Date",
      selector: (row) => row.payment_date,
      sortable: true,
    },
    {
      name: "Amount Paid",
      selector: (row) => row.amount_paid,
      sortable: true,
      right: true,
    },
    {
      name: "Payment Method",
      selector: (row) => row.payment_method || "N/A",
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(row)}
            className="text-green-500 hover:text-green-700"
          >
            <FaEye />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-red-500 hover:text-red-700"
          >
            <FaTrash />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Custom subheader with search
  const customSubHeader = (
    <div className="w-full flex justify-between items-center">
      <input
        type="text"
        placeholder="Search by reference number"
        className="p-2 border border-gray-300 rounded-md w-1/3"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
    </div>
  );

  return (
    <div className="container mx-auto p-6 bg-gray-100 shadow-lg rounded-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Payment List</h2>

      <DataTable
        title="Payments"
        columns={columns}
        data={filteredPayments}
        pagination
        highlightOnHover
        defaultSortField="payment_date"
        subHeader
        subHeaderComponent={customSubHeader}
        className="bg-white rounded-lg shadow-lg"
      />

      {/* Delete Confirmation Modal */}
      <ReactModal
        isOpen={showDeleteConfirmation}
        onRequestClose={() => setShowDeleteConfirmation(false)}
        contentLabel="Confirm Delete"
        className="bg-white p-4 rounded-lg shadow-lg z-50 w-1/3 h-1/4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Delete</h2>
        <p className="text-gray-600">
          Are you sure you want to delete this payment?
        </p>
        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={() => setShowDeleteConfirmation(false)}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="bg-red-500 text-white py-2 px-4 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </ReactModal>

      {/* Payment View Modal */}
      {selectedPayment && (
        <ReactModal
          isOpen={!!selectedPayment}
          onRequestClose={() => setSelectedPayment(null)}
          contentLabel="Payment Details"
          className="bg-white w-[60vw] max-w-[800px] p-8 shadow-xl rounded-lg z-50"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
        >
          <h3 className="text-3xl font-bold text-gray-800 mb-6">Payment Details</h3>

          <div className="space-y-4">
            <div>
              <strong>Reference Number:</strong> {selectedPayment.reference_number}
            </div>
            <div>
              <strong>Payment Date:</strong> {selectedPayment.payment_date}
            </div>
            <div>
              <strong>Amount Paid:</strong> {selectedPayment.amount_paid}
            </div>
            <div>
              <strong>Payment Method:</strong> {selectedPayment.payment_method || "N/A"}
            </div>
          </div>

          {/* Documents Table */}
          <div className="mt-6 max-h-[200px] overflow-y-scroll">
            <h4 className="text-xl font-semibold text-gray-800 mb-4">Related Documents</h4>
            <DataTable
              title="Documents"
              columns={[
                { name: "Transaction Type", selector: (row) => row.transaction_type, sortable: true },
                { name: "Document Name", selector: (row) => row.document_name, sortable: true },
                { name: "Uploaded On", selector: (row) => row.uploaded_on, sortable: true },
                {
                  name: "File Path",
                  selector: (row) => (
                    <a href={row.file_path} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                      View Document
                    </a>
                  ),
                  sortable: true,
                },
              ]}
              data={documents}
              pagination
              highlightOnHover
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={() => setSelectedPayment(null)}
              className="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </ReactModal>
      )}

      <ToastContainer />
    </div>
  );
};

export default PaymentList;
