import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaStore, FaCogs, FaUser, FaKey } from 'react-icons/fa';
import logo from '../images/Logo.png'
const Sidebar = () => {
  const [settingsOpen, setSettingsOpen] = useState(false); // State for dropdown toggle
  const [isExpanded, setIsExpanded] = useState(true); // State for sidebar expansion
  const [isMobile, setIsMobile] = useState(false); // State to track mobile screen size

  // Update isMobile state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsExpanded(false); // Collapse sidebar on mobile by default
      } else {
        setIsMobile(false);
        setIsExpanded(true); // Expand sidebar on desktop by default
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize); // Listen for window resize

    return () => {
      window.removeEventListener('resize', handleResize); // Clean up listener
    };
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FaTachometerAlt /> },
    { name: 'Shop', path: '/shop', icon: <FaStore /> },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 text-white flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo and Shop Name */}
      <div
        className={`flex items-center justify-center p-4 border-b border-gray-600 transition-all duration-300 ${
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

      {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 border-b border-gray-600 hover:bg-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </button>
      )}

      {/* Menu Items */}
      <nav className="flex-1">
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
            <span className="text-xl">{item.icon}</span>
            <span
              className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'block' : 'hidden'
              }`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}

        {/* Settings with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center w-full px-4 py-3 hover:bg-gray-700"
          >
            <FaCogs className="text-xl" />
            <span
              className={`ml-3 transition-all duration-300 ${
                isExpanded ? 'block' : 'hidden'
              }`}
            >
              Settings
            </span>
            {isExpanded && (
              <svg
                className={`ml-auto transition-transform ${
                  settingsOpen ? 'rotate-180' : 'rotate-0'
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

         {/* Dropdown Items */}
{settingsOpen && (
  <div
    className={`absolute left-0 top-full mt-1 w-full bg-gray-700 text-sm rounded-md shadow-lg overflow-hidden`}
  >
    <NavLink
      to="/profile"
      className="block px-4 py-2 hover:bg-gray-600 flex items-center"
    >
      <FaUser className="mr-3" />
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
      className="block px-4 py-2 hover:bg-gray-600 flex items-center"
    >
      <FaKey className="mr-3" />
      <span
        className={`${
          isExpanded ? 'block' : 'hidden'
        }`}
      >
        Account Settings
      </span>
    </NavLink>
  </div>
)}

        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
