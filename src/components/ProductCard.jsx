import React from 'react';

const ProductCard = ({ product }) => {
  return (
    <div className="max-w-sm rounded overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-transform duration-200">
      <div className="p-4">
        {/* Product Image */}
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-48 object-cover rounded-md mb-4" 
          />
        ) : (
          <div 
            className="w-full bg-gray-300 h-48 flex items-center justify-center rounded-md mb-4 text-gray-500 text-sm font-medium"
          >
            Add Product Image
          </div>
        )}

        {/* Product Name and Price */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-md font-semibold text-gray-800">{product.name}</span>
          <span className="text-sm font-semibold text-gray-700">₵{parseFloat(product.sp).toFixed(2)}</span>
        </div>

        {/* Stock Status */}
        <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
