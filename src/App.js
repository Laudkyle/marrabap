import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Shop from "./components/Shop";
import Settings from "./components/Settings";
import "typeface-inter";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import Transactions from "./components/Transactions";
import Adjustments from "./components/Adjustments";
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
import CustomerPayment from "./components/customerPayment";
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
import { toastOptions } from "./toastConfig"; // Import the config
import GeneralLedgerComponent from "./components/GeneralLedger";
import FundsTransferComponent from "./components/FundTransfer";
 const App = () => {
  const [isExpanded, setIsExpanded] = useState(true); // State for sidebar expansion
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
            <Route
              path="/"
              element={
                <Dashboard
                  companyName={companyName}
                  email={email}
                  phone={phone}
                  companyAddress={companyAddress}
                />
              }
            />
            <Route
              path="/pos"
              element={
                <Shop
                  companyName={companyName}
                  email={email}
                  phone={phone}
                  companyAddress={companyAddress}
                />
              }
            />
            <Route
              path="/draft"
              element={
                <Draft
                  companyName={companyName}
                  email={email}
                  phone={phone}
                  companyAddress={companyAddress}
                />
              }
            />
            <Route path="/sale-return" element={<SaleReturn />} />
            <Route path="/sale-return-list" element={<SaleReturnList />} />

            <Route path="/list-expenses" element={<ExpenseList />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/add-purchase-order" element={<AddPurchaseOrder />} />
            <Route
              path="/edit-purchase-order"
              element={<EditPurchaseOrder />}
            />
            <Route path="/suppliers" element={<Supplier />} />
            <Route path="/account-balances" element={<AccountBalances />} />
            <Route path="/opening-balances" element={<OpeningBalances />} />
            <Route path="/adjustments" element={<Adjustments />} />
            <Route path="/customers" element={<Customer />} />
            <Route path="/customer-groups" element={<CustomerGroup />} />
            <Route path="/list-products" element={<ProductList />} />
            <Route
              path="/list-purchase-orders"
              element={<PurchaseOrdersTable />}
            />
            <Route path="/add-payment" element={<ProcessPayment />} />
            <Route path="/add-payment-method" element={<AddPaymentMethod />} />
            <Route path="/supplier-payment" element={<SupplierPayment />} />
            <Route path="/customer-payment" element={<CustomerPayment />} />
            <Route path="/payment-history" element={<PaymentList />} />
            <Route path="/process-payment" element={<ProcessPayment />} />
            <Route path="/taxes" element={<Taxes />} />
            <Route path="/tax-settings" element={<TaxSettings />} />
            <Route path="/tax-reports" element={<TaxReport />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/expense" element={<ExpenseComponent />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/income-statement" element={<IncomeStatement />} />
            <Route path="/general-ledger" element={<GeneralLedgerComponent />} />
            <Route path="/funds-transfer" element={<FundsTransferComponent />} />
            <Route path="/balance-sheet" element={<BalanceSheet />} />
            <Route path="/trial-balance" element={<TrailBalance />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
