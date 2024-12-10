import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaStore, FaCogs, FaUser, FaKey, FaBoxOpen, FaPlusCircle, FaListUl } from 'react-icons/fa';
import logo from '../images/logo.png';

const Sidebar = ({ isExpanded }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FaTachometerAlt /> },
    { name: 'Shop', path: '/shop', icon: <FaStore /> },
  ];

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

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
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 hover:bg-gray-700 ${
                isActive ? 'bg-gray-700' : ''
              }`
            }
          >
            <span className="text-xl w-5 h-5 flex items-center justify-center">{item.icon}</span>
            <span
              className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'block' : 'hidden'
              }`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}

        {/* Products with Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('products')}
            className="flex items-center w-full px-4 py-3 hover:bg-gray-700"
          >
            <span className="text-xl w-5 h-5 flex items-center justify-center"><FaBoxOpen /></span>
            <span
              className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'block' : 'hidden'
              }`}
            >
              Products
            </span>
            {isExpanded && (
              <svg
                className={`ml-auto transition-transform duration-300 ${
                  openDropdown === 'products' ? 'rotate-180' : 'rotate-0'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                width="16"
                height="16"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>

          {/* Products Dropdown Items */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openDropdown === 'products' 
                ? 'max-h-24 opacity-100 visible' 
                : 'max-h-0 opacity-0 invisible'
            }`}
          >
            <div
              className={`flex flex-col space-y-2 mt-2 bg-gray-700 text-sm rounded-md shadow-lg w-full transform transition-transform duration-300 ${
                openDropdown === 'products' 
                  ? 'translate-y-0' 
                  : '-translate-y-4'
              }`}
            >
              <NavLink
                to="/add-product"
                className="block px-6 py-2 hover:bg-gray-600 flex items-center"
              >
                <span className="w-5 h-5 flex items-center justify-center mr-3"><FaPlusCircle /></span>
                <span
                  className={`${
                    isExpanded ? 'block' : 'hidden'
                  }`}
                >
                  Add Products
                </span>
              </NavLink>
              <NavLink
                to="/list-products"
                className="block px-6 py-2 hover:bg-gray-600 flex items-center"
              >
                <span className="w-5 h-5 flex items-center justify-center mr-3"><FaListUl /></span>
                <span
                  className={`${
                    isExpanded ? 'block' : 'hidden'
                  }`}
                >
                  List Products
                </span>
              </NavLink >
            </div>
          </div>
        </div>

        {/* Settings with Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('settings')}
            className="flex items-center w-full px-4 py-3 hover:bg-gray-700"
          >
            <span className="text-xl w-5 h-5 flex items-center justify-center"><FaCogs /></span>
            <span
              className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'block' : 'hidden'
              }`}
            >
              Settings
            </span>
            {isExpanded && (
              <svg
                className={`ml-auto transition-transform duration-300 ${
                  openDropdown === 'settings' ? 'rotate-180' : 'rotate-0'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                width="16"
                height="16"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>

          {/* Settings Dropdown Items */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openDropdown === 'settings' 
                ? 'max-h-24 opacity-100 visible' 
                : 'max-h-0 opacity-0 invisible'
            }`}
          >
            <div
              className={`flex flex-col space-y-2 mt-2 bg-gray-700 text-sm rounded-md shadow-lg w-full transform transition-transform duration-300 ${
                openDropdown === 'settings' 
                  ? 'translate-y-0' 
                  : '-translate-y-4'
              }`}
            >
              <NavLink
                to="/profile"
                className="block px-6 py-2 hover:bg-gray-600 flex items-center"
              >
                <span className="w-5 h-5 flex items-center justify-center mr-3"><FaUser /></span>
                <span
                  className={`${
                    isExpanded ? 'block' : 'hidden'
                  }`}
                >
                  Profile
                </span>
              </NavLink>
              <NavLink
                to="/account-settings"
                className="block px-6 py-2 hover:bg-gray-600 flex items-center"
              >
                <span className="w-5 h-5 flex items-center justify-center mr-3"><FaKey /></span>
                <span
                  className={`${
                    isExpanded ? 'block' : 'hidden'
                  }`}
                >
                  Account Settings
                </span>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;