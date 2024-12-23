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

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const processSale = () => {
    const salesData = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    fetch("http://localhost:5000/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salesData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((error) => {
            throw new Error(error);
          });
        }
        return res.json();
      })
      .then((response) => {
        console.log("Sales logged:", response);
        clearCart(); // Clear the cart after successful sale
      })
      .catch((error) => {
        console.error("Error logging sales:", error.message);
      });
  };

  const makeSale = async  (selectedProduct, quantity) => {
    try {
      // Log the sale directly
      const saleResponse = await fetch("http://localhost:5000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: quantity,
        }),
      });

      if (!saleResponse.ok) {
        const errorMessage = await saleResponse.text();
        throw new Error(errorMessage);
      }

      const saleDetails = await saleResponse.json();
      console.log("Sale logged successfully:", saleDetails);
    } catch (error) {
      console.error("Error processing sale:", error.message);
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
