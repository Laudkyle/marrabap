import React, { createContext, useContext, useState, useEffect } from "react";
import API from "./api";

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

  const addToCart = (
    product,
    quantity,
    sellingPrice,
    taxes, // Now an array of selected taxes
    discountType,
    discountAmount,
    description
  ) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex !== -1) {
        // Update the quantity and other details of the existing item
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity,
          sellingPrice, // Update price
          taxes, // Store multiple taxes
          discountType,
          discountAmount,
          description,
        };
        return updatedCart;
      }

      // If the product is not in the cart, add it with the specified details
      return [
        ...prevCart,
        {
          product,
          quantity,
          sellingPrice,
          taxes, // Store multiple taxes
          discountType,
          discountAmount,
          description,
        },
      ];
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const processSale = async (referenceNumber, customerId, paymentMethod) => {
    try {
      const salesData = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        reference_number: referenceNumber,
        customer_id: customerId,
        payment_method: paymentMethod,
        selling_price: item.sellingPrice,
        taxes: item.taxes, // Pass multiple taxes
        discount_type: item.discountType,
        discount_amount: item.discountAmount,
        description: item.description,
      }));

      console.log("Sales data:", salesData);

      const response = await API.post("/sales",salesData);

      if (!response.status==201) {
        const errorText = await response.status;
        console.error("Error response text:", errorText);
        throw new Error(`Failed to process sale: ${errorText}`);
      }

      const responseData = await response.data;
      console.log("Sales logged:", responseData);

      return response;
    } catch (error) {
      console.error("Error logging sales:", error.message);
      throw error;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, setCart, addToCart, processSale, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
