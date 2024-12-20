import React,{useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Shop from './components/Shop';
import Settings from './components/Settings';
import 'typeface-inter';
import Header from './components/Header';
import ProductList from './components/ProductList';
import AddProduct from './components/AddProduct';
import ExpenseList from './components/ExpenseList';
const App = () => {
  const [isExpanded, setIsExpanded] = useState(true); // State for sidebar expansion

  return (
    <Router>
      <div className="flex">
        <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
        <div className="flex-1 bg-gray-100">
          <Header isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/list-expenses" element={<ExpenseList />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/list-products" element={<ProductList />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
