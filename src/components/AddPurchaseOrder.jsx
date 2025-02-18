import React, { useState, useEffect } from "react";
import API from "../api";
import ProductCard from "./ProductCard"; // Import the ProductCard component
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrashAlt } from "react-icons/fa"; // Import delete icon

const AddPurchaseOrder = ({ onPurchaseOrderAdded }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState(null); // Track the selected supplier

  // Fetch products and supplier names
  useEffect(() => {
    const fetchProductsAndSuppliers = async () => {
      try {
        // Fetch products
        const productsResponse = await API.get("/products");
        const productsData = productsResponse.data;

        // Fetch suppliers
        const suppliersResponse = await API.get("/suppliers");
        const suppliersData = suppliersResponse.data;

        // Map supplier names to products
        const productsWithSuppliers = productsData.map((product) => ({
          ...product,
          supplierName:
            suppliersData.find((supplier) => supplier.id === product.suppliers_id)?.name ||
            "Unknown Supplier",
        }));

        setProducts(productsWithSuppliers);
      } catch (error) {
        console.error("Error fetching products or suppliers:", error);
        toast.error("Failed to fetch products or suppliers. Please try again.");
      }
    };

    fetchProductsAndSuppliers();
  }, []);

  // Handle adding a product to the selected list
  const addProduct = (product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      toast.error("Product already added.");
      return;
    }

    // Set supplier ID if it's the first product selected
    if (!supplierId) {
      setSupplierId(product.suppliers_id);
    }

    // Ensure only products from the same supplier are selected
    if (supplierId && product.suppliers_id !== supplierId) {
      toast.error("You can only select products from the same supplier.");
      return;
    }

    setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
  };

  // Handle removing a product from the selected list
  const removeProduct = (productId) => {
    const updatedProducts = selectedProducts.filter((product) => product.id !== productId);
    setSelectedProducts(updatedProducts);
  };

  // Update quantity of a selected product
  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    setSelectedProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId ? { ...product, quantity: parseInt(quantity, 10) } : product
      )
    );
  };

  // Filter products based on search term and supplier
  const filteredProducts = products.filter((product) => {
    // Only show products from the same supplier as the first selected product
    const matchesSupplier = supplierId ? product.suppliers_id === supplierId : true;
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) && matchesSupplier;
  });

  // Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();

  if (selectedProducts.length === 0) {
    toast.error("Please select at least one product.");
    return;
  }

  if (!referenceNumber) {
    setReferenceNumber(`PUR-${Date.now()+ Math.floor(Math.random() * 1000000)}` );
  }

  setIsSubmitting(true);

  try {
    // Calculate total_amount based on selected products
    const totalAmount = selectedProducts.reduce((total, product) => {
      return total + product.cp * product.quantity; // Assuming `sp` is the unit price of the product
    }, 0);

    const response = await API.post("/purchase_orders", {
      reference_number: referenceNumber || `PUR-${Date.now()}`,
      supplier_id: supplierId, // Include supplier ID in the submitted data
      total_amount: totalAmount, // Include total_amount in the submitted data
      items: selectedProducts.map((product) => ({
        product_id: product.id,
        quantity: product.quantity,
        unit_price: product.cp,
      })),
    });

    toast.success("Purchase Order added successfully!");
    setReferenceNumber("");
    setSelectedProducts([]);
    setSupplierId(null); // Reset supplier ID for the next order
    if (onPurchaseOrderAdded) onPurchaseOrderAdded(response.data);
  } catch (error) {
    console.error("Error adding purchase order:", error);
    toast.error("Failed to add purchase order. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      
      <h2 className="text-2xl font-bold  text-gray-800 mb-4">Add purchase Order</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-8 gap-8">
        {/* Left Column: Products List */}
        <div className="col-span-5 max-h-[calc(100vh-200px)] overflow-y-scroll pr-4">
          <div className="flex items-center mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 ">
            {filteredProducts.map((product) => (
              <div key={product.id} onClick={() => addProduct(product)}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Products */}
        <div className="col-span-3 max-h-[calc(100vh-200px)] overflow-y-scroll pr-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Selected Products</h2>
            <input
              type="text"
              placeholder="Reference Number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {selectedProducts.length === 0 ? (
            <p className="text-gray-600">No products selected.</p>
          ) : (
            <div>
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b py-2"
                >
                  <div>
                    <h3 className="text-sm font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">₵{product.cp}</p>
                    <p className="text-sm text-gray-600">
                      {product.supplierName}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => updateQuantity(product.id, e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <button
        type="submit"
        onClick={handleSubmit}
        className={`mt-6 w-full py-2 px-4 text-sm font-medium rounded-md text-white ${
          isSubmitting
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding Purchase Order..." : "Submit Purchase Order"}
      </button>
    </div>
  );
};

export default AddPurchaseOrder;
