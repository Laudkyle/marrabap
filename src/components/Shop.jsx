import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi";
import { FaShoppingCart, FaTrash } from "react-icons/fa";
import { useCart } from "../CartContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import Invoice from "./Invoice";
import "react-toastify/dist/ReactToastify.css";

function Shop({ companyName, companyAddress, email, phone }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDraft, setShowDraft] = useState(true);
  const [showProcessSaleModal, setShowProcessSaleModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showCompleteSale, setShowCompleteSale] = useState(true);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [taxes, setTaxes] = useState([]);
  const [selectedTax, setSelectedTax] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [refNum, setRefNum] = useState("");
  const [documents, setDocuments] = useState([]); // State to handle documents
  const [newDocument, setNewDocument] = useState(""); // State for new document input
  const [showClearCart, setShowClearCart] = useState(false);

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

  useEffect(() => {
    fetch("http://localhost:5000/taxes")
      .then((response) => response.json())
      .then((data) => setTaxes(data))
      .catch((error) => console.error("Error fetching taxes:", error));
  }, []);

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
    if (!selectedProduct) {
      setError("No product selected");
      return;
    }

    if (!quantity || quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (quantity > selectedProduct.stock) {
      setError("Quantity exceeds available stock");
      return;
    }

    if (!sellingPrice  || sellingPrice <= 0  ) {
      setError("Please enter a valid selling price");
      return;
    }

    if (!selectedTax) {
      setError("Please select a tax option");
      return;
    }

    addToCart(
      selectedProduct,
      quantity,
      sellingPrice,
      selectedTax,
      discountType,
      discountAmount,
      description
    );

    // Clear form state and close modal
    setSelectedProduct(null);
    setQuantity(1);
    setSellingPrice("");
    setSelectedTax("");
    setDiscountType("percentage");
    setDiscountAmount(0);
    setDescription("");
    setError("");

    // Toast notification
    toast.success(`${selectedProduct.name} added to cart`);
  };

  const handleAddNewItem = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        // Update quantity if product already exists
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      // Add new item to the cart
      return [...prevCart, { product, quantity }];
    });
    toast.success(`${product.name} added to cart`);
  };
  const [editDraftId, setEditDraftId] = useState(null);

  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);

  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };

  const handleQuantityChangeNew = (e, item, index) => {
    const updatedQuantity = Math.min(
      Number(e.target.value),
      item.product.quantity_in_stock
    );

    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      updatedCart[index] = {
        ...updatedCart[index],
        quantity: updatedQuantity,
        // Preserve additional attributes
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      };
      return updatedCart;
    });
  };
  useEffect(() => {
    if (selectedProduct) {
      setSellingPrice(selectedProduct.sp);
    }
  }, [selectedProduct]);
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
  const handleCompleteSale = async (customer_id, paymentMethod) => {
    try {
      const referenceNumber = refNum; // Generate unique reference number
      const response = await processSale(
        referenceNumber,
        customer_id,
        paymentMethod
      ); // Await the response from processSale

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
        product_id: item.product.id, // Use product ID
        quantity: item.quantity,
        sellingPrice: item.sellingPrice, // Selling price of the product
        tax: item.tax, // Tax applied
        discountType: item.discountType, // Type of discount (e.g., fixed, percentage)
        discountAmount: item.discountAmount, // Amount of discount
        description: item.description, // Optional description for the item
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
        clearCart(); // Clear the cart after saving the draft
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
            <span className="absolute top-1/3 transform -translate-y-1/2 text-gray-400">
              <FiSearch className="h-6 w-6" />
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
              onClick={() => {
                if (cart.length === 0) return toast.info("Cart is Empty!!!");

                setShowInvoice(true);
                setShowClearCart(true);
              }} // Show invoice modal
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
              <div key={product.id} onClick={() => {handleProductClick(product)

              }}>
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            <div>No products found</div>
          )}
        </div>
      </div>
      {/* Product Details Modal */}
      {(selectedProduct) && (
        
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-[90%] sm:w-[60%] md:w-[50%] lg:w-[40%]">
            {/* Modal Header */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {selectedProduct.name}
            </h2>

            {/* Selling Price and Quantity */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Selling Price */}
              <div>
                <label
                  htmlFor="sellingPrice"
                  className="block font-medium text-gray-700"
                >
                  Selling Price (₵):
                </label>
                <input
                  id="sellingPrice"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Quantity */}
              <div>
                <label
                  htmlFor="quantity"
                  className="block font-medium text-gray-700"
                >
                  Quantity:
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const enteredQuantity = parseInt(e.target.value, 10);
                    const validQuantity = Math.min(
                      enteredQuantity,
                      selectedProduct.quantity_in_stock
                    );
                    setQuantity(validQuantity);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="1"
                  max={selectedProduct.quantity_in_stock}
                  step="1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Available stock: {selectedProduct.quantity_in_stock}
                </p>
              </div>
            </div>

            {/* Tax Selection */}
            <div className="mb-4">
              <label htmlFor="tax" className="block font-medium text-gray-700">
                Select Tax:
              </label>
              <select
                id="tax"
                value={selectedTax}
                onChange={(e) => setSelectedTax(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Select Tax --</option>
                {taxes.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.tax_name} ({tax.tax_rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Type and Amount */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Discount Type */}
              <div>
                <label
                  htmlFor="discountType"
                  className="block font-medium text-gray-700"
                >
                  Discount Type:
                </label>
                <select
                  id="discountType"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              {/* Discount Amount */}
              <div>
                <label
                  htmlFor="discountAmount"
                  className="block font-medium text-gray-700"
                >
                  Discount Amount (₵):
                </label>
                <input
                  id="discountAmount"
                  type="number"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(parseFloat(e.target.value))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="description"
                className="block font-medium text-gray-700"
              >
                Description:
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows="3"
                placeholder="Enter additional details..."
              />
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
              <button
                onClick={handleAddToCart}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <Invoice
        refNum={refNum}
        showInvoice={showInvoice}
        setShowInvoice={setShowInvoice}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleSaleDraft={handleCompleteSale}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
        showClearCart={showClearCart}
        setShowClearCart={setShowClearCart}
        companyName={companyName}
        email={email}
        phone={phone}
        companyAddress={companyAddress}
      />

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
