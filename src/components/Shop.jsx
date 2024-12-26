import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch} from "react-icons/fi";
import { FaShoppingCart,FaTrash } from "react-icons/fa";
import { useCart } from "../CartContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const { cart, addToCart,setCart, clearCart, processSale, makeSale } = useCart();

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
      await processSale(referenceNumber); // Pass cart and reference number to processSale
      setSaleComplete(!saleComplete); // Trigger product list refresh
      setShowInvoice(false); // Close the invoice modal
      clearCart();
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("An error occurred while processing the sale.");
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
      <div className="sticky top-0 z-10 p-4 bg-gray-800 text-white">
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
          <div className="bg-white rounded-lg p-6 w-[90%] sm:w-[60%] md:w-[40%] lg:w-[30%] shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              Purchase {selectedProduct.name}
            </h2>
            <p className="mb-4">Price: ${selectedProduct.sp}</p>
            <div className="flex items-center mb-4">
              <label htmlFor="quantity" className="mr-2 font-semibold">
                Quantity:
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-16 p-2 border border-gray-300 rounded-md text-center"
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="flex justify-between">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Close
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={handleAddToCart}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleMakeSale}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Make Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
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

            {/* Invoice Items */}
            <div className="max-h-[30vh] overflow-scroll px-2">
              <ul className="space-y-2">
                {cart.map((item, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-sm text-gray-600">
                        {item.quantity} x ₵{item.product.sp}
                      </span>
                    </div>
                    <span className="text-right font-medium">
                      ₵{item.quantity * item.product.sp}
                    </span>
                    <button
                      onClick={() => handleRemoveFromCart(item)}
                      className="text-red-500 hover:underline ml-4"
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Summary */}
            <div className="mt-6">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Subtotal:</span>
                <span>₵{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Tax (10%):</span>
                <span>₵{(calculateTotal() * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2 border-t pt-2">
                <span className="font-semibold text-lg">Grand Total:</span>
                <span className="text-xl font-bold">
                  ₵{(calculateTotal() * 1.1).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shop;
