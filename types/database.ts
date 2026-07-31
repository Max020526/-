export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          normalized_name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          normalized_name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          normalized_name?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line: string
          city: string
          country: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string | null
          postal_code: string
        }
        Insert: {
          address_line: string
          city: string
          country: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string | null
          postal_code: string
        }
        Update: {
          address_line?: string
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string | null
          postal_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          low_stock_threshold: number
          online_quantity_limit: number
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          low_stock_threshold?: number
          online_quantity_limit?: number
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          id?: string
          low_stock_threshold?: number
          online_quantity_limit?: number
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          variant_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      online_listings: {
        Row: {
          created_at: string
          description: string
          id: string
          is_bestseller: boolean
          is_featured: boolean
          is_new: boolean
          listing_status: string
          product_id: string
          published_at: string | null
          retail_price: number
          sale_price: number | null
          short_description: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          listing_status?: string
          product_id: string
          published_at?: string | null
          retail_price: number
          sale_price?: number | null
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          listing_status?: string
          product_id?: string
          published_at?: string | null
          retail_price?: number
          sale_price?: number | null
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color_name: string
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_title: string
          quantity: number
          size_name: string
          sku: string
          unit_price: number
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          color_name: string
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_title: string
          quantity: number
          size_name: string
          sku: string
          unit_price: number
          variant_id: string
          warehouse_id: string
        }
        Update: {
          color_name?: string
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_title?: string
          quantity?: number
          size_name?: string
          sku?: string
          unit_price?: number
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_note: string | null
          discount_amount: number
          fulfillment_type: string
          id: string
          idempotency_key: string
          order_no: string
          paid_at: string | null
          payment_status: string
          shipped_at: string | null
          shipping_address: Json | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number
          fulfillment_type: string
          id?: string
          idempotency_key: string
          order_no?: string
          paid_at?: string | null
          payment_status?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number
          total_amount: number
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_amount?: number
          fulfillment_type?: string
          id?: string
          idempotency_key?: string
          order_no?: string
          paid_at?: string | null
          payment_status?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          id: string
          image_type: string
          is_primary: boolean
          product_id: string
          public_url: string
          sort_order: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          id?: string
          image_type: string
          is_primary?: boolean
          product_id: string
          public_url: string
          sort_order?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          id?: string
          image_type?: string
          is_primary?: boolean
          product_id?: string
          public_url?: string
          sort_order?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_relations: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          barcode: string | null
          color_id: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          size_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          size_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          size_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          care_instructions: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          internal_notes: string | null
          material: string | null
          name: string | null
          origin: string | null
          retail_price: number | null
          sale_price: number | null
          season: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"]
          style_no: string
          subtitle: string | null
          suggested_retail_price: number | null
          supplier_id: string | null
          tax_rate: number
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          brand_id?: string | null
          care_instructions?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          material?: string | null
          name?: string | null
          origin?: string | null
          retail_price?: number | null
          sale_price?: number | null
          season?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          style_no: string
          subtitle?: string | null
          suggested_retail_price?: number | null
          supplier_id?: string | null
          tax_rate?: number
          updated_at?: string
          wholesale_price?: number | null
        }
        Update: {
          brand_id?: string | null
          care_instructions?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          material?: string | null
          name?: string | null
          origin?: string | null
          retail_price?: number | null
          sale_price?: number | null
          season?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          style_no?: string
          subtitle?: string | null
          suggested_retail_price?: number | null
          supplier_id?: string | null
          tax_rate?: number
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          reason: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          status: string
          tracking_no: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_no?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          unit_price: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          quantity: number
          unit_price: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shopping_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_carts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          normalized_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          normalized_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          normalized_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          quantity_change: number
          reason: string
          status: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          quantity_change: number
          reason: string
          status?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          quantity_change?: number
          reason?: string
          status?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_exceptions: {
        Row: {
          created_at: string
          exception_type: string
          id: string
          item_id: string | null
          message: string
          receipt_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          exception_type: string
          id?: string
          item_id?: string | null
          message: string
          receipt_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          exception_type?: string
          id?: string
          item_id?: string | null
          message?: string
          receipt_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_exceptions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_exceptions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_items: {
        Row: {
          created_at: string
          difference_quantity: number | null
          expected_quantity: number | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          normalized_color: string
          normalized_size: string
          normalized_style_no: string
          notes: string | null
          product_id: string | null
          raw_color: string | null
          raw_line_number: number | null
          raw_size: string | null
          raw_style_no: string
          receipt_id: string
          received_quantity: number | null
          status: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          difference_quantity?: number | null
          expected_quantity?: number | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          normalized_color: string
          normalized_size: string
          normalized_style_no: string
          notes?: string | null
          product_id?: string | null
          raw_color?: string | null
          raw_line_number?: number | null
          raw_size?: string | null
          raw_style_no: string
          receipt_id: string
          received_quantity?: number | null
          status?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          difference_quantity?: number | null
          expected_quantity?: number | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          normalized_color?: string
          normalized_size?: string
          normalized_style_no?: string
          notes?: string | null
          product_id?: string | null
          raw_color?: string | null
          raw_line_number?: number | null
          raw_size?: string | null
          raw_style_no?: string
          receipt_id?: string
          received_quantity?: number | null
          status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_raw_lines: {
        Row: {
          created_at: string
          error_reason: string | null
          id: string
          line_number: number
          parse_status: string
          raw_text: string
          receipt_id: string
          recognized_data: Json | null
        }
        Insert: {
          created_at?: string
          error_reason?: string | null
          id?: string
          line_number: number
          parse_status?: string
          raw_text: string
          receipt_id: string
          recognized_data?: Json | null
        }
        Update: {
          created_at?: string
          error_reason?: string | null
          id?: string
          line_number?: number
          parse_status?: string
          raw_text?: string
          receipt_id?: string
          recognized_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_raw_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          exception_count: number
          expected_quantity: number
          id: string
          notes: string | null
          receipt_date: string
          receipt_no: string
          received_quantity: number
          source_file_url: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          supplier_id: string | null
          warehouse_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          exception_count?: number
          expected_quantity?: number
          id?: string
          notes?: string | null
          receipt_date?: string
          receipt_no?: string
          received_quantity?: number
          source_file_url?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          supplier_id?: string | null
          warehouse_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          exception_count?: number
          expected_quantity?: number
          id?: string
          notes?: string | null
          receipt_date?: string
          receipt_no?: string
          received_quantity?: number
          source_file_url?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          supplier_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_stock_receipt: { Args: { p_receipt_id: string }; Returns: Json }
      create_online_order: {
        Args: {
          p_customer_note: string
          p_fulfillment_type: string
          p_idempotency_key: string
          p_items: Json
          p_shipping_address: Json
          p_shipping_fee: number
        }
        Returns: Json
      }
      publish_product: { Args: { p_product_id: string }; Returns: Json }
      set_inventory_online_limit: {
        Args: { p_inventory_id: string; p_limit: number }
        Returns: Json
      }
      transition_order_inventory: {
        Args: {
          p_order_id: string
          p_target_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      transition_order_status: {
        Args: {
          p_order_id: string
          p_target_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      unpublish_product: { Args: { p_product_id: string }; Returns: Json }
    }
    Enums: {
      match_type:
        | "NEW_PRODUCT"
        | "NEW_COLOR_VARIANT"
        | "NEW_SIZE_VARIANT"
        | "RESTOCK_EXISTING_SKU"
        | "PENDING"
      movement_type:
        | "PURCHASE_IN"
        | "ONLINE_SALE"
        | "WHOLESALE_SALE"
        | "CUSTOMER_RETURN"
        | "SUPPLIER_RETURN"
        | "DAMAGE"
        | "STOCKTAKE_ADJUSTMENT"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
      order_status:
        | "PENDING_PAYMENT"
        | "PAID"
        | "PICKING"
        | "PACKED"
        | "READY_FOR_PICKUP"
        | "SHIPPED"
        | "COMPLETED"
        | "CANCELLED"
        | "REFUND_REQUESTED"
        | "REFUNDED"
      product_status:
        | "DRAFT"
        | "PENDING_DETAILS"
        | "PENDING_IMAGES"
        | "PENDING_PRICE"
        | "PENDING_REVIEW"
        | "READY_TO_PUBLISH"
        | "PUBLISHED"
        | "SOLD_OUT"
        | "UNPUBLISHED"
        | "ARCHIVED"
      receipt_status:
        | "DRAFT"
        | "PARSING"
        | "PENDING_REVIEW"
        | "RECEIVING"
        | "HAS_EXCEPTIONS"
        | "READY_TO_CONFIRM"
        | "COMPLETED"
        | "CANCELLED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_type: [
        "NEW_PRODUCT",
        "NEW_COLOR_VARIANT",
        "NEW_SIZE_VARIANT",
        "RESTOCK_EXISTING_SKU",
        "PENDING",
      ],
      movement_type: [
        "PURCHASE_IN",
        "ONLINE_SALE",
        "WHOLESALE_SALE",
        "CUSTOMER_RETURN",
        "SUPPLIER_RETURN",
        "DAMAGE",
        "STOCKTAKE_ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
      ],
      order_status: [
        "PENDING_PAYMENT",
        "PAID",
        "PICKING",
        "PACKED",
        "READY_FOR_PICKUP",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "REFUND_REQUESTED",
        "REFUNDED",
      ],
      product_status: [
        "DRAFT",
        "PENDING_DETAILS",
        "PENDING_IMAGES",
        "PENDING_PRICE",
        "PENDING_REVIEW",
        "READY_TO_PUBLISH",
        "PUBLISHED",
        "SOLD_OUT",
        "UNPUBLISHED",
        "ARCHIVED",
      ],
      receipt_status: [
        "DRAFT",
        "PARSING",
        "PENDING_REVIEW",
        "RECEIVING",
        "HAS_EXCEPTIONS",
        "READY_TO_CONFIRM",
        "COMPLETED",
        "CANCELLED",
      ],
    },
  },
} as const

