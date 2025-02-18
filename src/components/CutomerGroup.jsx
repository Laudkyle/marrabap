import React, { useState, useEffect, useMemo } from "react";
import { FaEdit, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import API from "../api";
const ConfirmModal = ({ isVisible, onClose, onConfirm, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-gray-800 text-lg font-medium mb-4">{message}</h2>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-200"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerGroup = () => {
  const [formData, setFormData] = useState({
    group_name: "",
    discount: 0,
    discount_type: "percentage",
    tax_type: "VAT",
    tax_rate: 0,
    tax_type_details: "",
    description: "",
    active_status: true,
  });

  const [customerGroups, setCustomerGroups] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [filterText, setFilterText] = useState("");

  const API_URL = "/customer_groups"; // Correct URL

  // Fetch customer groups from the backend
  useEffect(() => {
    const fetchCustomerGroups = async () => {
      try {
        const response = await API.get(API_URL); // Use API_URL here
        const data = await response.data;
        setCustomerGroups(data);
      } catch (error) {
        console.error("Error fetching customer groups:", error);
      }
    };
    fetchCustomerGroups();
  }, []);
  // Filter customer groups based on the search text
  const filteredGroups = useMemo(() => {
    return customerGroups.filter((group) =>
      ["group_name", "discount", "tax_type", "tax_rate", "active_status"].some(
        (key) =>
          (group[key] || "")
            .toString()
            .toLowerCase()
            .includes(filterText.toLowerCase())
      )
    );
  }, [filterText, customerGroups]);
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Define columns for the data table
  const columns = [
    {
      name: "Group Name",
      selector: (row) => row.group_name,
      sortable: true,
    },
    {
      name: "Discount",
      selector: (row) =>
        `${row.discount}${row.discount_type === "percentage" ? "%" : ""}`,
      sortable: true,
    },
    {
      name: "Tax Type",
      selector: (row) => row.tax_type,
      sortable: true,
    },
    {
      name: "Tax Rate",
      selector: (row) =>
        `${row.tax_rate}${row.tax_type === "percentage" ? "%" : ""}`,
      sortable: true,
    },
    {
      name: "Active Status",
      selector: (row) => (row.active_status ? "Active" : "Not Active"),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleEditCustomerGroup(row)}
            className="text-indigo-600 hover:text-indigo-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDeleteGroup(row.id)}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];
  // Handle adding a new customer group
  const handleAddGroup = async () => {
    try {
      const response = await API.post(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const newGroup = await response.data;
      setCustomerGroups([...customerGroups, newGroup]);

      setFormData({
        group_name: "",
        discount: 0,
        discount_type: "percentage",
        tax_rate: 0,
        tax_type: "VAT",
        tax_type_details: "",
        description: "",
        active_status: true,
      });
      setIsFormVisible(false);

      toast.success("Customer group added successfully!");
    } catch (error) {
      console.error("Error adding customer group:", error);
      toast.error("Failed to add customer group.");
    }
  };

  // Handle editing an existing group
  const handleEditCustomerGroup = (group) => {
    setFormData({
      group_name: group.group_name,
      discount: group.discount,
      discount_type: group.discount_type,
      tax_rate: group.tax_rate,
      tax_type: group.tax_type,
      tax_type_details: group.tax_type_details,
      description: group.description,
      active_status: group.active_status,
    });
    setEditingGroupId(group.id);
    setIsFormVisible(true);
  };

  // Handle updating a customer group
  const handleUpdateGroup = async () => {
    try {
      const response = await API.put(`${API_URL}/${editingGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const updatedGroup = await response.data;

      setCustomerGroups(
        customerGroups.map((group) =>
          group.id === editingGroupId ? updatedGroup : group
        )
      );

      // Reset form and hide it
      setFormData({
        group_name: "",
        discount: 0,
        discount_type: "percentage",
        tax_rate: 0,
        tax_type: "VAT",
        tax_type_details: "",
        description: "",
        active_status: true,
      });
      setIsFormVisible(false);
      setEditingGroupId(null);

      toast.success("Customer group updated successfully!");
    } catch (error) {
      console.error("Error updating customer group:", error);
      toast.error("Failed to update customer group.");
    }
  };
  const handleDeleteGroup = async (groupId) => {
    try {
      await fetch(`${API_URL}/${groupId}`, {
        method: "DELETE",
      });

      setCustomerGroups(customerGroups.filter((group) => group.id !== groupId));
      toast.success("Customer group deleted successfully!");
    } catch (error) {
      console.error("Error deleting customer group:", error);
      toast.error("Failed to delete customer group.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      <button
        onClick={() => setIsFormVisible(true)}
        className="bg-indigo-500 text-white px-6 py-2 rounded-full shadow-md hover:bg-indigo-600 mb-6 transition-all duration-300 text-sm"
      >
        Add New Customer Group
      </button>

      {isFormVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-2xl font-medium text-gray-800 mb-4 text-center">
              {editingGroupId ? "Edit Customer Group" : "Create Customer Group"}
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  name="group_name"
                  value={formData.group_name}
                  onChange={handleInputChange}
                  placeholder="Enter group name"
                  className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">
                  Discount
                </label>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    placeholder="Discount"
                    className="border border-gray-300 p-3 rounded-xl w-2/3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    min="0"
                  />
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="border border-gray-300 p-3 rounded-xl w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  >
                    <option value="percentage">%</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">
                  Tax Type
                </label>
                <select
                  name="tax_type"
                  value={formData.tax_type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                >
                  <option value="VAT">VAT</option>
                  <option value="Sales Tax">Sales Tax</option>
                  <option value="GST">GST</option>
                  <option value="Custom Tax">Custom Tax</option>
                  <option value="Service Tax">Service Tax</option>
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">
                  Tax Rate
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  placeholder="Tax Rate"
                  className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  min="0"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">
                  Tax Details
                </label>
                <input
                  type="text"
                  name="tax_type_details"
                  value={formData.tax_type_details}
                  onChange={handleInputChange}
                  placeholder="Custom Tax Details (optional)"
                  className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Group Description"
                  className="border border-gray-300 p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  rows="3"
                />
              </div>

              <div className="col-span-3 flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="active_status"
                  checked={formData.active_status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      active_status: e.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />
                <label className="text-gray-700 text-sm">Active Status</label>
              </div>
            </form>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsFormVisible(false)}
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-300 transition duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={editingGroupId ? handleUpdateGroup : handleAddGroup}
                className="bg-indigo-500 text-white px-5 py-2 rounded-xl hover:bg-indigo-600 transition duration-200 text-sm"
              >
                {editingGroupId ? "Update Group" : "Add Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-medium text-gray-800 mb-4">
          Customer Groups
        </h2>
        <div className="mb-4 flex justify-end">
          <input
            type="text"
            placeholder="Search customer groups"
            className="p-2 border border-gray-300 rounded-md"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <DataTable
        className="z-0"
          columns={columns}
          data={filteredGroups}
          pagination
          highlightOnHover
          responsive
          striped
        />
      </div>
    </div>
  );
};

export default CustomerGroup;
