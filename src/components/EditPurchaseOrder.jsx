import React, { useState, useEffect } from "react";
import API from "../api";
import ProductCard from "./ProductCard";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrashAlt } from "react-icons/fa";

const EditPurchaseOrder = ({
  purchaseOrderId,
  onPurchaseOrderUpdated,
  setEditModalOpen,
  companyAddress,
  companyName,
  email,
  phone,
}) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [supplierId, setSupplierId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPurchaseOrderDetails = async () => {
      try {
        const purchaseOrderResponse = await API.get(
          `/purchase_orders/${purchaseOrderId}`
        );
        const purchaseOrder = purchaseOrderResponse.data;

        setReferenceNumber(purchaseOrder.reference_number);
        setSupplierId(purchaseOrder.supplier_id);

        const itemsResponse = await API.get(
          `/purchase_orders/${purchaseOrderId}/details`
        );
        setSelectedProducts(
          itemsResponse.data.map((item) => ({
            ...item,
            cp: item.unit_price,
          }))
        );

        const productsResponse = await API.get(
          "/products"
        );
        setProducts(productsResponse.data);
      } catch (error) {
        console.error("Error fetching purchase order details:", error);
        toast.error(
          "Failed to fetch purchase order details. Please try again."
        );
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

    setSelectedProducts([
      ...selectedProducts,
      { ...product, quantity: 1, cp: product.cp },
    ]);
  };

  const removeProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((product) => product.product_id !== productId)
    );
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.product_id === productId
          ? { ...product, quantity: parseInt(quantity, 10) }
          : product
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
      const totalAmount = selectedProducts.reduce((total, product) => {
        return total + product.cp * product.quantity;
      }, 0);
  
      // Fetch original purchase order details
      const originalResponse = await API.get(
        `/purchase_orders/${purchaseOrderId}/details`
      );
      const originalProducts = originalResponse.data;
  
      // Determine removed items
      const removedItems = originalProducts.filter(
        (originalItem) =>
          !selectedProducts.some(
            (selected) => selected.product_id === originalItem.product_id
          )
      );
  
      // Perform delete operations for removed items
      for (const item of removedItems) {
        await API.delete(
          `/purchase_orders_with_details/${purchaseOrderId}/details/${item.product_id}`
        );
      }
  
      // Update the purchase order
      await API.put(`/purchase_orders/${purchaseOrderId}`, {
        reference_number: referenceNumber,
        supplier_id: supplierId,
        total_amount: totalAmount,
      });
  
      // Separate existing and new products
      const existingProductIds = originalProducts.map((p) => p.product_id);
      const newProducts = selectedProducts.filter(
        (p) => !existingProductIds.includes(p.product_id)
      );
      const updatedProducts = selectedProducts.filter((p) =>
        existingProductIds.includes(p.product_id)
      );
  
      // Update existing products
      for (const product of updatedProducts) {
        await API.put(
          `/purchase_orders_with_details/${purchaseOrderId}/details/${product.product_id}`,
          {
            quantity: product.quantity,
            unit_price: product.cp,
          }
        );
      }
  
      // Add new products
      for (const product of newProducts) {
        await API.post(
          `/purchase_orders_with_details/${purchaseOrderId}/details`,
          {
            product_id: product.id,
            quantity: product.quantity,
            unit_price: product.cp,
          }
        );
      }
  
      // Update supplier's total purchase due
      const updateSupplierDue = async () => {
        try {
          // Fetch all purchase orders for this supplier
          const response = await API.get(
            `/suppliers/purchase_orders/${supplierId}`
          );
  
          const purchaseOrders = response.data;
          console.log(purchaseOrders)
  
          // Sum up the total amounts of all purchase orders for this supplier
          const totalDue = purchaseOrders.reduce(
            (sum, order) => sum + order.total_amount,
            0
          );
  
          // Update the supplier's total due in the database
          await API.put(`/suppliers/${supplierId}`, {
            total_purchase_due: totalDue,
          });
  
          console.log("Supplier's total purchase due updated successfully.");
        } catch (error) {
          console.error("Error updating supplier's total due:", error);
          toast.error("Failed to update the supplier's total due.");
        }
      };
  
      // Call the function after updating the purchase order
      await updateSupplierDue();
  
      toast.success("Purchase order updated successfully!");
      onPurchaseOrderUpdated();
    } catch (error) {
      console.error("Error updating purchase order:", error);
      toast.error("Failed to update the purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  
  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          {/* Header Section */}
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
            <h2 className="text-lg font-semibold mt-4">Edit Purchase Order</h2>
            <p className="text-sm text-gray-600">
              Reference Number:{" "}
              <span className="font-medium">{referenceNumber}</span>
            </p>
            <p className="text-sm text-gray-600">
              Date:{" "}
              <span className="font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </p>
          </div>

          {/* Available Products Section */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/2">
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
                    product.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((product) => (
                    <div key={product.id} onClick={() => addProduct(product)}>
                      <ProductCard key={product.id} product={product} />
                    </div>
                  ))}
              </div>
            </div>

            {/* Selected Products Section */}
            <div className="w-full lg:w-1/2">
              <h3 className="text-lg font-semibold mb-2">Selected Products</h3>
              <div className="max-h-[30vh] overflow-auto">
                <table className="w-full table-auto border-collapse border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-2 text-left font-medium text-gray-700">
                        Item
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700">
                        Qty
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700">
                        Price (₵)
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700">
                        Total (₵)
                      </th>
                      <th className="p-2 text-center font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((product) => (
                      <tr key={product.product_id} className="border-b">
                        <td className="p-2 text-gray-600">{product.name}</td>
                        <td className="p-2 text-center text-gray-600">
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) =>
                              updateQuantity(product.product_id, e.target.value)
                            }
                            className="w-16 px-2 py-1 border rounded-md"
                          />
                        </td>
                        <td className="p-2 text-center text-gray-600">
                          {parseFloat(product.cp).toFixed(2)}
                        </td>
                        <td className="p-2 text-center text-gray-600">
                          {parseFloat(product.cp * product.quantity).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeProduct(product.product_id)}
                            className="text-red-500"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Purchase Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditPurchaseOrder;
