import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/LoginComponent";
import PrivateRoute from "./PrivateRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Shop from "./components/Shop";
import Settings from "./components/Settings";
import "typeface-inter";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import Transactions from "./components/Transactions";
import Adjustments from "./components/Adjustments";
import JournalEntry from "./components/JournalEntry";
import AddPurchaseOrder from "./components/AddPurchaseOrder";
import EditPurchaseOrder from "./components/EditPurchaseOrder";
import ExpenseList from "./components/ExpenseList";
import Supplier from "./components/Supplier";
import Customer from "./components/Customer";
import CustomerGroup from "./components/CutomerGroup";
import SaleReturn from "./components/SaleReturn";
import Draft from "./components/Draft";
import SaleReturnList from "./components/SaleReturnList";
import ProcessPayment from "./components/ProcessPayment";
import SupplierPayment from "./components/SupplierPayment";
import PaymentList from "./components/PaymentList";
import CustomerPayment from "./components/CustomerPayment";
import AddProduct from "./components/AddProducts";
import PurchaseOrdersTable from "./components/PurchaseOrderTable";
import { ToastContainer } from "react-toastify";
import AccountBalances from "./components/AccountBalances";
import OpeningBalances from "./components/OpeningBalances";
import Taxes from "./components/Taxes";
import AddPaymentMethod from "./components/AddPaymentMethod";
import TaxSettings from "./components/TaxSettings";
import IncomeStatement from "./components/IncomeStatement";
import BalanceSheet from "./components/BalanceSheet";
import TrailBalance from "./components/TrailBalance";
import TaxReport from "./components/TaxReport";
import ExpenseComponent from "./components/Expense";
import { toastOptions } from "./toastConfig";
import GeneralLedgerComponent from "./components/GeneralLedger";
import FundsTransferComponent from "./components/FundTransfer";

const App = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const companyName = "Essential Anchor Limited";
  const companyAddress = "P.O.Box: CS 9083 Comm. 7 Tema - Ghana";
  const email = "essentialanchorltd@gmail.com";
  const phone = "233 (0)20 694 5430, 233(0)24 929 2160";

  return (
    <Router>
      <div className="flex">
        <Sidebar
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          companyName={companyName}
        />
        <div className="flex-1 bg-gray-100">
          <ToastContainer {...toastOptions} />
          <Header isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Private Routes */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <PrivateRoute>
                  <Shop
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/draft"
              element={
                <PrivateRoute>
                  <Draft
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route path="/sale-return" element={<PrivateRoute><SaleReturn /></PrivateRoute>} />
            <Route path="/sale-return-list" element={<PrivateRoute><SaleReturnList /></PrivateRoute>} />
            <Route path="/list-expenses" element={<PrivateRoute><ExpenseList /></PrivateRoute>} />
            <Route path="/add-product" element={<PrivateRoute><AddProduct /></PrivateRoute>} />
            <Route path="/add-purchase-order" element={<PrivateRoute><AddPurchaseOrder /></PrivateRoute>} />
            <Route path="/edit-purchase-order" element={<PrivateRoute><EditPurchaseOrder /></PrivateRoute>} />
            <Route path="/suppliers" element={<PrivateRoute><Supplier /></PrivateRoute>} />
            <Route path="/account-balances" element={<PrivateRoute><AccountBalances /></PrivateRoute>} />
            <Route path="/opening-balances" element={<PrivateRoute><OpeningBalances /></PrivateRoute>} />
            <Route path="/adjustments" element={<PrivateRoute><Adjustments /></PrivateRoute>} />
            <Route path="/customers" element={<PrivateRoute><Customer /></PrivateRoute>} />
            <Route path="/customer-groups" element={<PrivateRoute><CustomerGroup /></PrivateRoute>} />
            <Route path="/list-products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
            <Route path="/list-purchase-orders" element={<PrivateRoute><PurchaseOrdersTable /></PrivateRoute>} />
            <Route path="/add-payment" element={<PrivateRoute><ProcessPayment /></PrivateRoute>} />
            <Route path="/add-payment-method" element={<PrivateRoute><AddPaymentMethod /></PrivateRoute>} />
            <Route path="/supplier-payment" element={<PrivateRoute><SupplierPayment /></PrivateRoute>} />
            <Route path="/customer-payment" element={<PrivateRoute><CustomerPayment /></PrivateRoute>} />
            <Route path="/payment-history" element={<PrivateRoute><PaymentList /></PrivateRoute>} />
            <Route path="/process-payment" element={<PrivateRoute><ProcessPayment /></PrivateRoute>} />
            <Route path="/taxes" element={<PrivateRoute><Taxes /></PrivateRoute>} />
            <Route path="/tax-settings" element={<PrivateRoute><TaxSettings /></PrivateRoute>} />
            <Route path="/tax-reports" element={<PrivateRoute><TaxReport /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/expense" element={<PrivateRoute><ExpenseComponent /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/income-statement" element={<PrivateRoute><IncomeStatement /></PrivateRoute>} />
            <Route path="/general-ledger" element={<PrivateRoute><GeneralLedgerComponent /></PrivateRoute>} />
            <Route path="/funds-transfer" element={<PrivateRoute><FundsTransferComponent /></PrivateRoute>} />
            <Route path="/balance-sheet" element={<PrivateRoute><BalanceSheet /></PrivateRoute>} />
            <Route path="/trial-balance" element={<PrivateRoute><TrailBalance /></PrivateRoute>} />
            <Route path="/journal-entry" element={<PrivateRoute><JournalEntry /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
