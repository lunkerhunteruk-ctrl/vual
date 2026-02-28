// Core data types for VUAL

// User & Auth
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'staff' | 'customer';
  shopId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  lineUserId?: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  addresses: Address[];
  orderCount: number;
  totalSpent: number;
  isVip: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastPurchaseAt?: Date;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
  isDefault: boolean;
}

// Shop
export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoURL?: string;
  coverURL?: string;
  theme: 'vual' | 'modern' | 'organic' | 'street' | 'elegant';
  currency: string;
  locale: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    line?: string;
  };
  settings: ShopSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopSettings {
  enableLiveCommerce: boolean;
  enableAIStudio: boolean;
  enableVTON: boolean;
  shippingMethods: ShippingMethod[];
  paymentMethods: PaymentMethod[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'cod' | 'bank_transfer' | 'convenience_store';
  name: string;
  isActive: boolean;
}

// Products
export interface Product {
  id: string;
  shopId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: string[];
  tags: string[];
  brand?: string;
  materials?: string;
  care?: string;
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  seoTitle?: string;
  seoDescription?: string;
  isPublished: boolean;
  isFeatured: boolean;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  aiGeneratedImages?: AIGeneratedImage[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stockQuantity: number;
  options: {
    color?: string;
    size?: string;
    [key: string]: string | undefined;
  };
  image?: ProductImage;
}

export interface AIGeneratedImage {
  id: string;
  url: string;
  type: 'model_casting' | 'vton';
  settings?: Record<string, unknown>;
  createdAt: Date;
}

// Orders
export interface Order {
  id: string;
  orderNumber: string;
  shopId: string;
  customerId: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod: string;
  trackingNumber?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  total: number;
  image?: string;
  options?: {
    color?: string;
    size?: string;
    [key: string]: string | undefined;
  };
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

// Transactions
export interface Transaction {
  id: string;
  orderId: string;
  shopId: string;
  type: 'payment' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  paymentProvider: string;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Live Streams
export interface LiveStream {
  id: string;
  shopId: string;
  title: string;
  description?: string;
  thumbnailURL?: string;
  status: 'scheduled' | 'live' | 'ended' | 'test';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  viewerCount: number;
  peakViewerCount: number;
  likeCount?: number;
  playbackId?: string;
  streamKey?: string;
  products: string[]; // Product IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveComment {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt: Date;
}

// Coupons
export interface Coupon {
  id: string;
  shopId: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Brands
export interface Brand {
  id: string;
  shopId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  logo?: string;
  website?: string;
  description?: string;
  productCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Reviews
export interface Review {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

// Roles & Permissions
export interface Role {
  id: string;
  shopId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  shopId: string;
  userId: string;
  email: string;
  name: string;
  avatar?: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'invited' | 'inactive';
  invitedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Media
export interface MediaItem {
  id: string;
  shopId: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  productId?: string;
  productName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cart (client-side state)
export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  options?: {
    color?: string;
    size?: string;
    [key: string]: string | undefined;
  };
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode?: string;
}

// Blog Posts
export interface BlogPost {
  id: string;
  shopId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
  };
  readTime: number; // in minutes
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Collections (for homepage)
export interface Collection {
  id: string;
  shopId: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  products: string[]; // Product IDs
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
