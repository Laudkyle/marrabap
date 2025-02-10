import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { FaEdit } from "react-icons/fa";

const AdjustmentsComponent = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState(null);
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    type: "",
    account: "",
    status: "posted",
  });
  

  const adjustmentTypes = [
    { value: "correction", label: "Error Correction" },
    { value: "reconciliation", label: "Bank Reconciliation" },
    { value: "depreciation", label: "Depreciation Adjustment" },
    { value: "accrual", label: "Accrual Entry" },
    { value: "prepaid", label: "Prepaid Expense" },
    { value: "deferral", label: "Revenue Deferral" },
    { value: "write-off", label: "Bad Debt Write-off" },
    { value: "tax", label: "Tax Adjustment" },
  ];
 
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.startDate || "",
        endDate: filters.endDate || "",
        type: filters.type || "",
        account: filters.account || "",
        status: filters.status || "",
      }).toString();

      const [adjustmentsRes, accountsRes] = await Promise.all([
        fetch(`http://localhost:5000/adjustments?${queryParams}`),
        fetch("http://localhost:5000/accounts"),
      ]);

      // Ensure both requests are successful before proceeding
      if (!adjustmentsRes.ok) {
        console.warn("Failed to fetch adjustments:", adjustmentsRes.statusText);
      }
      if (!accountsRes.ok) {
        console.warn("Failed to fetch accounts:", accountsRes.statusText);
      }

      const adjustmentsData = adjustmentsRes.ok
        ? await adjustmentsRes.json()
        : [];
      const accountsData = accountsRes.ok ? await accountsRes.json() : [];

      // Ensure proper format (fallback to empty array if not an array)
      setAdjustments(Array.isArray(adjustmentsData) ? adjustmentsData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAdjustments([]); // Ensure no error if fetch fails
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);


  const [formData, setFormData] = useState({
    adjustment_type: "",
    account_id: "",
    entry_type: "debit",
    amount: "",
    date: "",
    document_reference: "",
    reason: "",
  });


  useEffect(() => {
    if (currentAdjustment) {
      setFormData(currentAdjustment);
    } else {
      setFormData({
        adjustment_type: "",
        account_id: "",
        entry_type: "debit",
        amount: "",
        date: new Date().toISOString().split("T")[0], // Default to today
        document_reference: "",
        reason: "",
      });
    }
  }, [currentAdjustment, isModalOpen]); // Reset when modal opens
// Handle input changes but keep it local
const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
  const handleSave = async () => {
    if (!validateAdjustment()) return;

    try {
        const updatedAdjustment = {
            ...formData,
            created_by: "current_user", // Should come from auth context
            created_at: new Date().toISOString(),
            status: "pending",
            reference_number: generateReferenceNumber(),
            affected_periods: calculateAffectedPeriods(formData.date),
          };
      
          setCurrentAdjustment(updatedAdjustment); // Update state only on submit
      
      const endpoint = currentAdjustment.id
        ? `http://localhost:5000/adjustments/${currentAdjustment.id}`
        : "http://localhost:5000/adjustments";

      const method = currentAdjustment.id ? "PUT" : "POST";

      const enrichedAdjustment = {
        ...currentAdjustment,
        created_by: "current_user", // Should come from auth context
        created_at: new Date().toISOString(),
        status: "posted",
        reference_number: generateReferenceNumber(),
        affected_periods: calculateAffectedPeriods(currentAdjustment.date),
      };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedAdjustment),
      });

      if (!response.ok) {
        throw new Error("Failed to save adjustment.");
      }

      toast.success(
        currentAdjustment.id
          ? "Adjustment updated successfully!"
          : "Adjustment created successfully!"
      );

      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Error saving adjustment. Please try again.");
      console.error("Error saving adjustment:", error);
    }
  };

  const validateAdjustment = () => {
    const required = [
      "account_id",
      "adjustment_type",
      "amount",
      "reason",
      "date",
    ];
    const missing = required.filter((field) => !currentAdjustment[field]);

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(", ")}`);
      return false;
    }

    if (parseFloat(currentAdjustment.amount) <= 0) {
      alert("Amount must be greater than zero");
      return false;
    }

    return true;
  };

  const generateReferenceNumber = () => {
    return `ADJ-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  };

  const calculateAffectedPeriods = (date) => {
    const adjustmentDate = new Date(date);
    return {
      fiscal_year: adjustmentDate.getFullYear(),
      fiscal_quarter: Math.floor(adjustmentDate.getMonth() / 3) + 1,
      fiscal_month: adjustmentDate.getMonth() + 1,
    };
  };

  const Modal = ({ children, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-20px)] overflow-y-scroll bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Journal Adjustments
        </h2>
        <button
          onClick={() => {
            setCurrentAdjustment({
              adjustment_type: "",
              account_id: "",
              entry_type: "debit",
              amount: "",
              date: format(new Date(), "yyyy-MM-dd"),
              reason: "",
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          New Adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 space-x-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            {adjustmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="posted">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adjustments.map((adjustment) => (
              <tr key={adjustment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {adjustment.reference_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(adjustment.date), "dd MMM yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {
                    adjustmentTypes.find(
                      (t) => t.value === adjustment.adjustment_type
                    )?.label
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {adjustment.account_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {adjustment.entry_type === "debit"
                    ? Number(adjustment.amount).toFixed(2)
                    : ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {adjustment.entry_type === "credit"
                    ? Number(adjustment.amount).toFixed(2)
                    : ""}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      adjustment.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : adjustment.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {adjustment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button
                    onClick={() => {
                      setCurrentAdjustment(adjustment);
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <FaEdit />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-1/2 max-w-3xl overflow-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentAdjustment?.id ? "Edit Adjustment" : "New Adjustment"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                name="adjustment_type"
                value={formData.adjustment_type}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Type</option>
                {adjustmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account</label>
              <select
                name="account_id"
                value={formData.account_id}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.account_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Entry Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Entry Type</label>
              <select
                name="entry_type"
                value={formData.entry_type}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Document Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Document Reference</label>
              <input
                type="text"
                name="document_reference"
                value={formData.document_reference}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter reference number"
              />
            </div>

            {/* Reason */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                className="w-full mt-1 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the reason for this adjustment..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              {currentAdjustment?.id ? "Save Changes" : "Create Adjustment"}
            </button>
          </div>
        </div>
      </div>
    </Modal>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdjustmentsComponent;
