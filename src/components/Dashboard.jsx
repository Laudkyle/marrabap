import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import API from "../api";

import {
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard,
  FiBarChart2,
} from "react-icons/fi";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);
const Dashboard = ({companyName}) => {
  // Filter out-of-stock products
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  // Fetch the sales data
  const [netProfit, setNetProfit] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [expenses, setExpenses] = useState(0); // Add expenses if available
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel for efficiency
        const [salesRes, purchaseOrdersRes, salesReturnsRes, purchaseReturnsRes, expensesRes] =
          await Promise.all([
            API.get("/sales"),
            API.get("/purchase_orders"),
            API.get("/sales/returns"),
            API.get("/purchase/returns"), // Corrected endpoint for purchase returns
            API.get("/expenses"),
          ]);

        setSalesData(salesRes.data);
        setPurchaseOrders(purchaseOrdersRes.data);
        setSalesReturns(salesReturnsRes.data);
        setPurchaseReturns(purchaseReturnsRes.data);
        setExpenses(expensesRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data.");
      }
    };

    fetchData();
  }, []);

  // Prepare data for the bar chart (total sales by product)
  const totalSalesByProduct = salesData.reduce((acc, sale) => {
    if (acc[sale.product_name]) {
      acc[sale.product_name] += sale.total_price;
    } else {
      acc[sale.product_name] = sale.total_price;
    }
    return acc;
  }, {});

  const barChartData = {
    labels: Object.keys(totalSalesByProduct),
    datasets: [
      {
        label: "Total Sales",
        data: Object.values(totalSalesByProduct),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  
  // Calculate Total Sales
  const totalSales = salesData.reduce((acc, sale) => acc + sale.total_price, 0);

  // Calculate Total Purchases
  const totalPurchases = purchaseOrders.reduce((acc, order) => acc + order.total_amount, 0);

  // Calculate Total Sales Returns
  const totalSalesReturns = salesReturns.reduce((acc, returnItem) => acc + returnItem.return_quantity * returnItem.price, 0);

  // Calculate Total Purchase Returns
  const totalPurchaseReturns = purchaseReturns.reduce((acc, returnItem) => acc + returnItem.return_quantity * returnItem.price, 0);

  // Calculate Net Profit (example formula)
  const date = "2025-01-25"; // Set the date to fetch the income statement

  useEffect(() => {
    const fetchIncomeStatement = async () => {
      try {
        const response = await API.get(`/reports/income-statement?date=${date}`);
        setNetProfit(response.data.netIncome);
      } catch (err) {
        console.error("Error fetching income statement:", err);
      }
    };

    fetchIncomeStatement();
  }, [date]); 

  // Prepare data for the line chart (sales over time)
  const salesByDate = salesData.reduce((acc, sale) => {
    const saleDate = new Date(sale.date).toISOString().split("T")[0]; // Format the date as YYYY-MM-DD
    if (acc[saleDate]) {
      acc[saleDate] += sale.total_price;
    } else {
      acc[saleDate] = sale.total_price;
    }
    return acc;
  }, {});

  // Sort the dates in chronological order
  const sortedDates = Object.keys(salesByDate).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // Prepare sorted data for the line chart
  const lineChartData = {
    labels: sortedDates,
    datasets: [
      {
        label: "Sales Over Time",
        data: sortedDates.map((date) => salesByDate[date]),
        fill: false,
        borderColor: "rgba(153, 102, 255, 1)",
        tension: 0.1,
      },
    ],
  };

   useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await API.get("/products");
        setProductData(response.data);
      } catch (err) {
        console.error("Error fetching product data:", err);
        setError("Failed to fetch product data. Please try again.");
      }
    };

    fetchProducts();
  }, []); // Runs once on mount

  const outOfStockProducts = productData.filter(
    (product) => product.stock === 0
  );

  return (
    <div className="h-[85vh] overflow-scroll bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        {companyName}
      </h1>
      <div className="grid grid-cols-3 grid-rows-2 gap-6 mb-12">
          {/* Total Sales */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiDollarSign className="text-4xl text-blue-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Total Sales</h2>
              <p className="text-2xl font-bold text-gray-800">₵{totalSales.toFixed(2)}</p>
            </div>
          </div>

          {/* Total Purchases */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiShoppingCart className="text-4xl text-green-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Total Purchases</h2>
              <p className="text-2xl font-bold text-gray-800">₵{totalPurchases.toFixed(2)}</p>
            </div>
          </div>

          {/* Total Purchase Returns */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiTrendingDown className="text-4xl text-red-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Purchase Returns</h2>
              <p className="text-2xl font-bold text-gray-800">₵{totalPurchaseReturns.toFixed(2)}</p>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiCreditCard className="text-4xl text-yellow-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Expenses</h2>
              <p className="text-2xl font-bold text-gray-800">₵{expenses}</p>
            </div>
          </div>

          {/* Total Sales Returns */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiTrendingDown className="text-4xl text-orange-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Sales Returns</h2>
              <p className="text-2xl font-bold text-gray-800">₵{totalSalesReturns.toFixed(2)}</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiBarChart2 className="text-4xl text-purple-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Net Profit</h2>
              <p className="text-2xl font-bold text-green-600">₵{netProfit}</p>
            </div>
          </div>
        </div>
      

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-8 mb-16">
        {/* Bar Chart */}
        <div className="h-[calc(60vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <h2 className="text-2xl text-centsm font-light mb-4 text-gray-700">
            Total Sales by Product
          </h2>
          <Bar
            data={barChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>

        {/* Line Chart */}
        <div className="h-[calc(60vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <h2 className="text-2xl text-centsm font-light mb-4 text-gray-700">
            Sales Over Time
          </h2>
          <Line
            data={lineChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </div>
      {/* Out of Stock Products Section */}
      {outOfStockProducts.length > 0 && (<div className="bg-white shadow-lg rounded-lg p-6 mt-8 mb-6">
          <h2 className="text-2sm font-light text-center text-gray-700">
            Products out of stock
          </h2>
        <div className="bg-white rounded-lg p-6 mt-2 max-h-[300px] overflow-scroll">
          {outOfStockProducts.length > 0 ? (
            <table className="min-w-full bg-white text-gray-700">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-6 py-3 text-left border-b text-sm font-medium">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left border-b text-sm font-medium">
                    Cost Price
                  </th>
                  <th className="px-6 py-3 text-left border-b text-sm font-medium">
                    Selling Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {outOfStockProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-b text-sm">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 border-b text-sm">
                      ₵{product.cp}
                    </td>
                    <td className="px-6 py-4 border-b text-sm">
                      ₵{product.sp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-600">
              No out-of-stock products currently.
            </p>
          )}
        </div>
      </div>
)}
      {/* Recent Transactions Table */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2sm font-light text-center mb-4 text-gray-700">
          Most Recent Transactions
        </h2>
        <table className="min-w-full bg-white text-gray-700">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Product Name
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Quantity Sold
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Total Price
              </th>
              <th className="px-6 py-3 text-left border-b text-sm font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {salesData.slice(0, 5).map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b text-sm">
                  {sale.product_name}
                </td>
                <td className="px-6 py-4 border-b text-sm">{sale.quantity}</td>
                <td className="px-6 py-4 border-b text-sm">
                  {sale.total_price}
                </td>
                <td className="px-6 py-4 border-b text-sm">
                  {new Date(sale.date).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
