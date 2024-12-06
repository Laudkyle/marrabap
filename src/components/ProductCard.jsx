import React from 'react';

const ProductCard = ({ product }) => {
  return (
    <div className="max-w-sm rounded overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-transform duration-200">
      <div className="p-4">
        {/* Product Image */}
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-48 object-cover rounded-md mb-4" 
        />
        {/* Product Price */}
        <p className="text-xl font-semibold mb-2">Price: ${product.sp}</p>
        {/* Stock Status */}
        <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
