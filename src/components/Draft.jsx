import React, { useState, useEffect } from "react";
import API from "../api";
import { FaEye, FaEdit, FaTrashAlt, FaMoneyBillWave } from "react-icons/fa";
import { useCart } from "../CartContext";
import { toast} from "react-toastify";
import Invoice from "./Invoice";
import ProcessSaleModal from "./ProcessSaleModal";
import DataTable from "react-data-table-component";
const Draft = () => {
  const [drafts, setDrafts] = useState([]);
  const [refNum, setRefNum] = useState("");
  const [editDraftId, setEditDraftId] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showProcessSaleModal, setShowProcessSaleModal] = useState(null);
  const [showDraft, setShowDraft] = useState(true);
  const [showCompleteSale, setShowCompleteSale] = useState(true);
  const [saleComplete, setSaleComplete] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [documents, setDocuments] = useState([]); // State to handle documents
  const [newDocument, setNewDocument] = useState(""); // State for new document input

  const { cart, setCart, clearCart, processSale } = useCart();

  // Fetch drafts from the backend
  const fetchDrafts = async () => {
    try {
      const response = await API.get("http://localhost:5000/drafts");
      setDrafts(response.data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };
  const handleSaveDraft = async () => {
    try {
      // Map the cart items to include all necessary attributes
      const draftDetails = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      }));

      // Prepare draftPayload with reference number and status
      const draftPayload = {
        reference_number: refNum,
        details: draftDetails, // Includes full item attributes
        date: new Date().toISOString(),
        status: "pending",
      };

      // Validate stock availability for each item in the cart
      const stockCheckPromises = draftDetails.map(async (item) => {
        const productResponse = await API.get(
          `http://localhost:5000/products/${item.product_id}`
        );
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Separate new documents from existing ones
      const newDocuments = documents.filter((doc) => !doc.id); // New documents don't have an `id`
      const uploadedDocuments = [];

      // Upload new documents if they exist
      if (newDocuments.length > 0) {
        const formData = new FormData();
        newDocuments.forEach((document) => {
          formData.append("files", document);
        });
        formData.append("transaction_type", "sale");
        formData.append("reference_number", refNum);

        const response = await API.post(
          "http://localhost:5000/documents",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120000,
          }
        );

        if (!response || !response.data || response.data.length === 0) {
          throw new Error(
            "Document upload failed or returned an empty response."
          );
        }

        response.data.forEach((doc) => {
          uploadedDocuments.push({
            document_name: doc.document_name,
            file_path: doc.file_path,
            transaction_type: "sale",
            reference_number: refNum,
          });
        });
      }

      // Include uploaded documents and existing documents in the draftPayload
      draftPayload.documents = [
        ...documents.filter((doc) => doc.id), // Existing documents
        ...uploadedDocuments, // Newly uploaded documents
      ];

      // Save or update the draft
      if (editDraftId) {
        const response = await API.put(
          `http://localhost:5000/drafts/${editDraftId}`,
          draftPayload
        );
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );
        toast.success("Draft updated successfully!");
      } else {
        const response = await API.post(
          "http://localhost:5000/drafts",
          draftPayload
        );
        setDrafts([...drafts, response.data]);
        toast.success("Draft saved successfully!");
      }

      // Clear cart and documents after saving the draft
      clearCart();
      setDocuments([]);
      setShowInvoice(false);
    } catch (error) {
      toast.error(error.message || "An error occurred while saving the draft.");
      console.error("Error saving draft:", error);
    }
  };

  const handleSaleDraft = async () => {
    try {
      // Prepare draftDetails with new attributes
      const draftDetails = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        tax: item.tax,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      }));

      // Prepare draftPayload
      const draftPayload = {
        reference_number: refNum,
        details: draftDetails,
        date: new Date().toISOString(),
        status: "pending",
      };

      // Validate stock availability for each item
      const stockCheckPromises = draftDetails.map(async (item) => {
        const productResponse = await API.get(
          `http://localhost:5000/products/${item.product_id}`
        );
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Save or update the draft
      if (editDraftId) {
        // Update an existing draft
        const response = await API.put(
          `http://localhost:5000/drafts/${editDraftId}`,
          draftPayload
        );
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );
        toast.success("Draft updated successfully!");
      } else {
        // Save a new draft
        const response = await API.post(
          "http://localhost:5000/drafts",
          draftPayload
        );
        setDrafts([...drafts, response.data]);
        toast.success("Draft saved successfully!");
      }

      // Close modals and open process sale modal
      setShowInvoice(false);
      setShowProcessSaleModal(true);
    } catch (error) {
      console.error("Error in handleSaleDraft:", error.message);
      toast.error(error.message || "An error occurred while saving the draft.");
    }
  };

  const handleRemoveFromCart = async (itemToRemove) => {
    // Update the cart locally
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== itemToRemove.product.id)
    );

    toast.info(`${itemToRemove.product.name} removed from cart`);

    try {
      // Prepare updated cart details
      const updatedCartDetails = cart
        .filter((item) => item.product.id !== itemToRemove.product.id) // Exclude the removed item
        .map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        }));

      // Prepare the payload for updating the draft
      const updatedDraftPayload = {
        reference_number: refNum,
        details: updatedCartDetails,
      };

      // Sync the updated cart with the backend draft
      if (editDraftId) {
        const response = await API.put(
          `http://localhost:5000/drafts/${editDraftId}`,
          updatedDraftPayload
        );

        // Update drafts state with the modified draft
        setDrafts(
          drafts.map((draft) =>
            draft.id === editDraftId ? response.data : draft
          )
        );

        console.log("Draft cart updated successfully!");
      } else {
        console.error("No draft selected to update.");
      }
    } catch (error) {
      toast.error("Error updating draft cart. Please try again.");
      console.error("Error syncing cart with draft:", error);
    }
  };

  const filteredDrafts = drafts.filter((draft) => {
    const referenceNumber = draft.reference_number || ""; // Handle undefined reference_number
    const status = draft.status || ""; // Handle undefined status
    const date = draft.date ? new Date(draft.date).toLocaleDateString() : ""; // Handle undefined date

    return (
      referenceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      status.toLowerCase().includes(filterText.toLowerCase()) ||
      date.includes(filterText)
    );
  });

  // Delete a draft
  const handleDeleteDraft = async (draftId) => {
    try {
      await API.delete(`http://localhost:5000/drafts/${draftId}`);
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error deleting draft:", error);
    }
  };

  // Mark a draft as completed
  const handleCompleteSalePut = async (draftId) => {
    try {
      await API.put(`http://localhost:5000/drafts/${draftId}`, {
        status: "completed",
      });
      setDrafts(drafts.filter((draft) => draft.id !== draftId));
    } catch (error) {
      console.error("Error completing sale:", error);
    }
  };

  // Updated handleCompleteSale function
  const handleCompleteSaleDraft = async (customer, paymentMethod) => {
    try {
      // Fetch draft details
      const response = await API.get(
        `http://localhost:5000/drafts/${editDraftId}`
      );
      const draft = response.data;
      const referenceNumber = draft.reference_number; // Extract reference number
      const customer_id = customer;
      const payment_method = paymentMethod;
      // Parse draft items
      const draftItems = JSON.parse(draft.details);
      // Validate stock availability for each item
      const stockCheckPromises = draftItems.map(async (item) => {
        const productResponse = await API.get(
          `http://localhost:5000/products/${item.product_id}`
        );
        const product = productResponse.data;

        if (item.quantity > product.stock) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.quantity}, Available: ${product.stock}`
          );
        }
      });

      // Wait for all stock checks to complete
      await Promise.all(stockCheckPromises);

      // Process the sale if all items pass the stock check
      const saleResponse = await processSale(
        referenceNumber,
        customer_id,
        payment_method
      );
      if (saleResponse.status !== 200 && saleResponse.status !== 201) {
        throw new Error(
          `Unexpected response status from sale process: ${saleResponse}`
        );
      }

      // Update draft to mark as completed
      await handleCompleteSalePut(editDraftId);

      // If everything went well
      setSaleComplete(!saleComplete); // Trigger product list refresh
      setShowProcessSaleModal(false); // Close the invoice modal
      clearCart();
      toast.success("Sale completed successfully!");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error(
        error.message || "An error occurred while processing the sale."
      );
    }
  };

  const handleEditDraft = async (draftId) => {
    setShowDraft(true);
    setShowCompleteSale(true);
    setEditDraftId(draftId);
  
    try {
      // Fetch draft details
      const response = await API.get(`http://localhost:5000/drafts/${draftId}`);
      const draft = response.data;
  
      // Populate draft details
      setShowInvoice(true);
      setRefNum(draft.reference_number);
  
      // Fetch product details and populate the cart with multiple taxes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(
            `http://localhost:5000/products/${item.product_id}`
          );
          const product = productResponse.data;
  
          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], // Ensure tax is an array
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );
      setCart(draftItems);
  
      // Fetch documents
      const documentsResponse = await API.get(
        `http://localhost:5000/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }
  
    console.log("this is cart after:", cart);
  };
  const handleViewDraft = async (draftId) => {
    setEditDraftId(draftId);
  
    try {
      // Fetch draft details
      const response = await API.get(`http://localhost:5000/drafts/${draftId}`);
      const draft = response.data;
  
      // Populate draft details
      setShowInvoice(true);
      setRefNum(draft.reference_number);
      setShowDraft(false);
  
      // Fetch product details and populate the cart with multiple taxes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(
            `http://localhost:5000/products/${item.product_id}`
          );
          const product = productResponse.data;
  
          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], // Ensure tax is an array
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );
  
      setCart(draftItems);
  
      // Fetch documents
      const documentsResponse = await API.get(
        `http://localhost:5000/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
      console.log("documents:", documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }
  };
  
  const handleDraft = async (draftId) => {
    setEditDraftId(draftId);

    try {
      // Fetch draft details
      const response = await API.get(
        `http://localhost:5000/drafts/${draftId}`
      );
      const draft = response.data;

      // Populate draft details
      setShowProcessSaleModal(true);
      setRefNum(draft.reference_number);
      setShowDraft(false);

      // Fetch product details and populate the cart with additional attributes
      const draftItems = await Promise.all(
        JSON.parse(draft.details).map(async (item) => {
          const productResponse = await API.get(
            `http://localhost:5000/products/${item.product_id}`
          );
          const product = productResponse.data;
          return {
            product,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            taxes: Array.isArray(item.taxes) ? item.taxes : [], // Ensure tax is an array
            discountType: item.discountType,
            discountAmount: item.discountAmount,
            description: item.description,
          };
        })
      );
      setCart(draftItems);

      // Fetch documents
      const documentsResponse = await API.get(
        `http://localhost:5000/documents/by-reference/${draft.reference_number}`
      );
      setDocuments(documentsResponse.data);
      console.log("documents:", documentsResponse.data);
    } catch (error) {
      console.error("Error fetching draft details:", error);
    }
  };
  const handleAddNewItem = (
    product,
    quantity,
    sellingPrice,
    selectedTaxes,
    discountType,
    discountAmount,
    description
  ) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );
  
      if (existingItem) {
        // Update quantity and other attributes if product already exists
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                sellingPrice: sellingPrice || item.sellingPrice,
                taxes: selectedTaxes || item.taxes,
                discountType: discountType || item.discountType,
                discountAmount: discountAmount || item.discountAmount,
                description: description || item.description,
              }
            : item
        );
      }
  
      // Add new item to the cart with all attributes
      return [
        ...prevCart,
        {
          product,
          quantity,
          sellingPrice,
          taxes: selectedTaxes,
          discountType,
          discountAmount,
          description,
        },
      ];
    });
  
    toast.success(`${product.name} added to cart`);
  };
  
  const handleQuantityChangeNew = (e, item, index) => {
    const updatedQuantity = Math.min(Number(e.target.value), item.product.quantity_in_stock);
  
    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      updatedCart[index] = {
        ...updatedCart[index],
        quantity: updatedQuantity,
        // Preserve additional attributes
        sellingPrice: item.sellingPrice,
        taxes: item.taxes,
        discountType: item.discountType,
        discountAmount: item.discountAmount,
        description: item.description,
      };
      return updatedCart;
    });
  };
  
  const columns = [
    {
      name: "Reference",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.date).toLocaleDateString(),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewDraft(row.id)}
            className="text-blue-600 hover:bg-blue-100 p-2 rounded"
            title="View Draft"
          >
            <FaEye />
          </button>
          {row.status !== "completed" && (
            <>
              <button
                onClick={() => handleEditDraft(row.id)}
                className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                title="Edit Draft"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDeleteDraft(row.id)}
                className="text-red-600 hover:bg-red-100 p-2 rounded"
                title="Delete Draft"
              >
                <FaTrashAlt />
              </button>
              <button
                onClick={() => handleDraft(row.id)}
                className="text-green-600 hover:bg-green-100 p-2 rounded"
                title="Process Draft"
              >
                <FaMoneyBillWave />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];
  useEffect(() => {
    fetchDrafts();
  }, [handleSaveDraft]);

  return (
    <div className="p-6">
      
      {/* Invoice Modal */}
      <Invoice
        refNum={refNum}
        showInvoice={showInvoice}
        setShowInvoice={setShowInvoice}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleCompleteSale={handleCompleteSaleDraft}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
        setShowProcessSaleModal={setShowProcessSaleModal}
        handleSaleDraft={handleSaleDraft}
        
      />
      <ProcessSaleModal
        refNum={refNum}
        showProcessSaleModal={showProcessSaleModal}
        setShowProcessSaleModal={setShowProcessSaleModal}
        showDraft={showDraft}
        showCompleteSale={showCompleteSale}
        editDraftId={editDraftId}
        handleCompleteSale={handleCompleteSaleDraft}
        handleQuantityChangeNew={handleQuantityChangeNew}
        handleRemoveFromCart={handleRemoveFromCart}
        handleSaveDraft={handleSaveDraft}
        handleAddNewItem={handleAddNewItem}
        documents={documents}
        setDocuments={setDocuments}
        newDocument={newDocument}
        setNewDocument={setDocuments}
      />

      <div className="bg-white mx-6 shadow-sm rounded-md h-[75vh] overflow-scroll p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Draft List</h2>
        <DataTable
          className="z-0"
          columns={columns}
          data={filteredDrafts}
          pagination
          highlightOnHover
          responsive
          striped
          subHeader
          subHeaderComponent={
            <input
              type="text"
              placeholder="Search drafts"
              className="p-2 border border-gray-300 rounded-md"
              onChange={(e) => setFilterText(e.target.value)}
            />
          }
        />
      </div>
    </div>
  );
};

export default Draft;
