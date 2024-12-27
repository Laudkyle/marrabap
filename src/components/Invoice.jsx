import React, { useState } from "react";
import printInvoice from "./PrintInvoice";
import { useCart } from "../CartContext";
import { FaTrash } from "react-icons/fa";
function Invoice({
  showInvoice,
  showDraft,
  setShowInvoice,
  handleCompleteSale,
  handleQuantityChangeNew,
  handleRemoveFromCart,
  handleSaveDraft,
  companyAddress,
  companyName,
  email,
  phone,
}) {
  const [refNum, setRefNum] = useState("");
  const { cart } = useCart();

  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);
  return (
    <div>
      {showInvoice && (
        <div className="fixed inset-0 z-5 flex justify-center items-center bg-black bg-opacity-50 invoice-modal-content">
          <div className="bg-white rounded-lg p-6 w-[90%] sm:w-[60%] md:w-[50%] lg:w-[40%] shadow-2xl">
            {/* Header */}
            <div className="border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold text-blue-600 mb-1">
                {companyName || "Company Name"}
              </h1>
              <p className="text-sm text-gray-600">
                {companyAddress || "123 Business St, City, Country"}
              </p>
              <p className="text-sm text-gray-600">
                Email: {email || "support@company.com"} | Phone:{" "}
                {phone || "(123) 456-7890"}
              </p>
              <h2 className="text-lg font-semibold mt-4">Invoice</h2>
              <p className="text-sm text-gray-600">
                Reference Number: <span className="font-medium">{refNum}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date:{" "}
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </p>
            </div>

            {/* Invoice Items - Tabular with Editable Quantity */}
            <div className="max-h-[30vh] overflow-auto">
              <table className="w-full table-auto border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2 text-left font-medium text-gray-700 border-r">
                      Item
                    </th>
                    <th className="p-2 text-center font-medium text-gray-700 border-r">
                      Qty
                    </th>
                    <th className="p-2 text-center font-medium text-gray-700 border-r">
                      Price (₵)
                    </th>
                    <th className="p-2 text-center font-medium text-gray-700 border-r">
                      Total (₵)
                    </th>
                    {showDraft && (
                      <th className="p-2 text-center font-medium text-gray-700 print-only">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 text-gray-600 border-r">
                        {item.product.name}
                      </td>
                      <td className="p-2 text-center text-gray-600 border-r">
                        <input
                          type={showDraft ? 'number' : "input"}
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChangeNew(e, item, index)
                          }
                          className="w-16 p-1 text-center border rounded"
                          max={item.product.stock} // Ensure max is the available stock
                        />
                      </td>
                      <td className="p-2 text-center text-gray-600 border-r">
                        {parseFloat(item.product.sp).toFixed(2)}
                      </td>
                      <td className="p-2 text-center text-gray-600 border-r">
                        {parseFloat(item.quantity * item.product.sp).toFixed(2)}
                      </td>
                      {showDraft && (
                        <td className="p-2 text-center print-only">
                          <button
                            onClick={() => handleRemoveFromCart(item)}
                            className="text-red-500 hover:underline"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 invoice-summary">
              <div className="flex justify-between sub">
                <span className="font-semibold text-gray-700 sub">
                  Subtotal:
                </span>
                <span className="sub">₵{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 sub">
                  Tax (10%):
                </span>
                <span className="sub">
                  ₵{(calculateTotal() * 0.1).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mt-2 border-t pt-2 grand">
                <span className="font-semibold text-lg grand">
                  Grand Total:
                </span>
                <span className="text-xl font-bold grand">
                  ₵{(calculateTotal() * 1.1).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-between print-only">
              <button
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Close
              </button>
              <button
                onClick={() => printInvoice()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Print Invoice
              </button>
              <button
                onClick={handleCompleteSale}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Complete Sale
              </button>
              {showDraft && (
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Save Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoice;
