import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FiSearch } from "react-icons/fi"; // Import the search icon
import { FaShoppingCart } from "react-icons/fa"; // Import the cart icon

function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);

  // Fetch products from the mock server
  useEffect(() => {
    fetch("http://localhost:5000/products")
      .then((response) => response.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      });
  }, []);

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle product click
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1); // Reset quantity
    setError(""); // Reset error
  };

  // Handle purchase confirmation and add to cart
  const handleAddToCart = () => {
    if (quantity > selectedProduct.stock) {
      setError("Quantity exceeds available stock");
    } else {
      setCart((prevCart) => [
        ...prevCart,
        { product: selectedProduct, quantity },
      ]);
      setSelectedProduct(null); // Close the popup after adding to cart
    }
  };

  // Display a loading state while the data is being fetched
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Fixed Header with Cart Icon */}
      <div className="sticky top-0 z-10 p-4 bg-gray-800 text-white">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Shop Products
        </h2>
        <div className="flex justify-center items-center">
          {/* Search Bar */}
          <div className="relative w-full sm:w-[80%] md:w-[60%] lg:w-[50%] ">
            {/* Search Icon */}
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FiSearch className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 pr-4 outline-none text-black rounded-3xl "
            />
          </div>

          {/* Cart Icon with Item Count */}
          <div className="relative w-10 h-10">
            <FaShoppingCart className="text-3xl cursor-pointer" />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-center text-white text-xs w-6 h-6 rounded-full">
                <h5 className="mt-1">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </h5>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Products Section */}
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

      {/* Popup for purchase */}
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
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty value or validate the number
                  if (value === "" || !isNaN(value)) {
                    setQuantity(value);
                  }
                }}
                className="w-16 p-2 border border-gray-300 rounded-md text-center"
              />
            </div>
            {/* Error message */}
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="flex justify-between">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
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
    </div>
  );
}

export default Shop;
