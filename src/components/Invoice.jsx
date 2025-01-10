import React, { useState, useEffect } from "react";
import axios from "axios";
import printInvoice from "./PrintInvoice";
import { useCart } from "../CartContext";
import { FaTrash } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

function Invoice({
  showInvoice,
  showDraft,
  setShowInvoice,
  handleQuantityChangeNew,
  handleRemoveFromCart,
  handleSaveDraft,
  companyAddress,
  handleAddNewItem,
  companyName,
  refNum,
  email,
  phone,
  documents,
  setDocuments,
  newDocument,
  setNewDocument,
}) {
  const { cart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/products", {
        timeout: 5000,
      });
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Failed to fetch products. Please try again.");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);


  const removeDocument = (index) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocuments);
  };

  return (
    <div>
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-[95%] lg:w-[70%] shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Sales */}
              <div className="w-full lg:w-1/2">
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
                    Reference Number:{" "}
                    <span className="font-medium">{refNum}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Date:{" "}
                    <span className="font-medium">
                      {new Date().toLocaleDateString()}
                    </span>
                  </p>
                </div>

                {/* Product Selection for Draft */}
                {showDraft && (
                  <div className="flex space-x-2 mb-4">
                    <select
                      value={selectedProduct?.id || ""}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const product = products.find((p) => p.id == productId);
                        if (product) {
                          setSelectedProduct(product);
                          setNewItemQuantity(1);
                        }
                      }}
                      className="p-2 border rounded flex-1"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) =>
                        setNewItemQuantity(Number(e.target.value))
                      }
                      className="p-2 border rounded w-12"
                    />

                    <button
                      onClick={() => {
                        if (selectedProduct) {
                          handleAddNewItem(selectedProduct, newItemQuantity);
                          setSelectedProduct(null);
                          setNewItemQuantity(1);
                        }
                      }}
                      className="p-2 bg-blue-600 text-white rounded"
                    >
                      Add Item
                    </button>
                  </div>
                )}

                {/* Invoice Items */}
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
                          <th className="p-2 text-center font-medium text-gray-700">
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
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChangeNew(e, item, index)
                              }
                              className="w-16 p-1 text-center border rounded"
                            />
                          </td>
                          <td className="p-2 text-center text-gray-600 border-r">
                            {parseFloat(item.product.sp).toFixed(2)}
                          </td>
                          <td className="p-2 text-center text-gray-600 border-r">
                            {parseFloat(
                              item.quantity * item.product.sp
                            ).toFixed(2)}
                          </td>
                          {showDraft && (
                            <td className="p-2 text-center">
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
              </div>

              {/* Right Column - Documents */}
              <div className="w-full lg:w-1/2">
                {/* Summary */}

                <div className="mt-6">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">
                      Subtotal:
                    </span>
                    <span>₵{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">
                      Tax (10%):
                    </span>
                    <span>₵{(calculateTotal() * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 border-t pt-2">
                    <span className="font-semibold text-lg">Grand Total:</span>
                    <span className="text-xl font-bold">
                      ₵{(calculateTotal() * 1.1).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-blue-600 mb-4">
                    Documents
                  </h2>
                  <div>
                    <input
                      type="file"
                      onChange={(e) => {
                        const selectedFiles = e.target.files;
                        if (selectedFiles) {
                          setDocuments([
                            ...documents,
                            ...Array.from(selectedFiles),
                          ]);
                        }
                      }}
                      className="p-2 border rounded w-full mb-2"
                      multiple // Allow selecting multiple files at once
                    />
                  </div>

                  <ul className="mt-4 space-y-2">
                    {documents.map((doc, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center border p-2 rounded"
                      >
                        <span>{doc.name}</span> {/* Display the file name */}
                        <button
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:underline"
                        >
                          <FaTrash />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex justify-between">
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
