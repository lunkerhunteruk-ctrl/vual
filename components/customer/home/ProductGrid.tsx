'use client';

import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: string;
  image?: string;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-4">
      {products.map((product) => (
        <div key={product.id}>
          <ProductCard {...product} />
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;
