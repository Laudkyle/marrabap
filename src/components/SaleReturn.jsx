import React, { useState, useEffect } from "react";
import API from "../api";
import DataTable from "react-data-table-component";
import { toast, ToastContainer } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

const SaleReturn = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(0);
  const [restockOption, setRestockOption] = useState("restock");
  const [reason, setReason] = useState("");
  const [returnType, setReturnType] = useState("partial");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await API.get("/sales");

      const filtered = response.data.filter(
        (sale) =>
          sale.return_status =="partial_return" ||
          sale.return_status == "not_returned"
      );
      setSales(filtered);
      setFilteredSales(filtered);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setFilterText(value);

    const filtered = sales.filter(
      (sale) =>
        sale.product_name.toLowerCase().includes(value) ||
        sale.reference_number?.toLowerCase().includes(value)
    );
    setFilteredSales(filtered);
  };

  const handleReturn = async () => {
    if (!selectedSale) return;
  
    if (returnQuantity <= 0 || returnQuantity > selectedSale.quantity) {
      toast.error("Invalid return quantity!");
      return;
    }
  
    // Extract and format taxes correctly
    let taxesArray = [];
    if (typeof selectedSale.applied_taxes === "string") {
      taxesArray = selectedSale.applied_taxes.split("|").map((tax) => tax.trim());
    }
  
    const returnData = {
      sale_id: selectedSale.id,
      reference_number: selectedSale.reference_number,
      product_id: selectedSale.product_id, // Ensure this is defined
      customer_id: selectedSale.customer_id,
      return_quantity: returnQuantity,
      payment_method: selectedSale.payment_method,
      selling_price: selectedSale.selling_price,
      taxes: taxesArray,
      discount_type: selectedSale.discount_type,
      discount_amount: selectedSale.discount_amount,
      action: restockOption,
      return_type: returnQuantity == selectedSale.quantity ? "full" : "partial",
      status: "approved",
      reason: "please", // Allow user to enter a reason later
    };
    try {
      const response = await API.post(
        "/sales-return",
        returnData
      );
  
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
  
      toast.success("Return processed successfully!");
      setModalVisible(false);
  
      fetchSales(); // Refresh sales data
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Error processing return. Please try again.");
    }
  };
  

  const columns = [
    {
      name: "Reference Number",
      selector: (row) => row.reference_number,
      sortable: true,
    },
    {
      name: "Product Name",
      selector: (row) => row.product_name,
      sortable: true,
    },
    {
      name: "Quantity",
      selector: (row) => row.quantity,
      sortable: true,
    },
    {
      name: "Total Price",
      selector: (row) => row.total_price.toFixed(2),
      sortable: true,
    },
    {
      name: "Payment Method",
      selector: (row) => row.payment_method,
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
        <button
          onClick={() => {
            setSelectedSale(row);
            setModalVisible(true);
            setReturnQuantity(0);
            setReason("");
          }}
          className="text-blue-600 hover:bg-blue-100 p-2 rounded"
        >
          <FaArrowLeft title="Return" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Make Sales Return
      </h2>

      {modalVisible && selectedSale && (
        <div className="fixed inset-0 flex z-50 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Return Product</h2>
            <div className="mb-4">
              <p>
                <strong>Product:</strong> {selectedSale.product_name}
              </p>
              <p>
                <strong>Quantity Sold:</strong> {selectedSale.quantity}
              </p>
            </div>
            <div className="mb-4">
              <label>Return Quantity</label>
              <input
                type="number"
                value={returnQuantity}
                onChange={(e) =>
                  setReturnQuantity(Number(e.target.value))
                }
                className="w-full border p-2 rounded"
                placeholder={`Max: ${selectedSale.quantity}`}
              />
            </div>
            <div className="mb-4">
              <label>Reason for Return</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="Enter reason"
              />
            </div>
            <div className="mb-4">
              <label>Action</label>
              <div>
                <label>
                  <input
                    type="radio"
                    value="restock"
                    checked={restockOption === "restock"}
                    onChange={(e) => setRestockOption(e.target.value)}
                  />
                  Restock
                </label>
                <label>
                  <input
                    type="radio"
                    value="dispose"
                    checked={restockOption === "dispose"}
                    onChange={(e) => setRestockOption(e.target.value)}
                  />
                  Dispose
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setModalVisible(false)}
                className="mr-2 p-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                className="p-2 bg-blue-600 text-white rounded"
              >
                Process Return
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredSales}
        pagination
        highlightOnHover
      />
    </div>
  );
};

export default SaleReturn;
