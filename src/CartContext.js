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
  }, [cart,setCart]);

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

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const processSale = async (referenceNumber) => {
    try {
      const salesData = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        reference_number: referenceNumber,
      }));
  
      // Sending the request
      const response = await fetch("http://localhost:5000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salesData),
      });
  
      // Check if the response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response text:", errorText); // Log the raw response
        throw new Error(`Failed to process sale: ${errorText}`);
      }
  
      // Attempt to parse the response if successful
      const responseData = await response.json();
      console.log("Sales logged:", responseData);
      
      return response; // Return the response for further handling

    } catch (error) {
      console.error("Error logging sales:", error.message);
      throw error; // Rethrow to propagate the error for higher-level handling
    }
  };
  const makeSale = async (selectedProduct, quantity, referenceNumber) => {
    try {
      // Log the sale with the reference number
      const saleResponse = await fetch("http://localhost:5000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: quantity,
          reference_number: referenceNumber, // Add reference number to sale
        }),
      });
  
      // Check if the response is OK (200 or 201)
      if (!saleResponse.ok) {
        const errorMessage = await saleResponse.text();
        console.error("Error response text:", errorMessage); // Log the raw response
        throw new Error(`Failed to log sale: ${errorMessage}`);
      }
  
      // Attempt to parse the response if the request is successful
      const saleDetails = await saleResponse.json();
      console.log("Sale logged successfully:", saleDetails);
  
      return saleResponse; // Return the saleResponse for further validation if needed
  
    } catch (error) {
      console.error("Error processing sale:", error.message);
      throw error; // Rethrow the error to be handled at a higher level
    }
  };
  

  return (
    <CartContext.Provider
      value={{ cart, setCart, addToCart, processSale, makeSale, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
