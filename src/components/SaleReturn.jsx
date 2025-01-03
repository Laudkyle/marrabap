import React, { useState, useEffect } from "react";
import axios from "axios";
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

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get("http://localhost:5000/sales");
      setSales(response.data);
      setFilteredSales(response.data);
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
    if (returnQuantity <= 0 || returnQuantity > selectedSale.quantity) {
      toast.error("Invalid return quantity!");
      return;
    }
  
    const returnData = {
      sale_id: selectedSale.id,          // Send sale_id
      reference_number: selectedSale.reference_number, // Send reference_number
      return_quantity: returnQuantity,
      action: restockOption,
    };
  
    try {
      const response = await axios.post(
        "http://localhost:5000/sales/return",
        returnData
      );
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
  
      toast.success("Return processed successfully!");
      setModalVisible(false);
  
      // Update the sales list
      const updatedSales = sales.map((sale) =>
        sale.id === selectedSale.id
          ? {
              ...sale,
              quantity: sale.quantity - returnQuantity,
              total_price:
                sale.total_price -
                selectedSale.total_price *
                  (returnQuantity / selectedSale.quantity),
            }
          : sale
      );
  
      // Update both states
      setSales(updatedSales);
      setFilteredSales(updatedSales.filter((sale) => sale.quantity > 0));
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
      selector: (row) => row.total_price,
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
            onClick={() => {
              setSelectedSale(row);
              setModalVisible(true);
              setReturnQuantity(0);
            }}
            className="text-blue-600 hover:bg-blue-100 p-2 rounded"
          >
            <div className="relative group">
              <FaArrowLeft
                className="cursor-pointer text-gray-500 hover:text-blue-500"
                title="Return"
              />
              
            </div>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl px-6 font-semibold text-gray-700 mb-4">
        Make Sales Return
      </h2>
      <ToastContainer />
      {modalVisible && (
        <div className="fixed inset-0 flex z-50 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Return Product</h2>
            {selectedSale && (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Process a return for the selected product.
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-600">
                    <strong className="font-medium">Product:</strong>{" "}
                    {selectedSale.product_name}
                  </p>
                  <p className="text-gray-600">
                    <strong className="font-medium">Quantity Sold:</strong>{" "}
                    {selectedSale.quantity}
                  </p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Quantity
                  </label>
                  <input
                    type="number"
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Number(e.target.value))}
                    onInput={(e) => {
                      const value = Math.min(
                        Number(e.target.value),
                        selectedSale.quantity
                      );
                      e.target.value = value; // Enforce max value in the input field
                      setReturnQuantity(value);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
                    placeholder={`Max: ${selectedSale.quantity}`}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can return up to {selectedSale.quantity} items.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center text-gray-700">
                      <input
                        type="radio"
                        value="restock"
                        checked={restockOption === "restock"}
                        onChange={(e) => setRestockOption(e.target.value)}
                        className="mr-2"
                      />
                      Restock
                    </label>
                    <label className="flex items-center text-gray-700">
                      <input
                        type="radio"
                        value="dispose"
                        checked={restockOption === "dispose"}
                        onChange={(e) => setRestockOption(e.target.value)}
                        className="mr-2"
                      />
                      Dispose
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setModalVisible(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturn}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                  >
                    Process Return
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="bg-white mx-6 shadow-sm rounded-md h-[75vh] overflow-scroll p-6">
        <DataTable
          className="z-0"
          columns={columns}
          data={filteredSales}
          pagination
          highlightOnHover
          responsive
          striped
          subHeader
          subHeaderComponent={
            <input
              type="text"
              placeholder="Search sales"
              className="p-2 border border-gray-300 rounded-md"
              onChange={handleSearch}
            />
          }
        />
      </div>
    </div>
  );
};

export default SaleReturn;
