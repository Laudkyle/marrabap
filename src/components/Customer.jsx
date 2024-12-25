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
import { Tooltip } from "react-tooltip"; // Correct import

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    customer_type: "business", // Default to Business
    contact_id: "",
    business_name: "",
    name: "",
    email: "",
    tax_number: "",
    credit_limit: "",
    pay_term: "",
    opening_balance: "",
    advance_balance: "",
    added_on: "",
    customer_group: "",
    address: "",
    mobile: "",
    total_sale_due: "",
    total_sell_return_due: "",
    active_status: true,
  });
  const API_URL = "http://localhost:5000/customers";

  const generateContact_id = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CUST-${timestamp}-${random}`;
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_URL);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Error fetching customers.");
      console.error("Error fetching customers:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { business_name, name, email, mobile, customer_type } = formData;

    if (customer_type === "business" && !business_name) {
      toast.error("Business Name is required.");
      return false;
    }
    if (customer_type === "individual" && !name) {
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

  const toggleActiveStatus = async (customer) => {
    try {
      await axios.patch(`${API_URL}/${customer.contact_id}`, {
        active_status: !customer.active_status,
      });
      setCustomers(
        customers.map((c) =>
          c.contact_id === customer.contact_id
            ? { ...c, active_status: !customer.active_status }
            : c
        )
      );
      toast.success("Customer status updated successfully!");
    } catch (error) {
      toast.error("Error toggling customer status.");
      console.error("Error toggling customer status:", error);
    }
  };

  const handleAddCustomer = async () => {
    try {
      // Prepare the customer data with generated fields
      const customerData = {
        ...formData,
        contact_id: generateContact_id(),
        added_on: new Date().toISOString().split("T")[0],
        active_status: true,
      };

      if (!validateForm()) return;

      const response = await axios.post(API_URL, customerData);

      if (response.data) {
        setCustomers([...customers, response.data]);
        toast.success("Customer added successfully!");

        // Reset form data
        setFormData({
          customer_type: "business",
          contact_id: "",
          business_name: "",
          name: "",
          email: "",
          tax_number: "",
          credit_limit: "0",
          pay_term: "0",
          opening_balance: "0",
          advance_balance: "0",
          added_on: "",
          customer_group: "",
          address: "",
          mobile: "",
          total_sale_due: "0",
          total_sell_return_due: "0",
          active_status: true,
        });

        setIsFormVisible(false);
      }
    } catch (error) {
        console.log(formData.customer_type);

      console.error("Error adding customer:", error);
      toast.error(error.response?.data?.message || "Error adding customer.");
    }
  };

  const handleDeleteCustomer = async (contact_id) => {
    try {
      await axios.delete(`${API_URL}/${contact_id}`);
      setCustomers(
        customers.filter((customer) => customer.contact_id !== contact_id)
      );
      toast.success("Customer deleted successfully!");
    } catch (error) {
        console.log(contact_id)
      toast.error("Error deleting customer.");
      console.error("Error deleting customer:", error);
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
    <div className="p-6 bg-gray-100 min-h-screen max-w-[80vw] overflow-x-scroll">
        <ToastContainer />
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Manage Customers
      </h1>

      <button
        onClick={() => setIsFormVisible(true)}
        className="mb-6 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
      >
        Add Customer
      </button>

      {isFormVisible && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Add New Customer
      </h2>
      <form
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Customer Type */}
        <div className="col-span-3">
          <label className="block text-gray-700 font-semibold mb-2">
            Customer Type
          </label>
          <select
            name="customer_type"
            value={formData.customer_type}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded w-full"
          >
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {/* Conditional fields for Business */}
        {formData.customer_type === "business" && (
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
        {formData.customer_type === "individual" && (
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
            Credit Limit
          </label>
          <input
            type="number"
            name="credit_limit"
            value={formData.credit_limit}
            onChange={handleInputChange}
            placeholder="Credit Limit"
            className="border border-gray-300 p-2 rounded w-full"
          />
        </div>

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
            Customer Group
          </label>
          <input
            type="text"
            name="customer_group"
            value={formData.customer_group}
            onChange={handleInputChange}
            placeholder="Customer Group"
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

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Total Sale Due
          </label>
          <input
            type="number"
            name="total_sale_due"
            value={formData.total_sale_due}
            onChange={handleInputChange}
            placeholder="Total Sale Due"
            className="border border-gray-300 p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Total Sell Return Due
          </label>
          <input
            type="number"
            name="total_sell_return_due"
            value={formData.total_sell_return_due}
            onChange={handleInputChange}
            placeholder="Total Sell Return Due"
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
          onClick={handleAddCustomer}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
        >
          Add Customer
        </button>
      </div>
    </div>
  </div>
)}

      {/* Customer Table */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Customer List
        </h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 px-4 py-2">Action</th>
                {Object.keys(formData).map((field) => (
                  <th key={field} className="border border-gray-200 px-4 py-2">
                  {field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                </th>
                
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer.contact_id} className="hover:bg-gray-100">
                    <td className="border border-gray-200 px-4 py-2">
                      <div className="flex items-center space-x-3">
                        <ActionButton
                          id={`payment-${customer.contact_id}`}
                          icon={<FaMoneyBillWave />}
                          tooltip="Pay"
                          onClick={() => {}}
                          color="green-500"
                        />
                        <ActionButton
                          id={`status-${customer.contact_id}`}
                          icon={
                            customer.active_status ? (
                              <FaToggleOn />
                            ) : (
                              <FaToggleOff />
                            )
                          }
                          tooltip={`${
                            customer.active_status ? "Deactivate" : "Activate"
                          } Customer`}
                          onClick={() => toggleActiveStatus(customer)}
                          color="blue-500"
                        />
                        <ActionButton
                          id={`edit-${customer.contact_id}`}
                          icon={<FaEdit />}
                          tooltip="Edit"
                          onClick={() => setIsFormVisible(true)}
                          color="yellow-500"
                        />
                        <ActionButton
                          id={`delete-${customer.contact_id}`}
                          icon={<FaTrash />}
                          tooltip="Delete"
                          onClick={() =>
                            handleDeleteCustomer(customer.contact_id)
                          }
                          color="red-500"
                        />
                        <ActionButton
                          id={`cart-${customer.contact_id}`}
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
                        className="border border-gray-200 px-4 py-2"
                      >
                        {customer[field]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={Object.keys(formData).length + 1}
                    className="border border-gray-200 px-4 py-2 text-center"
                  >
                    No customers found.
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

export default Customer;
