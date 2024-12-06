// CartContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        // Update the quantity of the existing item
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      // Add a new item to the cart
      return [...prevCart, { product, quantity }];
    });
  };
  
  const processSale = () => {
    // Logic to update stock
    cart.forEach((item) => {
      // Send an API request to update the stock on the server
      fetch(`http://localhost:5000/products/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock: item.stock - item.quantity,
        }),
      }).catch((error) => console.error("Error updating stock:", error));
    });

    setCart([]); // Clear the cart after sale
  };

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart,processSale }}>
      {children}
    </CartContext.Provider>
  );
};
