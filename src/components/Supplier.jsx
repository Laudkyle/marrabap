import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Individual',
    contactId: '',
    businessName: '',
    name: '',
    email: '',
    taxNumber: '',
    payTerm: '',
    openingBalance: '',
    advanceBalance: '',
    addedOn: '',
    address: '',
    mobile: '',
  });

  const API_URL = 'http://localhost:5000/suppliers'; // Update with your backend URL

  // Fetch suppliers from the backend
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(API_URL);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddSupplier = async () => {
    try {
      const response = await axios.post(API_URL, formData);
      setSuppliers([...suppliers, response.data]);
      setFormData({
        type: 'Individual',
        contactId: '',
        businessName: '',
        name: '',
        email: '',
        taxNumber: '',
        payTerm: '',
        openingBalance: '',
        advanceBalance: '',
        addedOn: '',
        address: '',
        mobile: '',
      });
      setIsFormVisible(false);
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen max-w-[80vw] overflow-x-scroll">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Manage Suppliers</h1>

      {/* Add Supplier Button */}
      <button
        onClick={() => setIsFormVisible(true)}
        className="mb-6 bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
      >
        Add Supplier
      </button>

      {/* Add Supplier Form Modal */}
      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Supplier</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="border border-gray-300 p-2 rounded"
              >
                <option value="Individual">Individual</option>
                <option value="Business">Business</option>
              </select>
              <input
                type="text"
                name="contactId"
                value={formData.contactId}
                onChange={handleInputChange}
                placeholder="Contact ID"
                className="border border-gray-300 p-2 rounded"
              />
              {formData.type === 'Business' && (
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Business Name"
                  className="border border-gray-300 p-2 rounded"
                />
              )}
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
            </form>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsFormVisible(false)}
                className="mr-4 bg-gray-400 text-white px-6 py-2 rounded shadow hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Table */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Supplier List</h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 px-4 py-2">Action</th>
                <th className="border border-gray-200 px-4 py-2">Type</th>
                <th className="border border-gray-200 px-4 py-2">Contact ID</th>
                <th className="border border-gray-200 px-4 py-2">Business Name</th>
                <th className="border border-gray-200 px-4 py-2">Name</th>
                <th className="border border-gray-200 px-4 py-2">Email</th>
                <th className="border border-gray-200 px-4 py-2">Tax Number</th>
                <th className="border border-gray-200 px-4 py-2">Pay Term</th>
                <th className="border border-gray-200 px-4 py-2">Opening Balance</th>
                <th className="border border-gray-200 px-4 py-2">Advance Balance</th>
                <th className="border border-gray-200 px-4 py-2">Added On</th>
                <th className="border border-gray-200 px-4 py-2">Address</th>
                <th className="border border-gray-200 px-4 py-2">Mobile</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-100">
                    <td className="border border-gray-200 px-4 py-2 text-center">
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.type}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.contactId}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.businessName}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.name}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.email}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.taxNumber}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.payTerm}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.openingBalance}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.advanceBalance}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.addedOn}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.address}</td>
                    <td className="border border-gray-200 px-4 py-2">{supplier.mobile}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="border border-gray-200 px-4 py-2 text-center">
                    No suppliers found.
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

export default Supplier;
