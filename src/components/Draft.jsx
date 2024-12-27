import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaEdit, FaTrashAlt,FaTrash, FaCheck } from 'react-icons/fa';
import { useCart } from "../CartContext";
import { toast, ToastContainer } from "react-toastify";
import printInvoice from "./PrintInvoice";

const Draft = ({companyAddress,companyName,email,phone}) => {
  const [drafts, setDrafts] = useState([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [refNum, setRefNum] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [editDraftId, setEditDraftId] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
    const [saleComplete, setSaleComplete] = useState(false);
  
  const { cart, addToCart, setCart, clearCart, processSale, makeSale } =
    useCart();
  useEffect(() => {
    fetchDrafts();
  }, []);

  // Fetch drafts from the backend
  const fetchDrafts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/drafts");
      setDrafts(response.data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };

  // Add or update a draft
  const handleSaveDraft = async () => {
    const draftPayload = {
      reference_number: referenceNumber,
      product_id: productId,
      quantity,
    };

    try {
      if (editDraftId) {
        // Update existing draft
        const response = await axios.put(
          `http://localhost:5000/drafts/${editDraftId}`,
          draftPayload
        );
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );
      } else {
        // Add a new draft
        const response = await axios.post(
          "http://localhost:5000/drafts",
          draftPayload
        );
        setDrafts([...drafts, response.data]);
      }

    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };
  const handleRemoveFromCart = (itemToRemove) => {
      setCart((prevCart) =>
        prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
      );
      toast.info(`${itemToRemove.product.name} removed from cart`);
    };
  const calculateTotal = () =>
    cart.reduce((acc, item) => acc + item.quantity * item.product.sp, 0);
  // Delete a draft
  const handleDeleteDraft = async (draftId) => {
    try {
      await axios.delete(`http://localhost:5000/drafts/${draftId}`);
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error deleting draft:", error);
    }
  };

  // Mark a draft as completed
  const handleCompleteSalePut = async (draftId) => {
    try {
      await axios.put(`http://localhost:5000/drafts/${draftId}`, {
        status: "completed",
      });
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error completing sale:", error);
    }
  };
  
// Updated handleCompleteSale function
  const handleCompleteSale = async () => {
    try {
      const referenceNumber = refNum; // Generate unique reference number
      await processSale(referenceNumber); // Pass cart and reference number to processSale
      setSaleComplete(!saleComplete); // Trigger product list refresh
      setShowInvoice(false); // Close the invoice modal
      handleCompleteSalePut();
      clearCart();
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("An error occurred while processing the sale.");
    }
  };
 

  const handleEditDraft = async (draftId) => {
    try {
      // Fetch the draft details using the draft ID
      const response = await axios.get(`http://localhost:5000/drafts/${draftId}`);
      const draft = response.data;
      console.log("This is the draft:", draft);
  
      // Populate the modal with the draft information
      setShowInvoice(true);
      setRefNum(draft.reference_number);
  
      // Fetch product details for each product_id in the draft and populate the cart
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          // Fetch product details based on product_id
          const productResponse = await axios.get(
            `http://localhost:5000/products/${item.product_id}`
          );
          const product = productResponse.data;
  
          // Return item with full product details
          return {
            product, // Full product details
            quantity: item.quantity,
          };
        })
      );
  
      setCart(draftItems);
  
    } catch (error) {
      console.error("Error fetching draft details:", error);
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
  
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">
          {editDraftId ? "Edit Draft" : "Add New Draft"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveDraft();
          }}
        >
          <div className="mb-4">
            <label className="block font-medium mb-1">Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Product ID</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editDraftId ? "Update Draft" : "Add Draft"}
            </button>
          </div>
        </form>
      </div>
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

      <h2 className="text-xl font-bold mb-4">Draft List</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left border border-gray-300">Reference</th>
            <th className="p-2 text-center border border-gray-300">Date</th>
            <th className="p-2 text-center border border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => (
            <tr key={draft.id} className="hover:bg-gray-50">
              <td className="p-2 border border-gray-300">
                {draft.reference_number}
              </td>
              <td className="p-2 text-center border border-gray-300">
                {new Date(draft.date).toLocaleDateString()}
              </td>
              <td className="p-2 text-center border border-gray-300">
                <button
                  onClick={() => handleEditDraft(draft.id)}
                  className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                  title="View Draft"
                >
                  <FaEye />
                </button>
                <button
                  onClick={() => handleEditDraft(draft.id)}
                  className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                  title="Edit Draft"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteDraft(draft.id)}
                  className="text-red-600 hover:bg-red-100 p-2 rounded"
                  title="Delete Draft"
                >
                  <FaTrashAlt />
                </button>
                <button
                  onClick={() => handleCompleteSale(draft.id)}
                  className="text-green-600 hover:bg-green-100 p-2 rounded"
                  title="Complete Sale"
                >
                  <FaCheck />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Draft;
