import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi";
import { FaShoppingCart, FaTrash } from "react-icons/fa";
import { useCart } from "../CartContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";
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
  const handleSaveDraft = () => {
    const draft = {
      referenceNumber: refNum,
      items: cart.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.sp,
      })),
      dateTime: new Date().toLocaleString(),
    };
  
    // Save to localStorage (can be replaced with an API call to save to a backend)
    localStorage.setItem("draftInvoice", JSON.stringify(draft));
  
    // Optionally, show a success message
    alert("Draft saved successfully!");
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
  const printInvoice = () => {
    // Change input type to text to remove arrows
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach((input) => {
      input.setAttribute("type", " ");
    });

    // Open a new window with no UI elements, fullscreen
    const printWindow = window.open("", "", "width=1920,height=1080");

    // Get the content of the current invoice (or clone it for printing)
    const invoiceContent = document.querySelector(
      ".invoice-modal-content"
    ).outerHTML;

    // Create a <style> tag to ensure styles are included in the print window
    const styles = `
      <style>
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
  }

  .invoice-modal-content {
    padding: 20px;
  }

  table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    margin-bottom:20px;
  }

  th, td {
    padding: 10px;
    text-align: left;
    border: 1px solid #ddd; /* Horizontal lines */
  }

  th {
    background-color: #f4f4f4;
  }

  /* Shading even rows */
  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  .print-only {
    display: none;
  }

  input[type="text"] {
    -webkit-appearance: none;
    appearance: none;
  }

  @media print {
    body {
      width: 100%;
      margin: 0;
    }
    
    /* Ensuring horizontal lines are visible in print */
    table {
      border: 1px solid black;
    }

    th, td {
      border-top: 1px solid black;
      border-bottom: 1px solid black;
    }

    /* Ensure the even row shading persists in print */
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .print-only {
      display: none;
    }
      .invoice-summary {
      text-align:right;
      }
      .sub{
      font-size:22px;
      font-weight:600;
      margin-bottom:10px;

      }
      .grand{
      font-size:24px;
      font-weight:700;
      margin-top:10px;

      }
         @page {
      size: auto;
      margin: 0;
    }

    /* Remove any page headers or footers */
    html, body {
      padding: 0;
      margin: 0;
    }
  }
</style>

    `;

    // Write the invoice content and styles into the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          ${styles} <!-- Add the inline styles here -->
        </head>
        <body>
          ${invoiceContent} <!-- Add the invoice content -->
        </body>
      </html>
    `);

    // Wait for the content to be fully loaded, then print
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    // Restore the input type back to number after print (if necessary)
    inputs.forEach((input) => {
      input.setAttribute("type", "number");
    });
  };
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
