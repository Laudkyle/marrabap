import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi";
import { FaShoppingCart, FaTrash } from "react-icons/fa";
import { useCart } from "../CartContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import printInvoice from "./PrintInvoice";
function Shop({ companyName, companyAddress, email, phone }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [refNum, setRefNum] = useState("");
  const { cart, addToCart, setCart, clearCart, processSale, makeSale } =
    useCart();

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
  }, [saleComplete]);

  const filteredProducts = products.filter(
    (product) =>
      product &&
      product.name &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleRemoveFromCart = (itemToRemove) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
    );
    toast.info(`${itemToRemove.product.name} removed from cart`);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setError("");
  };

  const handleAddToCart = () => {
    if (quantity > selectedProduct.stock) {
      setError("Quantity exceeds available stock");
    } else {
      addToCart(selectedProduct, quantity);
      setSelectedProduct(null);
      toast.success(`${selectedProduct.name} added to cart`);
    }
  };

  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);

  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };
  const handleQuantityChange = (e, item, index) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (newQuantity >= 1) {
      const updatedCart = [...cart];
      updatedCart[index].quantity = newQuantity;
      setCart(updatedCart); // Update the cart with the new quantity
    }
  };
  const handleQuantityChangeNew = (e, item, index) => {
    const updatedQuantity = Math.min(
      Number(e.target.value),
      item.product.stock
    );
    // Update the quantity in the cart
    const updatedCart = [...cart];
    updatedCart[index].quantity = updatedQuantity;
    setCart(updatedCart);
  };

  // Updated handleMakeSale function
  const handleMakeSale = async () => {
    try {
      const referenceNumber = refNum; // Generate unique reference number
      await makeSale(selectedProduct, quantity, referenceNumber); // Pass reference number to makeSale
      setSaleComplete(!saleComplete); // Trigger product list refresh
      setSelectedProduct(null);
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("An error occurred while processing the sale.");
    }
  };

  // Updated handleCompleteSale function
  const handleCompleteSale = async () => {
    try {
      const referenceNumber = refNum; // Generate unique reference number
      const response = await processSale(referenceNumber); // Await the response from processSale

      if (response.status === 200 || response.status === 201) {
        // Check for 200 or 201 status
        setSaleComplete(!saleComplete); // Trigger product list refresh
        setShowInvoice(false); // Close the invoice modal
        clearCart();
        toast.success("Sale completed successfully!");
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("An error occurred while processing the sale.");
    }
  };

  const handleSaveDraft = async () => {
    const draft = {
      referenceNumber: refNum, // Unique reference number for the draft
      details: cart.map((item) => ({
        product_id: item.product.id, // Use product ID instead of name
        quantity: item.quantity,
      })),
      date: new Date().toISOString(), // Use ISO 8601 format for date
      status: "pending", // Default status for the draft
    };

    try {
      const response = await fetch("http://localhost:5000/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (response.status === 201) {
        // Successfully saved draft
        setShowInvoice(false); // Close the invoice modal
        clearCart();
        toast.success("Draft saved successfully!");
      } else {
        // Handle any issues with the response
        toast.error("Failed to save draft. Please try again.");
      }
    } catch (error) {
      // Handle errors (e.g., network or server errors)
      console.error("Error saving draft:", error);
      toast.error("An error occurred while saving the draft.");
    }
  };

  useEffect(() => {
    setRefNum(generateReferenceNumber());
  }, []);
  useEffect(() => {
    setRefNum(generateReferenceNumber());
  }, [showInvoice]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <ToastContainer />
      {/* Search and Cart UI */}
      <div className="sticky top-0 z-2 p-4 bg-gray-800 text-white">
        <div className="flex justify-end items-center">
          <div className="relative w-full sm:w-[80%] md:w-[60%] lg:w-[50%]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FiSearch className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 pr-4 outline-none text-black rounded-3xl"
            />
          </div>
          <div className="relative w-10 h-10">
            <FaShoppingCart
              className="text-3xl mt-1 cursor-pointer"
              onClick={() => setShowInvoice(true)} // Show invoice modal
            />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-center text-white text-xs w-6 h-6 rounded-full">
                <h5 className="mt-1">{cart.length}</h5>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-8rem)] p-4 pl-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)}>
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            <div>No products found</div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-[90%] sm:w-[60%] md:w-[50%] lg:w-[40%]">
            {/* Modal Header */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Purchase {selectedProduct.name}
            </h2>

            {/* Product Price */}
            <div className="mb-6">
              <p className="text-xl font-medium text-gray-900">
                Price:{" "}
                <span className="text-2xl font-semibold text-green-600">
                  ₵{parseFloat(selectedProduct.sp).toFixed(2)}
                </span>
              </p>
            </div>

            {/* Stock Information */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total in Stock:</span>
                <span className="font-semibold text-gray-900">
                  {selectedProduct.stock}
                </span>
              </p>
            </div>

            {/* Quantity Input */}
            <div className="flex items-center mb-6">
              <label
                htmlFor="quantity"
                className="mr-4 font-medium text-gray-700"
              >
                Quantity:
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.min(Number(e.target.value), selectedProduct.stock)
                  )
                }
                className="w-20 p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                min="1"
                max={selectedProduct.stock}
              />
            </div>

            {/* Total Price Calculation */}
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Total Price for <span className="font-medium">{quantity}</span>{" "}
                {selectedProduct.name}:
                <span className="font-semibold text-gray-900">
                  ₵{parseFloat(quantity * selectedProduct.sp).toFixed(2)}
                </span>
              </p>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {/* Action Buttons */}
            <div className="flex justify-between items-center space-x-4 mt-8">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Close
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleMakeSale}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  Make Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
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
                    <th className="p-2 text-center font-medium text-gray-700 print-only">
                      Action
                    </th>
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
                          max={item.product.stock} // Ensure max is the available stock
                        />
                      </td>
                      <td className="p-2 text-center text-gray-600 border-r">
                        {parseFloat(item.product.sp).toFixed(2)}
                      </td>
                      <td className="p-2 text-center text-gray-600 border-r">
                        {parseFloat(item.quantity * item.product.sp).toFixed(2)}
                      </td>
                      <td className="p-2 text-center print-only">
                        <button
                          onClick={() => handleRemoveFromCart(item)}
                          className="text-red-500 hover:underline"
                        >
                          <FaTrash />
                        </button>
                      </td>
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

            {/* Buttons */}
            <div className="mt-6 flex justify-between print-only">
              <button
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
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
              {/* Draft Button */}
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>
        {`
          @media print {
            .print-only {
              display: none;
            }
          }
        `}
      </style>
    </div>
  );
}

export default Shop;
