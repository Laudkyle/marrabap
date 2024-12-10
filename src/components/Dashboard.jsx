import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
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
import axios from "axios";
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

const Dashboard = () => {
  const [salesData, setSalesData] = useState([]);

  // Fetch the sales data
  useEffect(() => {
    fetch("http://localhost:5000/sales")
      .then((response) => response.json())
      .then((data) => setSalesData(data))
      .catch((err) => console.error("Error fetching sales data:", err));
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

  // Prepare data for the pie chart (sales distribution by product)
  const pieChartData = {
    labels: Object.keys(totalSalesByProduct),
    datasets: [
      {
        label: "Sales Distribution",
        data: Object.values(totalSalesByProduct),
        backgroundColor: [
          "rgba(255, 99, 132, 0.2)",
          "rgba(54, 162, 235, 0.2)",
          "rgba(255, 206, 86, 0.2)",
          "rgba(75, 192, 192, 0.2)",
          "rgba(153, 102, 255, 0.2)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="h-[85vh] overflow-scroll bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Marrabap Ventures
      </h1>
      <div>
        <div className="grid grid-cols-3 grid-rows-2 gap-6 mb-12">
          {/* Total Sales */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiDollarSign className="text-4xl text-blue-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Total Sales</h2>
              <p className="text-2xl font-bold text-gray-800">₵12,345</p>
            </div>
          </div>

          {/* Total Purchases */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiShoppingCart className="text-4xl text-green-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">
                Total Purchases
              </h2>
              <p className="text-2xl font-bold text-gray-800">₵8,910</p>
            </div>
          </div>

          {/* Total Purchase Returns */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiTrendingDown className="text-4xl text-red-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">
                Purchase Returns
              </h2>
              <p className="text-2xl font-bold text-gray-800">₵1,230</p>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiCreditCard className="text-4xl text-yellow-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Expenses</h2>
              <p className="text-2xl font-bold text-gray-800">₵2,345</p>
            </div>
          </div>

          {/* Total Sales Returns */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiTrendingDown className="text-4xl text-orange-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">
                Sales Returns
              </h2>
              <p className="text-2xl font-bold text-gray-800">₵980</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white shadow-lg rounded-lg p-4 text-center justify-center space-x-4 flex flex-row items-center transition-transform transform hover:-translate-y-1">
            <FiBarChart2 className="text-4xl text-purple-500 mb-2" />
            <div>
              <h2 className="text-sm font-light text-gray-700">Net Profit</h2>
              <p className="text-2xl font-bold text-green-600">₵9,500</p>
            </div>
          </div>
        </div>
      </div>
      {/* Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
        {/* Bar Chart */}
        <div className="h-[calc(50vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <h2 className="text-2xl text-centsm font-light mb-4 text-gray-700">
            Total Sales by Product
          </h2>
          <Bar
            data={barChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>

        {/* Line Chart */}
        <div className="h-[calc(50vh-2rem)] bg-white shadow-lg rounded-lg p-4">
          <h2 className="text-2xl text-centsm font-light mb-4 text-gray-700">
            Sales Over Time
          </h2>
          <Line
            data={lineChartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </div>

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
