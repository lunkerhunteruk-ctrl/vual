export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Stores/Brands (multi-tenant)
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          owner_id?: string
          updated_at?: string
        }
      }
      // Products
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          name_en: string | null
          description: string | null
          description_en: string | null
          category: string
          tags: string[]
          base_price: number
          discounted_price: number | null
          currency: string
          tax_included: boolean
          status: 'draft' | 'published' | 'archived'
          is_highlighted: boolean
          size_specs: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          category: string
          tags?: string[]
          base_price: number
          discounted_price?: number | null
          currency?: string
          tax_included?: boolean
          status?: 'draft' | 'published' | 'archived'
          is_highlighted?: boolean
          size_specs?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          category?: string
          tags?: string[]
          base_price?: number
          discounted_price?: number | null
          currency?: string
          tax_included?: boolean
          status?: 'draft' | 'published' | 'archived'
          is_highlighted?: boolean
          size_specs?: Json | null
          updated_at?: string
        }
      }
      // Product Images
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          color: string | null
          position: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          color?: string | null
          position?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          color?: string | null
          position?: number
          is_primary?: boolean
        }
      }
      // Product Variants (Size x Color combinations)
      product_variants: {
        Row: {
          id: string
          product_id: string
          color: string | null
          size: string | null
          sku: string
          price_override: number | null
          stock: number
          image_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          color?: string | null
          size?: string | null
          sku: string
          price_override?: number | null
          stock?: number
          image_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          color?: string | null
          size?: string | null
          sku?: string
          price_override?: number | null
          stock?: number
          image_id?: string | null
          updated_at?: string
        }
      }
      // Orders
      orders: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          customer_email: string
          customer_name: string
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax: number
          shipping: number
          discount: number
          total: number
          currency: string
          shipping_address: Json
          billing_address: Json | null
          stripe_payment_intent_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          customer_id?: string | null
          customer_email: string
          customer_name: string
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          tax?: number
          shipping?: number
          discount?: number
          total: number
          currency?: string
          shipping_address: Json
          billing_address?: Json | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          customer_id?: string | null
          customer_email?: string
          customer_name?: string
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          subtotal?: number
          tax?: number
          shipping?: number
          discount?: number
          total?: number
          currency?: string
          shipping_address?: Json
          billing_address?: Json | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      // Order Items
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string | null
          product_name: string
          variant_name: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id?: string | null
          product_name: string
          variant_name?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variant_id?: string | null
          product_name?: string
          variant_name?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
        }
      }
      // Customers
      customers: {
        Row: {
          id: string
          store_id: string
          email: string
          name: string
          phone: string | null
          line_user_id: string | null
          total_orders: number
          total_spent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          email: string
          name: string
          phone?: string | null
          line_user_id?: string | null
          total_orders?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          email?: string
          name?: string
          phone?: string | null
          line_user_id?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
      }
      // Coupons
      coupons: {
        Row: {
          id: string
          store_id: string
          code: string
          type: 'percentage' | 'fixed'
          value: number
          min_purchase: number | null
          max_uses: number | null
          used_count: number
          starts_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          code: string
          type: 'percentage' | 'fixed'
          value: number
          min_purchase?: number | null
          max_uses?: number | null
          used_count?: number
          starts_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          code?: string
          type?: 'percentage' | 'fixed'
          value?: number
          min_purchase?: number | null
          max_uses?: number | null
          used_count?: number
          starts_at?: string | null
          expires_at?: string | null
          is_active?: boolean
        }
      }
      // AI Generated Images
      ai_generated_images: {
        Row: {
          id: string
          store_id: string
          product_id: string | null
          type: 'vton' | 'gemini'
          prompt: string | null
          settings: Json
          image_url: string
          cost_yen: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id?: string | null
          type: 'vton' | 'gemini'
          prompt?: string | null
          settings: Json
          image_url: string
          cost_yen: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string | null
          type?: 'vton' | 'gemini'
          prompt?: string | null
          settings?: Json
          image_url?: string
          cost_yen?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Store = Database['public']['Tables']['stores']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Coupon = Database['public']['Tables']['coupons']['Row']
export type AIGeneratedImage = Database['public']['Tables']['ai_generated_images']['Row']

// Insert types
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert']
export type ProductImageInsert = Database['public']['Tables']['product_images']['Insert']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
