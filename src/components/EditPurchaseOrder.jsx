import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrashAlt } from "react-icons/fa";

const EditPurchaseOrder = ({ purchaseOrderId, onPurchaseOrderUpdated }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [supplierId, setSupplierId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPurchaseOrderDetails = async () => {
      try {
        // Fetch purchase order basic info
        const purchaseOrderResponse = await axios.get(
          `http://localhost:5000/purchase_orders/${purchaseOrderId}`
        );
        const purchaseOrder = purchaseOrderResponse.data;

        // Set the initial state
        setReferenceNumber(purchaseOrder.reference_number);
        setSupplierId(purchaseOrder.supplier_id);

        // Fetch purchase order items
        const itemsResponse = await axios.get(
          `http://localhost:5000/purchase_orders/${purchaseOrderId}/details`
        );
        setSelectedProducts(
          itemsResponse.data.map((item) => ({
            ...item,
            cp: item.unit_price, // Rename for consistency
          }))
        );

        // Fetch all products
        const productsResponse = await axios.get("http://localhost:5000/products");
        setProducts(productsResponse.data);
      } catch (error) {
        console.error("Error fetching purchase order details:", error);
        toast.error("Failed to fetch purchase order details. Please try again.");
      }
    };

    fetchPurchaseOrderDetails();
  }, [purchaseOrderId]);

  const addProduct = (product) => {
    if (selectedProducts.some((p) => p.product_id === product.id)) {
      toast.error("Product already added.");
      return;
    }

    if (!supplierId) {
      setSupplierId(product.suppliers_id);
    }

    if (supplierId && product.suppliers_id !== supplierId) {
      toast.error("You can only select products from the same supplier.");
      return;
    }

    setSelectedProducts([...selectedProducts, { ...product, quantity: 1, cp: product.price }]);
  };

  const removeProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((product) => product.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.product_id === productId ? { ...product, quantity: parseInt(quantity, 10) } : product
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the purchase order itself
      const totalAmount = selectedProducts.reduce((total, product) => {
        return total + product.cp * product.quantity;
      }, 0);

      await axios.put(`http://localhost:5000/purchase_orders/${purchaseOrderId}`, {
        reference_number: referenceNumber,
        supplier_id: supplierId,
        total_amount: totalAmount,
      });

      // Update each product in the purchase order
      for (const product of selectedProducts) {
        await axios.put(
          `http://localhost:5000/purchase_orders/${purchaseOrderId}/details/${product.id}`,
          {
            quantity: product.quantity,
            unit_price: product.cp,
          }
        );
      }

      toast.success("Purchase Order updated successfully!");
      if (onPurchaseOrderUpdated) onPurchaseOrderUpdated();
    } catch (error) {
      console.error("Error updating purchase order:", error);
      toast.error("Failed to update purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <ToastContainer />
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">Available Products</h3>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="grid grid-cols-3 gap-4 mt-4">
              {products
                .filter((product) =>
                  product.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((product) => (
                  <div key={product.id} onClick={() => addProduct(product)}>
                    <ProductCard product={product} />
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Selected Products</h3>
            {selectedProducts.map((product) => (
              <div key={product.product_id} className="flex items-center justify-between">
                <div>
                  <p>{product.name}</p>
                  <p>₵{product.cp}</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => updateQuantity(product.product_id, e.target.value)}
                    className="w-16 px-2 py-1 border rounded-md"
                  />
                  <button onClick={() => removeProduct(product.product_id)} className="ml-2">
                    <FaTrashAlt className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update Purchase Order"}
        </button>
      </form>
    </div>
  );
};

export default EditPurchaseOrder;
