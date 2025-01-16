import React,{useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Shop from './components/Shop';
import Settings from './components/Settings';
import 'typeface-inter';
import Header from './components/Header';
import ProductList from './components/ProductList';
import StockList from './components/StockList';
import Edit from './components/EditProduct';
import AddPurchaseOrder from './components/AddPurchaseOrder';
import EditStock from './components/EditStock';
import ExpenseList from './components/ExpenseList';
import Supplier from './components/Supplier';
import Customer from './components/Customer';
import CustomerGroup from './components/CutomerGroup';
import SaleReturn from './components/SaleReturn';
import Draft from './components/Draft';
import SaleReturnList from './components/SaleReturnList';
import ProcessPayment from './components/ProcessPayment';
import SupplierPayment from './components/SupplierPayment';
import PaymentList from './components/PaymentList';
import CustomerPayment from './components/customerPayment';
import AddProduct from './components/AddProducts';
const App = () => {
  const [isExpanded, setIsExpanded] = useState(true); // State for sidebar expansion
  const companyName="Essential Anchor";
  const companyAddress="123 Business St, City, Country" 
  const email="support@company.com" 
  const phone="(123) 456-7890" 
  return (
    <Router>
      <div className="flex">
        <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} companyName={companyName} />
        <div className="flex-1 bg-gray-100">
          <Header isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<Shop companyName={companyName} email={email} phone={phone} companyAddress={companyAddress} />} />
            <Route path="/draft" element={<Draft companyName={companyName} email={email} phone={phone} companyAddress={companyAddress}  />} />
            <Route path="/sale-return" element={<SaleReturn />} />
            <Route path="/sale-return-list" element={<SaleReturnList />} />

            <Route path="/list-expenses" element={<ExpenseList />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/add-purchase-order" element={<AddPurchaseOrder />} />
            <Route path="/edit-stock" element={<EditStock />} />
            <Route path="/suppliers" element={<Supplier/>} />
            <Route path="/customers" element={<Customer/>} />
            <Route path="/customer-groups" element={<CustomerGroup/>} />
            <Route path="/list-products" element={<ProductList />} />
            <Route path="/list-stock" element={<StockList />} />
            <Route path="/add-payment" element={<ProcessPayment />} />
            <Route path="/supplier-payment" element={<SupplierPayment />} />
            <Route path="/customer-payment" element={<CustomerPayment />} />
            <Route path="/payment-history" element={<PaymentList />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
