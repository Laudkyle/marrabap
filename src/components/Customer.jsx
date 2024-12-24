import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    contactId: '',
    businessName: '',
    name: '',
    email: '',
    taxNumber: '',
    creditLimit: '',
    payTerm: '',
    openingBalance: '',
    advanceBalance: '',
    addedOn: '',
    customerGroup: '',
    address: '',
    mobile: '',
    totalSaleDue: '',
    totalSellReturnDue: '',
  });

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers'); // Update with your API endpoint
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddCustomer = async () => {
    try {
      const response = await axios.post('/api/customers', formData); // Update with your API endpoint
      setCustomers([...customers, response.data]);
      setFormData({
        contactId: '',
        businessName: '',
        name: '',
        email: '',
        taxNumber: '',
        creditLimit: '',
        payTerm: '',
        openingBalance: '',
        advanceBalance: '',
        addedOn: '',
        customerGroup: '',
        address: '',
        mobile: '',
        totalSaleDue: '',
        totalSellReturnDue: '',
      });
      setIsFormVisible(false);
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen max-w-[80vw] overflow-x-scroll">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Manage Customers</h1>

      {/* Add Customer Button */}
      <button
        onClick={() => setIsFormVisible(true)}
        className="mb-6 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
      >
        Add Customer
      </button>

      {/* Add Customer Form Modal */}
      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Customer</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="contactId"
                value={formData.contactId}
                onChange={handleInputChange}
                placeholder="Contact ID"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                placeholder="Business Name"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Name"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleInputChange}
                placeholder="Tax Number"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="number"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleInputChange}
                placeholder="Credit Limit"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="payTerm"
                value={formData.payTerm}
                onChange={handleInputChange}
                placeholder="Pay Term"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="number"
                name="openingBalance"
                value={formData.openingBalance}
                onChange={handleInputChange}
                placeholder="Opening Balance"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="number"
                name="advanceBalance"
                value={formData.advanceBalance}
                onChange={handleInputChange}
                placeholder="Advance Balance"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="date"
                name="addedOn"
                value={formData.addedOn}
                onChange={handleInputChange}
                placeholder="Added On"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="customerGroup"
                value={formData.customerGroup}
                onChange={handleInputChange}
                placeholder="Customer Group"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Address"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="Mobile"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="number"
                name="totalSaleDue"
                value={formData.totalSaleDue}
                onChange={handleInputChange}
                placeholder="Total Sale Due"
                className="border border-gray-300 p-2 rounded"
              />
              <input
                type="number"
                name="totalSellReturnDue"
                value={formData.totalSellReturnDue}
                onChange={handleInputChange}
                placeholder="Total Sell Return Due"
                className="border border-gray-300 p-2 rounded"
              />
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
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Customer List</h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 px-4 py-2">Action</th>
                {Object.keys(formData).map((field) => (
                  <th key={field} className="border border-gray-200 px-4 py-2">
                    {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer.contactId} className="hover:bg-gray-100">
                    <td className="border border-gray-200 px-4 py-2 text-center">
                      <button className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                    {Object.keys(formData).map((field) => (
                      <td key={field} className="border border-gray-200 px-4 py-2">
                        {customer[field]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Object.keys(formData).length + 1} className="border border-gray-200 px-4 py-2 text-center">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customer;
