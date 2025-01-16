import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddPurchaseOrder = ({ onPurchaseOrderAdded }) => {
  const [items, setItems] = useState([{ product_id: "", quantity: "", unit_price: "" }]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(1);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [status, setStatus] = useState("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch the suppliers from the API
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Failed to fetch suppliers. Please try again.");
      }
    };

    fetchSuppliers();
  }, []);

  // Utility function to generate a unique reference number
  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `PUR ${uniqueNumber}`;
  };

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...items];
    updatedItems[index][name] = value;
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: "", unit_price: "" }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    } else {
      toast.error("You must have at least one item.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) {
      toast.error("Please select a supplier!");
      return;
    }

    if (!referenceNumber) {
      // Auto-generate reference number if it's not provided
      setReferenceNumber(generateReferenceNumber());
    }

    if (!referenceNumber) {
      toast.error("Please provide a reference number!");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.product_id ||
        isNaN(item.quantity) ||
        isNaN(item.unit_price)
    );

    if (invalidItem) {
      toast.error("All fields are required, and quantity and unit price must be numbers!");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("http://localhost:5000/purchase_orders", {
        reference_number: referenceNumber,
        supplier_id: selectedSupplier, // Include the selected supplier
        status,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: parseInt(item.quantity, 10),
          unit_price: parseFloat(item.unit_price),
        })),
      });

      toast.success("Purchase Order added successfully!");

      setReferenceNumber("");
      setItems([{ product_id: "", quantity: "", unit_price: "" }]);
      setIsSubmitting(false);

      if (onPurchaseOrderAdded) onPurchaseOrderAdded(response.data);
    } catch (error) {
      console.error("Error adding purchase order:", error);
      toast.error("Failed to add purchase order. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      <ToastContainer />

      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Add Purchase Order
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Supplier Selection */}
          <div className="w-[30vw]">
            <label
              htmlFor="supplier"
              className="block text-sm font-medium text-gray-700"
            >
              Supplier
            </label>
            <select
              id="supplier"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.type === "business"
                    ? supplier.business_name
                    : supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div className="w-[30vw]">
            <label
              htmlFor="reference_number"
              className="block text-sm font-medium text-gray-700"
            >
              Reference Number
            </label>
            <input
              type="text"
              id="reference_number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Status Selection */}
          <div className="w-[30vw]">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {items.map((item, index) => (
          <div key={index} className="mb-6 border-b pb-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div>
                <label
                  htmlFor={`product_id-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Product ID
                </label>
                <input
                  type="text"
                  id={`product_id-${index}`}
                  name="product_id"
                  value={item.product_id}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`quantity-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Quantity
                </label>
                <input
                  type="text"
                  id={`quantity-${index}`}
                  name="quantity"
                  value={item.quantity}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`unit_price-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Unit Price
                </label>
                <input
                  type="text"
                  id={`unit_price-${index}`}
                  name="unit_price"
                  value={item.unit_price}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full py-2 px-4 mb-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Add Another Item
        </button>

        <button
          type="submit"
          className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-sm ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding Purchase Order..." : "Add Purchase Order"}
        </button>
      </form>
    </div>
  );
};

export default AddPurchaseOrder;
