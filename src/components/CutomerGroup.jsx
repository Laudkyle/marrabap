import React, { useState } from 'react';

const CustomerGroup = () => {
  const [formData, setFormData] = useState({
    group_name: '',
    discount: 0,
    discount_type: 'percentage', // type of discount (percentage or amount)
    tax_type: 'VAT', // Tax type (VAT, Sales Tax, GST, etc.)
    tax_rate: 0, // Tax rate or amount
    tax_type_details: '', // For any custom tax-related details
    description: '',
    activeStatus: true,
  });

  const [customerGroups, setCustomerGroups] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle toggling the active status
  const handleToggleActiveStatus = (groupId) => {
    setCustomerGroups(
      customerGroups.map((group) =>
        group.id === groupId ? { ...group, activeStatus: !group.activeStatus } : group
      )
    );
  };

  // Handle adding a customer group
  const handleAddGroup = () => {
    const newGroup = {
      ...formData,
      id: customerGroups.length + 1, // simple ID generation
    };

    setCustomerGroups([...customerGroups, newGroup]);

    // Reset the form data after adding the group
    setFormData({
      group_name: '',
      discount: 0,
      discount_type: 'percentage',
      tax_rate: 0,
      tax_type: 'VAT',
      tax_type_details: '',
      description: '',
      activeStatus: true,
    });

    setIsFormVisible(false);
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
      activeStatus: group.activeStatus,
    });

    setIsFormVisible(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <button
        onClick={() => setIsFormVisible(true)}
        className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-md hover:bg-indigo-700 mb-6 transition-all duration-300"
      >
        Add New Customer Group
      </button>

      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Add New Customer Group</h2>
            <form
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">Group Name *</label>
                <input
                  type="text"
                  name="group_name"
                  value={formData.group_name}
                  onChange={handleInputChange}
                  placeholder="Enter group name"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">Discount</label>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    placeholder="Discount"
                    className="border border-gray-300 p-3 rounded-lg w-2/3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="border border-gray-300 p-3 rounded-lg w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">Tax Type</label>
                <select
                  name="tax_type"
                  value={formData.tax_type}
                  onChange={handleInputChange}
                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VAT">VAT</option>
                  <option value="Sales Tax">Sales Tax</option>
                  <option value="GST">GST</option>
                  <option value="Custom Tax">Custom Tax</option>
                  <option value="Service Tax">Service Tax</option>
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-gray-700 font-medium mb-2">Tax Rate</label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  placeholder="Tax Rate"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">Tax Details</label>
                <input
                  type="text"
                  name="tax_type_details"
                  value={formData.tax_type_details}
                  onChange={handleInputChange}
                  placeholder="Custom Tax Details (optional)"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Group Description"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="4"
                />
              </div>

              <div className="col-span-3 flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="activeStatus"
                  checked={formData.activeStatus}
                  onChange={(e) => setFormData({ ...formData, activeStatus: e.target.checked })}
                  className="h-5 w-5"
                />
                <label className="text-gray-700">Active Status</label>
              </div>
            </form>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsFormVisible(false)}
                className="mr-4 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Groups</h2>
        <table className="min-w-full table-auto border-collapse border border-gray-200">
          <thead>
            <tr className="text-left bg-gray-100">
              <th className="border border-gray-200 px-6 py-3">Group Name</th>
              <th className="border border-gray-200 px-6 py-3">Discount</th>
              <th className="border border-gray-200 px-6 py-3">Tax Type</th>
              <th className="border border-gray-200 px-6 py-3">Tax Rate</th>
              <th className="border border-gray-200 px-6 py-3">Active Status</th>
              <th className="border border-gray-200 px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customerGroups.map((group) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-6 py-3">{group.group_name}</td>
                <td className="border border-gray-200 px-6 py-3">
                  {group.discount} {group.discount_type}
                </td>
                <td className="border border-gray-200 px-6 py-3">{group.tax_type}</td>
                <td className="border border-gray-200 px-6 py-3">
                  {group.tax_rate} {group.tax_type === 'percentage' ? '%' : ''}
                </td>
                <td className="border border-gray-200 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={group.activeStatus}
                    onChange={() => handleToggleActiveStatus(group.id)}
                    className="mr-2"
                  />
                  {group.activeStatus ? 'Active' : 'Inactive'}
                </td>
                <td className="border border-gray-200 px-6 py-3">
                  <button
                    onClick={() => handleEditCustomerGroup(group)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerGroup;
