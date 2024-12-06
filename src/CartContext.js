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
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex !== -1) {
        // Update the quantity of the existing item, ensuring the product data remains intact
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity,
        };
        return updatedCart;
      }

      // If the product is not in the cart, add it with the specified quantity
      return [...prevCart, { product, quantity }];
    });
  };

  const processSale = () => {
    cart.forEach((item) => {
      // Fetch the current product data first
      fetch(`http://localhost:5000/products/${item.product.id}`)
        .then((response) => response.json())
        .then((currentProduct) => {
          if (!currentProduct) {
            console.error(`Product with ID ${item.product.id} not found`);
            return;
          }

          // Calculate the new stock
          const updatedStock = currentProduct.stock - item.quantity;
          if (updatedStock < 0) {
            console.error(`Not enough stock for product ${item.product.name}`);
            return; 
          }

          // Update stock while preserving other fields
          fetch(`http://localhost:5000/products/${item.product.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: currentProduct.name, // Keep the same name
              cp: currentProduct.cp, // Keep the same cp
              sp: currentProduct.sp, // Keep the same sp
              stock: updatedStock, // Update stock only
            }),
          })
            .then((response) => response.json())
            .then(() => {
              console.log(`Stock for product ${item.product.name} updated`);
            })
            .catch((error) => console.error("Error updating stock:", error));
        })
        .catch((error) => console.error("Error fetching product:", error));
    });
  };


  const makeSale = async (selectedProduct, quantity) => {
    try {
      // Fetch the current product data
      const response = await fetch(`http://localhost:5000/products/${selectedProduct.id}`);
      const currentProduct = await response.json();
  
      if (!currentProduct) {
        console.error(`Product with ID ${selectedProduct.id} not found`);
        return;
      }
  
      // Calculate the new stock
      const updatedStock = currentProduct.stock - quantity;
      if (updatedStock < 0) {
        console.error(`Not enough stock for product ${selectedProduct.name}`);
        return; // If there isn't enough stock, don't proceed
      }
  
      // Update stock while preserving other fields
      const updateResponse = await fetch(`http://localhost:5000/products/${selectedProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: currentProduct.name, // Keep the same name
          cp: currentProduct.cp, // Keep the same cp
          sp: currentProduct.sp, // Keep the same sp
          stock: updatedStock, // Update stock only
        }),
      });
  
      if (!updateResponse.ok) {
        console.error("Error updating product stock");
        return;
      }
  
      console.log(`Stock for product ${selectedProduct.name} updated`);
  
  
    } catch (error) {
      console.error("Error processing sale:", error);
    }
  };
  
  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, processSale, makeSale }}>
      {children}
    </CartContext.Provider>
  );
};
