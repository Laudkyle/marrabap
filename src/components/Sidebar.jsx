import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaStore,
  FaCogs,
  FaUser,
  FaKey,
  FaBoxOpen,
  FaPlusCircle,
  FaListUl,
  FaWarehouse,
  FaMoneyBillWave,
  FaChevronDown,
} from 'react-icons/fa';
import logo from '../images/logo.png';

const Sidebar = ({ isExpanded }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const dropdownItemClass = `block px-6 py-2 hover:bg-gray-600 flex items-center`;

  const dropdownMenus = [
    {
      name: 'Products',
      icon: <FaBoxOpen />,
      dropdown: 'products',
      links: [
        { path: '/add-product', label: 'Add Product', icon: <FaPlusCircle /> },
        { path: '/list-products', label: 'List Products', icon: <FaListUl /> },
      ],
    },
    {
      name: 'Stock',
      icon: <FaWarehouse />,
      dropdown: 'stock',
      links: [
        { path: '/add-stock', label: 'Add Stock', icon: <FaPlusCircle /> },
        { path: '/list-stock', label: 'List Stock', icon: <FaListUl /> },
      ],
    },
    {
      name: 'Expenses',
      icon: <FaMoneyBillWave />,
      dropdown: 'expenses',
      links: [
        { path: '/add-expense', label: 'Add Expense', icon: <FaPlusCircle /> },
        { path: '/list-expenses', label: 'List Expenses', icon: <FaListUl /> },
      ],
    },
    {
      name: 'Settings',
      icon: <FaCogs />,
      dropdown: 'settings',
      links: [
        { path: '/profile', label: 'Profile', icon: <FaUser /> },
        { path: '/account-settings', label: 'Account Settings', icon: <FaKey /> },
      ],
    },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 border-r border-gray-600 text-white flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo and Shop Name */}
      <div
        className={`flex items-center justify-center p-4 h-20 border-b border-gray-600 transition-all duration-300 ${
          isExpanded ? 'flex-row' : 'flex-col'
        }`}
      >
        <img
          src={logo}
          alt="Marrabap Ventures"
          className={`w-12 h-12 ${isExpanded ? 'mr-3' : 'mb-2'}`}
        />
        {isExpanded && <h1 className="text-xl font-bold">Marrabap Ventures</h1>}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto">
        {/* Static Menu Items */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 hover:bg-gray-700 ${
              isActive ? 'bg-gray-700' : ''
            }`
          }
        >
          <span className="text-xl w-5 h-5 flex items-center justify-center">
            <FaTachometerAlt />
          </span>
          <span
            className={`ml-3 transition-all duration-300 ${
              isExpanded ? 'block' : 'hidden'
            }`}
          >
            Dashboard
          </span>
        </NavLink>
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 hover:bg-gray-700 ${
              isActive ? 'bg-gray-700' : ''
            }`
          }
        >
          <span className="text-xl w-5 h-5 flex items-center justify-center">
            <FaStore />
          </span>
          <span
            className={`ml-3 transition-all duration-300 ${
              isExpanded ? 'block' : 'hidden'
            }`}
          >
            Shop
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
                <span className="text-xl w-5 h-5 flex items-center justify-center">{icon}</span>
                <span
                  className={`ml-3 transition-all duration-300 ${
                    isExpanded ? 'block' : 'hidden'
                  }`}
                >
                  {name}
                </span>
              </div>
              {isExpanded && (
                <FaChevronDown
                  className={`transition-transform ${
                    openDropdown === dropdown ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Dropdown Items */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openDropdown === dropdown ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="flex flex-col mt-2 bg-gray-700 text-sm rounded-md shadow-lg">
                {links.map(({ path, label, icon }) => (
                  <NavLink
                    to={path}
                    className={dropdownItemClass}
                    key={path}
                  >
                    <span className="w-5 h-5 flex items-center justify-center mr-3">
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
