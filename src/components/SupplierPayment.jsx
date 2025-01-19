import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify"; // Ensure react-toastify is installed

const SupplierPayment = () => {
  const [paymentData, setPaymentData] = useState({
    supplierId: "",
    purchaseOrderId: "",
    amountPaid: "",
    paymentMethod: "cash",
    paymentReference: "",
    paymentDate: new Date().toISOString(),
    documents: [],
    errorMessage: "",
  });

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/suppliers");
        setSuppliers(response.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Error fetching suppliers data.");
      }
    };
    fetchSuppliers();
  }, []);

  const generateReferenceNumber = () => {
    const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000000);
    return `REF ${uniqueNumber}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSupplierChange = async (e) => {
    const supplierId = e.target.value;

    setPaymentData((prevData) => ({
      ...prevData,
      supplierId,
      purchaseOrderId: "", // Reset purchase order when supplier changes
    }));

    if (supplierId) {
      try {
        const response = await axios.get(
          `http://localhost:5000/suppliers/purchase_orders/${supplierId}`
        );
        setPurchaseOrders(
          response.data.filter(
            (order) => order.payment_status === "unpaid" || order.payment_status === "partial"
          )
        );
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        toast.error("Error fetching purchase orders.");
      }
    } else {
      setPurchaseOrders([]);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    const maxFileSize = 4 * 1024 * 1024;

    if (selectedFiles) {
      const validFiles = [];
      const rejectedFiles = [];

      Array.from(selectedFiles).forEach((file) => {
        if (file.size <= maxFileSize) {
          validFiles.push(file);
        } else {
          rejectedFiles.push(file.name);
        }
      });

      setPaymentData((prevData) => ({
        ...prevData,
        documents: [...prevData.documents, ...validFiles],
      }));

      if (rejectedFiles.length > 0) {
        toast.error(
          `The following files exceed the 4MB limit: ${rejectedFiles.join(", ")}`
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const referenceNumber = generateReferenceNumber();

    setPaymentData((prevData) => ({
      ...prevData,
      paymentReference: referenceNumber,
    }));

    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      setLoading(false);
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const paymentPayload = {
      supplier_id: paymentData.supplierId,
      purchase_order_id: paymentData.purchaseOrderId,
      reference_number: referenceNumber,
      payment_date: paymentData.paymentDate,
      amount_paid: paymentData.amountPaid,
      payment_method: paymentData.paymentMethod,
    };

    try {
      const paymentResponse = await axios.post(
        "http://localhost:5000/payments",
        paymentPayload
      );

      if (paymentData.documents.length > 0) {
        const formData = new FormData();
        formData.append("transaction_type", "payment");
        formData.append("reference_number", referenceNumber);

        paymentData.documents.forEach((file) => {
          formData.append("files", file);
        });

        await axios.post("http://localhost:5000/documents", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      if (paymentResponse.status === 201) {
        toast.success("Supplier payment processed successfully.");
        setPaymentData({
          supplierId: "",
          purchaseOrderId: "",
          amountPaid: "",
          paymentMethod: "cash",
          paymentReference: "",
          paymentDate: new Date().toISOString(),
          documents: [],
          errorMessage: "",
        });
        setPurchaseOrders([]);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Error processing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-semibold text-gray-700">Supplier Payment</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="supplierId" className="text-gray-600">Supplier</label>
            <select
              name="supplierId"
              id="supplierId"
              value={paymentData.supplierId}
              onChange={handleSupplierChange}
              required
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="purchaseOrderId" className="text-gray-600">Purchase Order</label>
            <select
              name="purchaseOrderId"
              id="purchaseOrderId"
              value={paymentData.purchaseOrderId}
              onChange={handleInputChange}
              required
              disabled={!purchaseOrders.length}
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="">Select Purchase Order</option>
              {purchaseOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {`Order #${order.id} - Amount Due: ${order.total_amount}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="amountPaid" className="text-gray-600">Amount Paid</label>
            <input
              type="number"
              name="amountPaid"
              id="amountPaid"
              value={paymentData.amountPaid}
              onChange={handleInputChange}
              required
              min="1"
              className="mt-2 p-3 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="paymentMethod" className="text-gray-600">Payment Method</label>
            <select
              name="paymentMethod"
              id="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handleInputChange}
              className="mt-2 p-3 border border-gray-300 rounded-md"
            >
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="document" className="text-gray-600">Attach Documents</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="application/pdf, image/*"
              multiple
              className="mt-2 p-3 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? "Processing..." : "Submit Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierPayment;
