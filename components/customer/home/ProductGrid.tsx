'use client';

import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-4"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductCard {...product} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default ProductGrid;
