import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit,
  FaTrashAlt,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import ReactModal from "react-modal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// Set the app element for accessibility
ReactModal.setAppElement("#root");

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  // Fetch products from the backend
  useEffect(() => {
    axios
      .get("http://localhost:5000/products")
      .then((response) => {
        setProducts(response.data);
      })
      .catch((error) => {
        console.error("There was an error fetching the products:", error);
      });
  }, []);

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }

    const sortedProducts = [...products].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === "ascending" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === "ascending" ? 1 : -1;
      }
      return 0;
    });

    setProducts(sortedProducts);
    setSortConfig({ key, direction });
  };

  // Handle edit
  const handleEdit = (product) => {
    setIsEditing(true);
    setSelectedProduct({ ...product });
  };

  // Handle delete
  const handleDelete = (productId) => {
    setShowDeleteConfirmation(true);
    setProductToDelete(productId);
  };

  // Confirm delete
  const confirmDelete = () => {
    axios
      .delete(`http://localhost:5000/products/${productToDelete}`)
      .then(() => {
        setProducts(
          products.filter((product) => product.id !== productToDelete)
        );
        toast.success("Product deleted successfully!");
        setShowDeleteConfirmation(false);
        setProductToDelete(null);
      })
      .catch((error) => {
        console.error("There was an error deleting the product:", error);
        toast.error("Error deleting the product.");
      });
  };

  // Handle product update
  const handleUpdate = () => {
    const { id, name, cp, sp, stock } = selectedProduct;

    axios
      .put(`http://localhost:5000/products/${id}`, { name, cp, sp, stock })
      .then((response) => {
        const updatedProduct = response.data;
        setProducts(
          products.map((product) =>
            product.id === updatedProduct.id ? updatedProduct : product
          )
        );
        toast.success("Product updated successfully!");
        setIsEditing(false);
        setSelectedProduct(null);
      })
      .catch((error) => {
        console.error("There was an error updating the product:", error);
        toast.error("Error updating the product.");
      });
  };

  // Handle change in input fields (for editing)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedProduct({ ...selectedProduct, [name]: value });
  };

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Product List", 20, 20);
    let yOffset = 30;
    products.forEach((product) => {
      doc.text(
        `${product.name} - Cost Price: ${product.cp}, Selling Price: ${product.sp}, Stock: ${product.stock}`,
        20,
        yOffset
      );
      yOffset += 10;
    });
    doc.save("products.pdf");
  };

  // Print the product list
  const printProducts = () => {
    const printWindow = window.open();
    printWindow.document.write(
      "<html><head><title>Product List</title></head><body>"
    );
    printWindow.document.write("<h1>Product List</h1>");
    printWindow.document.write(
      "<table border='1'><thead><tr><th>Name</th><th>Cost Price</th><th>Selling Price</th><th>Stock</th></tr></thead><tbody>"
    );
    products.forEach((product) => {
      printWindow.document.write(
        `<tr><td>${product.name}</td><td>${product.cp}</td><td>${product.sp}</td><td>${product.stock}</td></tr>`
      );
    });
    printWindow.document.write("</tbody></table>");
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 shadow-lg rounded-lg overflow-y-scroll h-[85vh]">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">
        Product List
      </h2>

      {/* Export Options */}
      <div className="flex justify-start space-x-6 mb-6">
        <button
          onClick={exportToExcel}
          className="flex items-center bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <FaFileExcel size={20} className="mr-2" />
          Export as Excel
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <FaFilePdf size={20} className="mr-2" />
          Export as PDF
        </button>
        <button
          onClick={printProducts}
          className="flex items-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FaPrint size={20} className="mr-2" />
          Print
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-gray-100">
          <thead className="bg-gray-200">
            <tr>
              <th
                onClick={() => requestSort("name")}
                className="cursor-pointer py-2 px-4 text-left text-sm font-medium text-gray-700"
              >
                <div className="flex items-center">
                  <span>Product Name</span>
                  <span className="ml-2">
                    {sortConfig.key === "name" ? (
                      sortConfig.direction === "ascending" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => requestSort("cp")}
                className="cursor-pointer py-2 px-4 text-left text-sm font-medium text-gray-700"
              >
                <div className="flex items-center">
                  <span>Cost Price</span>
                  <span className="ml-2">
                    {sortConfig.key === "cp" ? (
                      sortConfig.direction === "ascending" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => requestSort("sp")}
                className="cursor-pointer py-2 px-4 text-left text-sm font-medium text-gray-700"
              >
                <div className="flex items-center">
                  <span>Selling Price</span>
                  <span className="ml-2">
                    {sortConfig.key === "sp" ? (
                      sortConfig.direction === "ascending" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={() => requestSort("stock")}
                className="cursor-pointer py-2 px-4 text-left text-sm font-medium text-gray-700"
              >
                <div className="flex items-center">
                  <span>Stock</span>
                  <span className="ml-2">
                    {sortConfig.key === "stock" ? (
                      sortConfig.direction === "ascending" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort />
                    )}
                  </span>
                </div>
              </th>

              <th className="py-3 px-6 text-left text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b hover:bg-gray-50 transition duration-300"
              >
                <td className="py-3 px-6">{product.name}</td>
                <td className="py-3 px-6">{product.cp}</td>
                <td className="py-3 px-6">{product.sp}</td>
                <td className="py-3 px-6">{product.stock}</td>
                <td className="py-3 px-6">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-500 hover:text-blue-700 transition duration-300"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-700 transition duration-300"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ReactModal
          isOpen={showDeleteConfirmation}
          onRequestClose={() => setShowDeleteConfirmation(false)}
          contentLabel="Confirm Delete"
          className="bg-white p-4 rounded-lg shadow-lg z-50 w-1/3 h-1/4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
        >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Confirm Delete
        </h2>
        <p className="text-gray-600">
          Are you sure you want to delete this product?
        </p>
        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={() => setShowDeleteConfirmation(false)}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="bg-red-500 text-white py-2 px-4 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </ReactModal>

      {/* Product Edit Modal */}
      {isEditing && selectedProduct && (
         <ReactModal
         isOpen={isEditing}
         onRequestClose={() => setIsEditing(false)}
         contentLabel="Edit Product Modal"
         className="bg-white absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60vw] w-max-[800px] h-1/2 p-6 shadow-lg rounded-lg z-50"
         overlayClassName="fixed inset-0 bg-black bg-opacity-50"
       >
         <h3 className="text-2xl font-semibold text-gray-800 mb-4">
           Edit Product
         </h3>
 
         <form
           onSubmit={(e) => {
             e.preventDefault();
             handleUpdate();
           }}
         >
           <div className="grid grid-cols-2 gap-4">
             {/* Product Name */}
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-600">
                 Product Name
               </label>
               <input
                 type="text"
                 name="name"
                 value={selectedProduct?.name}
                 onChange={handleChange}
                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
               />
             </div>
 
             {/* Cost Price */}
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-600">
                 Cost Price
               </label>
               <input
                 type="number"
                 name="cp"
                 value={selectedProduct?.cp}
                 onChange={handleChange}
                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
               />
             </div>
 
             {/* Selling Price */}
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-600">
                 Selling Price
               </label>
               <input
                 type="number"
                 name="sp"
                 value={selectedProduct?.sp}
                 onChange={handleChange}
                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
               />
             </div>
 
             {/* Stock */}
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-600">
                 Stock
               </label>
               <input
                 type="number"
                 name="stock"
                 value={selectedProduct?.stock}
                 onChange={handleChange}
                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
               />
             </div>
           </div>
 
           <div className="flex justify-end space-x-4 mt-6">
             <button
               type="submit"
               className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               Update
             </button>
             <button
               type="button"
               onClick={() => setIsEditing(false)}
               className="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
             >
               Cancel
             </button>
           </div>
         </form>
       </ReactModal>
      )}
      <ToastContainer />
    </div>
  );
};

export default ProductList;
