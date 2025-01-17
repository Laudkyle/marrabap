import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEdit, FaEye, FaTrashAlt, FaDollarSign } from "react-icons/fa";
import EditPurchaseOrder from "./EditPurchaseOrder";

const PurchaseOrdersTable = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState(null);

  // Fetch suppliers and purchase orders
  useEffect(() => {
    const fetchSuppliersAndOrders = async () => {
      setLoading(true);
      try {
        // Fetch suppliers
        const suppliersResponse = await axios.get(
          "http://localhost:5000/suppliers"
        );
        const suppliersData = suppliersResponse.data;

        // Fetch purchase orders
        const purchaseOrdersResponse = await axios.get(
          "http://localhost:5000/purchase_orders"
        );
        const purchaseOrdersData = purchaseOrdersResponse.data;

        // Map supplier names to purchase orders
        const enhancedPurchaseOrders = purchaseOrdersData.map((order) => {
          const supplier = suppliersData.find(
            (sup) => sup.id === order.supplier_id
          );
          return {
            ...order,
            supplier_name: supplier ? supplier.name : "Unknown Supplier",
          };
        });

        setSuppliers(suppliersData);
        setPurchaseOrders(enhancedPurchaseOrders);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliersAndOrders();
  }, []);

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?"))
      return;

    try {
      await axios.delete(`http://localhost:5000/purchase_orders/${id}`);
      setPurchaseOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== id)
      );
      toast.success("Purchase order deleted successfully!");
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast.error("Failed to delete purchase order. Please try again.");
    }
  };

  // Open Edit Modal
  const handleEdit = (id) => {
    setSelectedPurchaseOrderId(id);
    setEditModalOpen(true);
  };

  // Close Edit Modal and Refresh Data
  const handlePurchaseOrderUpdated = () => {
    setEditModalOpen(false);
    setSelectedPurchaseOrderId(null);
    toast.success("Purchase order updated successfully!");

    // Refetch purchase orders and suppliers
    setLoading(true);
    axios
      .get("http://localhost:5000/purchase_orders")
      .then((response) => {
        const purchaseOrdersData = response.data;
        const enhancedPurchaseOrders = purchaseOrdersData.map((order) => {
          const supplier = suppliers.find(
            (sup) => sup.id === order.supplier_id
          );
          return {
            ...order,
            supplier_name: supplier ? supplier.name : "Unknown Supplier",
          };
        });
        setPurchaseOrders(enhancedPurchaseOrders);
      })
      .catch((error) => {
        console.error("Error refreshing purchase orders:", error);
        toast.error("Failed to refresh purchase orders.");
      })
      .finally(() => setLoading(false));
  };

  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Supplier",
      selector: (row) => row.supplier_name,
      sortable: true,
    },
    {
      name: "Total Amount",
      selector: (row) => `₵${row.total_amount.toFixed(2)}`,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <div className="relative">
          <button
            onClick={() => handleStatusClick(row.id)}
            className="px-4 py-2 border rounded-md text-blue-500"
          >
            {row.status}
          </button>
          {dropdownStatus === row.id && (
            <div className="absolute bg-white border rounded-md shadow-lg mt-1 w-full">
              <ul className="text-gray-700">
                {["Pending", "Received", "Cancelled"].map((status) => (
                  <li
                    key={status}
                    onClick={() => handleStatusChange(row.id, status)}
                    className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                  >
                    {status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.id)}
            className="text-green-500 hover:text-green-700"
            title="Edit"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-500 hover:text-red-700"
            title="Delete"
          >
            <FaTrashAlt />
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const [dropdownStatus, setDropdownStatus] = useState(null);

  // Show the dropdown when a status button is clicked
  const handleStatusClick = (id) => {
    setDropdownStatus((prevId) => (prevId === id ? null : id)); // Toggle dropdown visibility
  };

  // Handle status change and update in the database
  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/purchase_orders/${id}/status`, {
        status: newStatus,
      });

      // Update the status in the local state
      setPurchaseOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );

      toast.success(`Purchase order status updated to "${newStatus}"!`);
      setDropdownStatus(null); // Close the dropdown after selection
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to update purchase order status. Please try again.");
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <ToastContainer />

      {/* Search Input */}
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search by reference number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={purchaseOrders.filter((order) =>
          order.reference_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
        responsive
      />

      {/* Edit Purchase Order Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-3/4 max-h-[90vh] overflow-y-auto">
            <EditPurchaseOrder
              purchaseOrderId={selectedPurchaseOrderId}
              onPurchaseOrderUpdated={handlePurchaseOrderUpdated}
            />
            <button
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              onClick={() => setEditModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersTable;
