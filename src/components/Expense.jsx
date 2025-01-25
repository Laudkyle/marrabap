import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'react-data-table-component';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ExpenseComponent = () => {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_date: '',
    amount: '',
    expense_account_id: '',
    description: '',
    payment_method_id: '',
    payment_method: '',
  });
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
    fetchPaymentMethods();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('http://localhost:5000/payment-methods');
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleAddOrUpdateExpense = async () => {
    try {
      const dataToSend = { ...newExpense };

      // Handle credit-specific logic
      if (newExpense.payment_method === 'credit') {
        dataToSend.payment_method_id = null; // No direct payment method for credit
        dataToSend.account_credit_id = accounts.find(
          (account) => account.account_name === 'Accounts Payable'
        )?.id;
      }

      if (selectedExpense) {
        // Update existing expense
        await axios.put(`http://localhost:5000/expenses/${selectedExpense.id}`, dataToSend);
      } else {
        // Add new expense
        await axios.post('http://localhost:5000/expenses', dataToSend);
      }

      // Reset form and refresh data
      setShowAddModal(false);
      setNewExpense({
        expense_date: '',
        amount: '',
        expense_account_id: '',
        description: '',
        payment_method_id: '',
        payment_method: '',
      });
      setSelectedExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setNewExpense({
      expense_date: expense.expense_date,
      amount: expense.amount,
      expense_account_id: expense.expense_account_id,
      description: expense.description,
      payment_method: expense.account_credit_id ? 'credit' : expense.payment_method_id,
      payment_method_id: expense.payment_method_id,
    });
    setShowAddModal(true);
  };

  const columns = [
    {
      name: 'Date',
      selector: (row) => row.expense_date,
      sortable: true,
    },
    {
      name: 'Amount',
      selector: (row) => row.amount,
      sortable: true,
    },
    {
      name: 'Description',
      selector: (row) => row.description,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex space-x-4">
          <FaEdit
            onClick={() => handleEditExpense(row)}
            className="cursor-pointer text-yellow-500 hover:text-yellow-700"
            title="Edit"
          />
          <FaTrash
            onClick={() => handleDeleteExpense(row.id)}
            className="cursor-pointer text-red-500 hover:text-red-700"
            title="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-end mb-6">
        <button
          className="bg-blue-600 text-white py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          onClick={() => setShowAddModal(true)}
        >
          Add Expense
        </button>
      </div>

      <DataTable
        title="Expenses"
        columns={columns}
        data={expenses}
        pagination
        highlightOnHover
        striped
      />

      {/* Add or Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                {selectedExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowAddModal(false);
                  setNewExpense({
                    expense_date: '',
                    amount: '',
                    expense_account_id: '',
                    description: '',
                    payment_method_id: '',
                    payment_method: '',
                  });
                  setSelectedExpense(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.expense_date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, expense_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Expense Account</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.expense_account_id}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, expense_account_id: e.target.value })
                  }
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newExpense.payment_method}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, payment_method: e.target.value })
                  }
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name}>
                      {method.name}
                    </option>
                  ))}
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
                onClick={() => {
                  setShowAddModal(false);
                  setNewExpense({
                    expense_date: '',
                    amount: '',
                    expense_account_id: '',
                    description: '',
                    payment_method_id: '',
                    payment_method: '',
                  });
                  setSelectedExpense(null);
                }}
              >
                Close
              </button>
              <button
                className={`${
                  selectedExpense ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-2 px-4 rounded-lg transition duration-300`}
                onClick={handleAddOrUpdateExpense}
                disabled={
                  !newExpense.expense_date ||
                  !newExpense.amount ||
                  !newExpense.expense_account_id ||
                  (!newExpense.payment_method && newExpense.payment_method !== 'credit')
                }
              >
                {selectedExpense ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseComponent;
