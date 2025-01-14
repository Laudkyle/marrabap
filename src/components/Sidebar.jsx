import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaChevronDown } from "react-icons/fa";
import {
  Store,
  Box,
  Warehouse,
  Calculator,
  BarChart3,
  Building2,
  Receipt,
  BookOpen,
  Users,
  CreditCard,
  Settings,
  PlusCircle,
  List,
  Edit,
  ArrowLeft,
  Save,
  ShoppingCart,
  Coins,
  FileSpreadsheet,
  Scale,
  UserCircle,
  Lock,
  Truck,
  UsersRound,
  Group,
  Cog,
} from "lucide-react";
import { FaMoneyBill1 } from "react-icons/fa6";

const Sidebar = ({ isExpanded, companyName }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const dropdownItemClass = `block px-6 py-2 hover:bg-gray-600 flex items-center`;

  const dropdownMenus = [
    {
      name: "Shop",
      icon: <Store className="w-4 h-4" />,
      dropdown: "shop",
      links: [
        {
          path: "/pos",
          label: "POS",
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        { path: "/draft", label: "Draft", icon: <Save className="w-4 h-4" /> },
        {
          path: "/sale-return",
          label: "Make Sale Return",
          icon: <ArrowLeft className="w-4 h-4" />,
        },
        {
          path: "/sale-return-list",
          label: "Sale Return List",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Products",
      icon: <Box className="w-4 h-4" />,
      dropdown: "products",
      links: [
        {
          path: "/add-product",
          label: "Edit Product",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/list-products",
          label: "List Products",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Stock",
      icon: <Warehouse className="w-4 h-4" />,
      dropdown: "stock",
      links: [
        {
          path: "/add-stock",
          label: "Add Stock",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/edit-stock",
          label: "Update Stock",
          icon: <Edit className="w-4 h-4" />,
        },
        {
          path: "/list-stock",
          label: "List Stock",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Payments",
      icon: <FaMoneyBill1 className="w-4 h-4" />,
      dropdown: "payments",
      links: [
        {
          path: "/add-payment",
          label: "Process Payment",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/supplier-payment",
          label: "Supplier Payment",
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          path: "/payment-history",
          label: "Payment History",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Expenses",
      icon: <Calculator className="w-4 h-4" />,
      dropdown: "expenses",
      links: [
        {
          path: "/add-expense",
          label: "Add Expense",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/list-expenses",
          label: "List Expenses",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Reports",
      icon: <BarChart3 className="w-4 h-4" />,
      dropdown: "reports",
      links: [
        {
          path: "/income-statement",
          label: "Income Statement",
          icon: <Receipt className="w-4 h-4" />,
        },
        {
          path: "/balance-sheet",
          label: "Balance Sheet",
          icon: <FileSpreadsheet className="w-4 h-4" />,
        },
        {
          path: "/cash-flow",
          label: "Cash Flow Statement",
          icon: <Coins className="w-4 h-4" />,
        },
        {
          path: "/trial-balance",
          label: "Trial Balance",
          icon: <Scale className="w-4 h-4" />,
        },
        {
          path: "/accounts-receivable",
          label: "Accounts Receivable",
          icon: <List className="w-4 h-4" />,
        },
        {
          path: "/accounts-payable",
          label: "Accounts Payable",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Fixed Assets",
      icon: <Building2 className="w-4 h-4" />,
      dropdown: "fixed-assets",
      links: [
        {
          path: "/add-asset",
          label: "Add Asset",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/list-assets",
          label: "List Assets",
          icon: <List className="w-4 h-4" />,
        },
        {
          path: "/depreciation",
          label: "Depreciation Schedule",
          icon: <Calculator className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Tax",
      icon: <Receipt className="w-4 h-4" />,
      dropdown: "tax",
      links: [
        {
          path: "/tax-settings",
          label: "Tax Settings",
          icon: <Settings className="w-4 h-4" />,
        },
        {
          path: "/tax-reports",
          label: "Tax Reports",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Accounting",
      icon: <BookOpen className="w-4 h-4" />,
      dropdown: "accounting",
      links: [
        {
          path: "/chart-of-accounts",
          label: "Chart of Accounts",
          icon: <List className="w-4 h-4" />,
        },
        {
          path: "/journal-entries",
          label: "Journal Entries",
          icon: <Edit className="w-4 h-4" />,
        },
        {
          path: "/trial-balance",
          label: "Trial Balance",
          icon: <Scale className="w-4 h-4" />,
        },
        {
          path: "/income-statement",
          label: "Income Statement",
          icon: <Receipt className="w-4 h-4" />,
        },
        {
          path: "/balance-sheet",
          label: "Balance Sheet",
          icon: <FileSpreadsheet className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Contacts",
      icon: <Users className="w-4 h-4" />,
      dropdown: "contacts",
      links: [
        {
          path: "/suppliers",
          label: "Suppliers",
          icon: <Truck className="w-4 h-4" />,
        },
        {
          path: "/customers",
          label: "Customers",
          icon: <UsersRound className="w-4 h-4" />,
        },
        {
          path: "/customer-groups",
          label: "Customer Groups",
          icon: <Group className="w-4 h-4" />,
        },
        {
          path: "/operations",
          label: "Operations",
          icon: <Cog className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Settings",
      icon: <Settings className="w-4 h-4" />,
      dropdown: "settings",
      links: [
        {
          path: "/profile",
          label: "Profile",
          icon: <UserCircle className="w-4 h-4" />,
        },
        {
          path: "/account-settings",
          label: "Account Settings",
          icon: <Lock className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 border-r border-gray-600 text-white flex flex-col transition-all duration-300 ${
        isExpanded ? "min-w-64" : "w-16"
      }`}
    >
      {/* Logo and Shop Name */}
      <div
        className={`flex items-center justify-center p-4 h-20 border-b border-gray-600 transition-all duration-300 ${
          isExpanded ? "flex-row" : "flex-col"
        }`}
      >
        <img
          src={"/images/logo.png"}
          alt="Marrabap Ventures"
          className={`w-12 h-12 ${isExpanded ? "mr-3" : "mb-2"}`}
        />
        {isExpanded && <h1 className="text-xl font-bold">{companyName}</h1>}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto">
        {/* Static Menu Items */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 hover:bg-gray-700 ${
              isActive ? "bg-gray-700" : ""
            }`
          }
        >
          <span
            className="text-xl w-5 h-5 flex items-center justify-center"
            title="Dashboard"
          >
            <FaTachometerAlt />
          </span>
          <span
            className={`ml-3 transition-all duration-300 ${
              isExpanded ? "block" : "hidden"
            }`}
          >
            Dashboard
          </span>
        </NavLink>

        {/* Dropdown Menus */}
        {dropdownMenus.map(({ name, icon, dropdown, links }) => (
          <div className="relative" key={dropdown}>
            {/* Dropdown Header */}
            <button
              onClick={() => toggleDropdown(dropdown)}
              className="flex items-center w-full px-4 py-3 hover:bg-gray-700 justify-between"
            >
              <div className="flex items-center">
                <span
                  className="text-xl w-5 h-5 flex items-center justify-center"
                  title={name}
                >
                  {icon}
                </span>
                <span
                  className={`ml-3 transition-all duration-300 ${
                    isExpanded ? "block" : "hidden"
                  }`}
                >
                  {name}
                </span>
              </div>
              {isExpanded && (
                <FaChevronDown
                  className={`transition-transform ${
                    openDropdown === dropdown ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Dropdown Items */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openDropdown === dropdown
                  ? "max-h-60 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col mt-2 bg-gray-700 text-sm rounded-md shadow-lg">
                {links.map(({ path, label, icon }) => (
                  <NavLink to={path} className={dropdownItemClass} key={path}>
                    <span
                      className="w-5 h-5 flex items-center justify-center mr-3"
                      title={label}
                    >
                      {icon}
                    </span>
                    {isExpanded && label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
