import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStock = ({ onProductsAdded }) => {
  const [items, setItems] = useState([{ name: "", cp: "", sp: "", stock: "" }]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

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

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...items];
    updatedItems[index][name] = value;
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { name: "", cp: "", sp: "", stock: "" }]);
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

    const invalidItem = items.find(
      (item) =>
        !item.name || isNaN(item.cp) || isNaN(item.sp) || isNaN(item.stock)
    );

    if (invalidItem) {
      toast.error(
        "All fields are required, and cost price, selling price, and stock must be numbers!"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post("http://localhost:5000/products/bulk", {
        suppliers_id: selectedSupplier, // Include the selected supplier
        payment_method: paymentMethod,
        products: items.map((item) => ({
          name: item.name,
          cp: parseFloat(item.cp),
          sp: parseFloat(item.sp),
          stock: parseInt(item.stock, 10),
        })),
      });

      toast.success("Products added successfully!");

      setItems([{ name: "", cp: "", sp: "", stock: "" }]);
      setIsSubmitting(false);

      if (onProductsAdded) onProductsAdded(response.data);
    } catch (error) {
      console.error("Error adding stock:", error);
      toast.error("Failed to add stock. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      <ToastContainer />

      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Stock New Products
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

          {/* Payment Method Selection */}
          <div className="w-[30vw]">
            <h2 className="text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </h2>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>
        </div>

        {items.map((item, index) => (
          <div key={index} className="mb-6 border-b pb-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div>
                <label
                  htmlFor={`name-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Product Name
                </label>
                <input
                  type="text"
                  id={`name-${index}`}
                  name="name"
                  value={item.name}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`cp-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Cost Price (CP)
                </label>
                <input
                  type="text"
                  id={`cp-${index}`}
                  name="cp"
                  value={item.cp}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`sp-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Selling Price (SP)
                </label>
                <input
                  type="text"
                  id={`sp-${index}`}
                  name="sp"
                  value={item.sp}
                  onChange={(e) => handleChange(index, e)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`stock-${index}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Quantity
                </label>
                <input
                  type="text"
                  id={`stock-${index}`}
                  name="stock"
                  value={item.stock}
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
          {isSubmitting ? "Adding Products..." : "Add Products"}
        </button>
      </form>
    </div>
  );
};

export default AddStock;
