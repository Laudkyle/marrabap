import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEye,
  FaEdit,
  FaTrashAlt,
  FaTrash,
  FaMoneyBillWave,
} from "react-icons/fa";
import { useCart } from "../CartContext";
import { toast, ToastContainer } from "react-toastify";
import printInvoice from "./PrintInvoice";
import Invoice from "./Invoice";

const Draft = () => {
  const [drafts, setDrafts] = useState([]);
  const [refNum, setRefNum] = useState("");
  const [editDraftId, setEditDraftId] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showDraft, setShowDraft] = useState(true);
  const [saleComplete, setSaleComplete] = useState(false);

  const { cart, setCart, clearCart, processSale } = useCart();
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

  const handleSaveDraft = async () => {
    // Build the draft details payload based on the cart items
    const draftDetails = cart.map((item) => ({
      product_id: item.product.id, // Using item.product.id for the product ID
      quantity: item.quantity,
    }));

    const draftPayload = {
      reference_number: refNum,
      details: draftDetails,
      date: new Date().toISOString(),
      status: "pending",
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

        // Success notification for updating the draft
        toast.success("Draft updated successfully!");
      } else {
        // Add a new draft
        const response = await axios.post(
          "http://localhost:5000/drafts",
          draftPayload
        );

        if (response.status === 201) {
          // Successfully saved draft
          setShowInvoice(false); // Close the invoice modal
          clearCart();
          toast.success("Draft saved successfully!"); // Success notification
          setDrafts([...drafts, response.data]);
        }
      }
    } catch (error) {
      // Error notification
      toast.error("Error saving draft. Please try again.");
      console.error("Error saving draft:", error);
    }
  };

  const handleRemoveFromCart = (itemToRemove) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
    );
    toast.info(`${itemToRemove.product.name} removed from cart`);
  };

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
  const handleCompleteSale = async (draftId) => {
    try {
      const referenceNumber = refNum; // Generate unique reference number
      await processSale(referenceNumber); // Pass cart and reference number to processSale
      setSaleComplete(!saleComplete); // Trigger product list refresh
      setShowInvoice(false); // Close the invoice modal
      handleCompleteSalePut(draftId);
      clearCart();
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("An error occurred while processing the sale.");
    }
  };

  const handleEditDraft = async (draftId) => {
    setShowDraft(true);
    setEditDraftId(draftId);
    try {
      // Fetch the draft details using the draft ID
      const response = await axios.get(
        `http://localhost:5000/drafts/${draftId}`
      );
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

  const handleViewDraft = async (draftId) => {
    setEditDraftId(draftId);
    try {
      // Fetch the draft details using the draft ID
      const response = await axios.get(
        `http://localhost:5000/drafts/${draftId}`
      );
      const draft = response.data;
      console.log("This is the draft:", draft);

      // Populate the modal with the draft information
      setShowInvoice(true);
      setRefNum(draft.reference_number);
      setShowDraft(false);
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
      <ToastContainer />
      {/* Invoice Modal */}
      <Invoice
        showInvoice={showInvoice}
        setShowInvoice={setShowInvoice}
        showDraft={showDraft}
        handleCompleteSale={handleCompleteSale}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
      />
      
      <div className="bg-white mx-6 shadow-sm rounded-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Draft List</h2>
        <table className="table-auto w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                Reference
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                Status
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                Date
              </th>
              <th className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id} className="hover:bg-gray-50">
                <td className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                  {draft.reference_number}
                </td>
                <td className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                  {draft.status}
                </td>
                <td className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                  {new Date(draft.date).toLocaleDateString()}
                </td>
                <td className="text-left text-sm font-medium text-gray-600 px-4 py-2">
                  <button
                    onClick={() => handleViewDraft(draft.id)}
                    className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                    title="View Draft"
                  >
                    <FaEye />
                  </button>

                  {draft.status !== "completed" && (
                    <>
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
                        <FaMoneyBillWave />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Draft;
