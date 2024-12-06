import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../CartContext";

function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false); // For invoice modal
  const [saleComplete, setSaleComplete] = useState(false);
  const { cart, addToCart, clearCart } = useCart();

  // Fetch products from the backend
  useEffect(() => {
    fetch("http://localhost:6000/products")
      .then((response) => response.json())
      .then((data) => {
        console.log(data); 
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      });
  }, [saleComplete]); // Refetch products after a sale is completed
  

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    }
  };

  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);

  // Handle sale completion
  const handleCompleteSale = async () => {
    try {
      const saleData = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const response = await fetch("http://localhost:5000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: saleData }),
      });

      if (response.ok) {
        setSaleComplete(!saleComplete); // Trigger product list refresh
        clearCart(); // Clear the cart after successful sale
        setShowInvoice(false); // Close the invoice modal
        alert("Sale completed successfully!");
      } else {
        alert("Failed to complete the sale. Please try again.");
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      alert("An error occurred while processing the sale.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search and Cart UI */}
      <div className="sticky top-0 z-10 p-4 bg-gray-800 text-white">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Shop Products
        </h2>
        <div className="flex justify-center items-center">
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
              className="text-3xl cursor-pointer"
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
              <button
                onClick={handleAddToCart}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-[90%] sm:w-[60%] md:w-[40%] lg:w-[30%] shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Invoice</h2>
            <div>
              <ul className="space-y-2">
                {cart.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.product.name}</span>
                    <span>
                      {item.quantity} x ${item.product.sp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex justify-between">
              <span className="font-semibold">Total:</span>
              <span className="text-xl">${calculateTotal()}</span>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowInvoice(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
