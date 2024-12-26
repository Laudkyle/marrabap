import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaTrash,
  FaEdit,
  FaMoneyBillWave,
  FaToggleOn,
  FaToggleOff,
  FaEye,
} from "react-icons/fa";
import { FiSearch } from "react-icons/fi";

import { Tooltip } from "react-tooltip";

const Supplier = () => {
  const [Suppliers, setSuppliers] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditFormVisible, setIsEditFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    type: "individual",
    contactId: "",
    businessName: "",
    name: "",
    email: "",
    taxNumber: "",
    payTerm: "",
    openingBalance: "",
    advanceBalance: "",
    addedOn: "",
    address: "",
    mobile: "",
  });
  const API_URL = "http://localhost:5000/suppliers"; // Update with your backend URL

  const generateContact_id = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SUPP-${timestamp}-${random}`;
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(API_URL);
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Error fetching Suppliers.");
      console.error("Error fetching Suppliers:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);
  const [filteredSuppliers, setFilteredSuppliers] = useState(Suppliers);

  const handleFilterChange = (filter) => {
    let updatedList = Suppliers;
    if (filter === "active") {
      updatedList = Suppliers.filter((supplier) => supplier.active_status);
    } else if (filter === "inactive") {
      updatedList = Suppliers.filter((supplier) => !supplier.active_status);
    } else if (filter === "business") {
      updatedList = Suppliers.filter(
        (supplier) => supplier.type === "business"
      );
    } else if (filter === "individual") {
      updatedList = Suppliers.filter(
        (supplier) => supplier.type === "individual"
      );
    }
    setFilteredSuppliers(updatedList);
  };

  // Handle live search
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase(); // Convert query to lowercase for case-insensitive comparison
    setSearchQuery(query);

    if (query === "") {
      setFilteredSuppliers(Suppliers); // Show all Suppliers if search is empty
    } else {
      const filtered = Suppliers.filter((supplier) => {
        // Check if any of the specified fields contain the query
        return (
          supplier.business_name?.toLowerCase().includes(query) ||
          supplier.name?.toLowerCase().includes(query) ||
          supplier.email?.toLowerCase().includes(query) ||
          supplier.supplier_group?.toLowerCase().includes(query) ||
          supplier.address?.toLowerCase().includes(query) ||
          supplier.mobile?.toLowerCase().includes(query)
        );
      });
      setFilteredSuppliers(filtered);
    }
  };

  useEffect(() => {
    setFilteredSuppliers(Suppliers);
  }, [Suppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { business_name, name, email, mobile, type } = formData;

    if (type === "business" && !business_name) {
      toast.error("Business Name is required.");
      return false;
    }
    if (type === "individual" && !name) {
      toast.error("Full Name is required.");
      return false;
    }
    if (!email) {
      toast.error("Email is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!mobile) {
      toast.error("Mobile number is required.");
      return false;
    }
    return true;
  };
  const handleEditClick = (supplier) => {
    setFormData({
      type: supplier.type || "business",
      contact_id: supplier.contact_id || "",
      business_name: supplier.business_name || "",
      name: supplier.name || "",
      email: supplier.email || "",
      tax_number: supplier.tax_number || "",
      pay_term: supplier.pay_term || "0",
      opening_balance: supplier.opening_balance || "0",
      advance_balance: supplier.advance_balance || "0",
      added_on: supplier.added_on || "",
      address: supplier.address || "",
      mobile: supplier.mobile || "",
    });
    setIsEditFormVisible(true);
  };

  const toggleActiveStatus = async (supplier) => {
    try {
      await axios.patch(`${API_URL}/${supplier.contact_id}`, {
        active_status: !supplier.active_status,
      });
      setSuppliers(
        Suppliers.map((c) =>
          c.contact_id === supplier.contact_id
            ? { ...c, active_status: !supplier.active_status }
            : c
        )
      );
      toast.success("supplier status updated successfully!");
    } catch (error) {
      toast.error("Error toggling supplier status.");
      console.error("Error toggling supplier status:", error);
    }
  };

  const handleAddsupplier = async () => {
    try {
      // Prepare the supplier data with generated fields
      const supplierData = {
        ...formData,
        contact_id: generateContact_id(),
        added_on: new Date().toISOString().split("T")[0],
        active_status: true,
      };

      if (!validateForm()) return;

      const response = await axios.post(API_URL, supplierData);

      if (response.data) {
        setSuppliers([...Suppliers, response.data]);
        toast.success("supplier added successfully!");

        // Reset form data
        setFormData({
          type: "business",
          contact_id: "",
          business_name: "",
          name: "",
          email: "",
          tax_number: "",
          pay_term: "0",
          opening_balance: "0",
          advance_balance: "0",
          added_on: "",
          address: "",
          mobile: "",
        });

        setIsFormVisible(false);
      }
    } catch (error) {
      console.log(formData.type);

      console.error("Error adding supplier:", error);
      toast.error(error.response?.data?.message || "Error adding supplier.");
    }
  };
  const handleEditsupplier = async () => {
    try {
      if (!validateForm()) return;

      // Prepare the supplier data
      const supplierData = {
        ...formData,
        added_on: formData.added_on || new Date().toISOString().split("T")[0],
      };

      // Make a PUT request to update the supplier
      const response = await axios.put(
        `${API_URL}/${formData.contact_id}`,
        supplierData
      );

      if (response.data) {
        // Update the supplier list in state
        setSuppliers(
          Suppliers.map((supplier) =>
            supplier.contact_id === formData.contact_id
              ? response.data
              : supplier
          )
        );
        toast.success("supplier updated successfully!");

        // Reset form data and close the form
        setFormData({
          type: "business",
          contact_id: "",
          business_name: "",
          name: "",
          email: "",
          tax_number: "",
          pay_term: "0",
          opening_balance: "0",
          advance_balance: "0",
          added_on: "",
          address: "",
          mobile: "",
        });

        setIsEditFormVisible(false); // Hide the edit form
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast.error(error.response?.data?.message || "Error updating supplier.");
    }
  };

  const handleDeletesupplier = async (contact_id) => {
    try {
      await axios.delete(`${API_URL}/${contact_id}`);
      setSuppliers(
        Suppliers.filter((supplier) => supplier.contact_id !== contact_id)
      );
      toast.success("supplier deleted successfully!");
    } catch (error) {
      console.log(contact_id);
      toast.error("Error deleting supplier.");
      console.error("Error deleting supplier:", error);
    }
  };

  const ActionButton = ({ id, icon, tooltip, onClick, color }) => (
    <>
      <button
        data-tooltip-id={`tooltip-${id}`}
        data-tooltip-content={tooltip}
        onClick={onClick}
        className={`text-${color} hover:text-${color}-700 transition-colors duration-200`}
      >
        {icon}
      </button>
      <Tooltip id={`tooltip-${id}`} place="top" />
    </>
  );

  return (
    <div className=" bg-gray-100  max-w-[80vw] h-[70vh] overflow-scroll">
      <ToastContainer />
      <div className="sticky top-0 z-2 p-4 h-16 bg-gray-800 flex mb-2 justify-center">
        <div className="flex justify-between items-center w-full">
          <div className="flex w-full items-center justify-end space-x-3">
            {/* Filter Dropdown */}
            <select
              className="border border-gray-300 w-64  text-sm rounded px-3 py-2 focus:outline-none "
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value=""> Filter By</option>
              <option value="active"> Active</option>
              <option value="inactive"> Inactive</option>
              <option value="business"> Business</option>
              <option value="individual"> Individual</option>
            </select>

            <div className="relative w-full sm:w-[80%] md:w-[60%] lg:w-[50%]">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FiSearch className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Search for Suppliers..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-2 pl-10 pr-4 outline-none text-black rounded-3xl"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Manage Suppliers
        </h1>

        <button
          onClick={() => setIsFormVisible(true)}
          className="mb-6 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
        >
          Add supplier
        </button>
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Add New supplier
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* supplier Type */}
              <div className="col-span-3">
                <label className="block text-gray-700 font-semibold mb-2">
                  Supplier Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 rounded w-full"
                >
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>

              {/* Conditional fields for Business */}
              {formData.type === "business" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      placeholder="Business Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      name="tax_number"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                      placeholder="Tax Number"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Conditional fields for Individual */}
              {formData.type === "individual" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Fullname Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Mobile"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              {/* Optional Fields */}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Pay Term
                </label>
                <input
                  type="text"
                  name="pay_term"
                  value={formData.pay_term}
                  onChange={handleInputChange}
                  placeholder="Pay Term"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  placeholder="Opening Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Advance Balance
                </label>
                <input
                  type="number"
                  name="advance_balance"
                  value={formData.advance_balance}
                  onChange={handleInputChange}
                  placeholder="Advance Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsFormVisible(false)}
                className="mr-4 bg-gray-400 text-white px-6 py-2 rounded shadow hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddsupplier}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              >
                Add supplier
              </button>
            </div>
          </div>
        </div>
      )}
      {isEditFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Add New supplier
            </h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* supplier Type */}
              <div className="col-span-3">
                <label className="block text-gray-700 font-semibold mb-2">
                  Supplier Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-2 rounded w-full"
                >
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>

              {/* Conditional fields for Business */}
              {formData.type === "business" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      placeholder="Business Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      name="tax_number"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                      placeholder="Tax Number"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Conditional fields for Individual */}
              {formData.type === "individual" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Fullname Name"
                      className="border border-gray-300 p-2 rounded w-full"
                    />
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Mobile"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              {/* Optional Fields */}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Pay Term
                </label>
                <input
                  type="text"
                  name="pay_term"
                  value={formData.pay_term}
                  onChange={handleInputChange}
                  placeholder="Pay Term"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                  placeholder="Opening Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Advance Balance
                </label>
                <input
                  type="number"
                  name="advance_balance"
                  value={formData.advance_balance}
                  onChange={handleInputChange}
                  placeholder="Advance Balance"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address"
                  className="border border-gray-300 p-2 rounded w-full"
                />
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsEditFormVisible(false)}
                className="mr-4 bg-gray-400 text-white px-6 py-2 rounded shadow hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditsupplier}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              >
                Update Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* supplier Table */}
      <div className="bg-white mx-6 shadow-sm rounded-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Supplier List
        </h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                  Action
                </th>
                {Object.keys(formData).map((field) => (
                  <th
                    key={field}
                    className="text-left text-sm font-medium text-gray-600 px-4 py-2"
                  >
                    {field
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.contact_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <ActionButton
                          id={`payment-${supplier.contact_id}`}
                          icon={<FaMoneyBillWave />}
                          tooltip="Pay"
                          onClick={() => {}}
                          color="green-500"
                        />
                        <ActionButton
                          id={`status-${supplier.contact_id}`}
                          icon={
                            supplier.active_status ? (
                              <FaToggleOn />
                            ) : (
                              <FaToggleOff />
                            )
                          }
                          tooltip={`${
                            supplier.active_status ? "Deactivate" : "Activate"
                          } supplier`}
                          onClick={() => toggleActiveStatus(supplier)}
                          color="blue-500"
                        />
                        <ActionButton
                          id={`edit-${supplier.contact_id}`}
                          icon={<FaEdit />}
                          tooltip="Edit"
                          onClick={() => handleEditClick(supplier)}
                          color="yellow-500"
                        />
                        <ActionButton
                          id={`delete-${supplier.contact_id}`}
                          icon={<FaTrash />}
                          tooltip="Delete"
                          onClick={() =>
                            handleDeletesupplier(supplier.contact_id)
                          }
                          color="red-500"
                        />
                        <ActionButton
                          id={`cart-${supplier.contact_id}`}
                          icon={<FaEye />}
                          tooltip="View"
                          onClick={() => {}}
                          color="purple-500"
                        />
                      </div>
                    </td>
                    {Object.keys(formData).map((field) => (
                      <td
                        key={field}
                        className="text-sm text-gray-700 px-4 py-2 border-b border-gray-200"
                      >
                        {field === "active_status"
                          ? supplier[field]
                            ? "Active"
                            : "Not Active"
                          : supplier[field]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={Object.keys(formData).length + 1}
                    className="text-center text-sm text-gray-500 px-4 py-2"
                  >
                    No Suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Tooltip />
    </div>
  );
};

export default Supplier;
