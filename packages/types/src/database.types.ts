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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          organization_id: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          movement_type: string
          organization_id: string
          pos_session_id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          movement_type: string
          organization_id: string
          pos_session_id: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: string
          organization_id?: string
          pos_session_id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          organization_id: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["category_id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string
          code: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel_type: string
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          code: string | null
          created_at: string
          hex_value: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          normalized_name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          hex_value?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          normalized_name: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          hex_value?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          normalized_name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          customer_id: string
          full_name: string | null
          id: string
          is_default: boolean
          label: string | null
          phone: string | null
          postal_code: string
          region: string | null
          updated_at: string
        }
        Insert: {
          address_line: string
          address_line_2?: string | null
          city: string
          country: string
          created_at?: string
          customer_id: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string
          region?: string | null
          updated_at?: string
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
          marketing_consent: boolean
          marketing_consent_at: string | null
          phone: string | null
          preferred_locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_invitations: {
        Row: {
          created_at: string
          email: string
          employee_name: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role_id: string
          status: string
          token: string
          token_hash: string
          updated_at: string
          used_at: string | null
          used_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          employee_name: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role_id: string
          status?: string
          token: string
          token_hash: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          employee_name?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role_id?: string
          status?: string
          token?: string
          token_hash?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          category_scope: string
          created_at: string
          email: string
          employee_name: string
          invited_by: string | null
          organization_id: string
          status: string
          updated_at: string
          user_id: string
          warehouse_scope: string
        }
        Insert: {
          category_scope?: string
          created_at?: string
          email: string
          employee_name: string
          invited_by?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
          warehouse_scope?: string
        }
        Update: {
          category_scope?: string
          created_at?: string
          email?: string
          employee_name?: string
          invited_by?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_path: string | null
          category: string
          created_at: string
          created_by: string
          currency: string
          description: string
          expense_date: string
          expense_no: string
          id: string
          net_amount: number
          organization_id: string
          paid_at: string | null
          status: string
          supplier_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_path?: string | null
          category: string
          created_at?: string
          created_by: string
          currency?: string
          description: string
          expense_date: string
          expense_no: string
          id?: string
          net_amount: number
          organization_id: string
          paid_at?: string | null
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          total_amount: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_path?: string | null
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string
          expense_date?: string
          expense_no?: string
          id?: string
          net_amount?: number
          organization_id?: string
          paid_at?: string | null
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          actor_id: string | null
          amount: number
          channel_id: string | null
          created_at: string
          currency: string
          description: string | null
          direction: string
          entry_type: string
          id: string
          idempotency_key: string
          location_id: string | null
          occurred_at: string
          organization_id: string
          reversal_of: string | null
          source_id: string
          source_no: string | null
          source_type: string
          status: string
          tax_amount: number
        }
        Insert: {
          actor_id?: string | null
          amount: number
          channel_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction: string
          entry_type: string
          id?: string
          idempotency_key: string
          location_id?: string | null
          occurred_at: string
          organization_id: string
          reversal_of?: string | null
          source_id: string
          source_no?: string | null
          source_type: string
          status?: string
          tax_amount?: number
        }
        Update: {
          actor_id?: string | null
          amount?: number
          channel_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          entry_type?: string
          id?: string
          idempotency_key?: string
          location_id?: string | null
          occurred_at?: string
          organization_id?: string
          reversal_of?: string | null
          source_id?: string
          source_no?: string | null
          source_type?: string
          status?: string
          tax_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "financial_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_exceptions: {
        Row: {
          created_at: string
          created_by: string
          exception_type: string
          id: string
          notes: string
          order_id: string
          order_item_id: string | null
          organization_id: string
          quantity: number | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          shipment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exception_type: string
          id?: string
          notes: string
          order_id: string
          order_item_id?: string | null
          organization_id: string
          quantity?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exception_type?: string
          id?: string
          notes?: string
          order_id?: string
          order_item_id?: string | null
          organization_id?: string
          quantity?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_order_items: {
        Row: {
          color_id: string
          created_at: string
          id: string
          inbound_order_id: string
          organization_id: string
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          size_id: string
          sku: string
          variant_id: string
        }
        Insert: {
          color_id: string
          created_at?: string
          id?: string
          inbound_order_id: string
          organization_id?: string
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          size_id: string
          sku: string
          variant_id: string
        }
        Update: {
          color_id?: string
          created_at?: string
          id?: string
          inbound_order_id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          size_id?: string
          sku?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_order_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["color_id"]
          },
          {
            foreignKeyName: "inbound_order_items_inbound_order_id_fkey"
            columns: ["inbound_order_id"]
            isOneToOne: false
            referencedRelation: "inbound_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["size_id"]
          },
          {
            foreignKeyName: "inbound_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_orders: {
        Row: {
          arrival_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          inbound_number: string
          notes: string | null
          organization_id: string
          status: string
          supplier_id: string | null
          supplier_reference: string | null
          total_quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          arrival_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          inbound_number: string
          notes?: string | null
          organization_id?: string
          status?: string
          supplier_id?: string | null
          supplier_reference?: string | null
          total_quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          arrival_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          inbound_number?: string
          notes?: string | null
          organization_id?: string
          status?: string
          supplier_id?: string | null
          supplier_reference?: string | null
          total_quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_orders_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          average_unit_cost: number
          id: string
          low_stock_threshold: number
          online_quantity_limit: number
          organization_id: string
          quantity_available: number | null
          quantity_damaged: number
          quantity_on_hand: number
          quantity_quarantined: number
          quantity_reserved: number
          safety_stock: number
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          average_unit_cost?: number
          id?: string
          low_stock_threshold?: number
          online_quantity_limit?: number
          organization_id?: string
          quantity_available?: number | null
          quantity_damaged?: number
          quantity_on_hand?: number
          quantity_quarantined?: number
          quantity_reserved?: number
          safety_stock?: number
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          average_unit_cost?: number
          id?: string
          low_stock_threshold?: number
          online_quantity_limit?: number
          organization_id?: string
          quantity_available?: number | null
          quantity_damaged?: number
          quantity_on_hand?: number
          quantity_quarantined?: number
          quantity_reserved?: number
          safety_stock?: number
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          balance_dimension: string
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          organization_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          request_id: string | null
          reserved_after: number | null
          reserved_before: number | null
          unit_cost_snapshot: number | null
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          balance_dimension?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          organization_id?: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          request_id?: string | null
          reserved_after?: number | null
          reserved_before?: number | null
          unit_cost_snapshot?: number | null
          variant_id: string
          warehouse_id: string
        }
        Update: {
          balance_dimension?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          organization_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          request_id?: string | null
          reserved_after?: number | null
          reserved_before?: number | null
          unit_cost_snapshot?: number | null
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
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          {
            foreignKeyName: "online_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          event_type: string
          id: string
          internal_data: Json
          occurred_at: string
          order_id: string
          organization_id: string
          public_message_zh: string | null
          request_id: string | null
        }
        Insert: {
          actor_id?: string | null
          event_type: string
          id?: string
          internal_data?: Json
          occurred_at?: string
          order_id: string
          organization_id: string
          public_message_zh?: string | null
          request_id?: string | null
        }
        Update: {
          actor_id?: string | null
          event_type?: string
          id?: string
          internal_data?: Json
          occurred_at?: string
          order_id?: string
          organization_id?: string
          public_message_zh?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cogs_amount: number
          color_name: string
          created_at: string
          currency: string
          discount_amount: number
          gross_profit_amount: number
          id: string
          image_media_id: string | null
          line_total: number
          order_id: string
          product_id: string | null
          product_slug: string | null
          product_title: string
          quantity: number
          size_name: string
          sku: string
          tax_amount: number
          unit_cost_snapshot: number
          unit_price: number
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          cogs_amount?: number
          color_name: string
          created_at?: string
          currency?: string
          discount_amount?: number
          gross_profit_amount?: number
          id?: string
          image_media_id?: string | null
          line_total: number
          order_id: string
          product_id?: string | null
          product_slug?: string | null
          product_title: string
          quantity: number
          size_name: string
          sku: string
          tax_amount?: number
          unit_cost_snapshot?: number
          unit_price: number
          variant_id: string
          warehouse_id: string
        }
        Update: {
          cogs_amount?: number
          color_name?: string
          created_at?: string
          currency?: string
          discount_amount?: number
          gross_profit_amount?: number
          id?: string
          image_media_id?: string | null
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_slug?: string | null
          product_title?: string
          quantity?: number
          size_name?: string
          sku?: string
          tax_amount?: number
          unit_cost_snapshot?: number
          unit_price?: number
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "product_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
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
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      order_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          note_type: string
          order_id: string
          organization_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          note_type?: string
          order_id: string
          organization_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          note_type?: string
          order_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address_snapshot: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          channel_id: string | null
          completed_at: string | null
          confirmed_at: string | null
          contact_snapshot: Json
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_note: string | null
          customer_phone: string | null
          delivered_at: string | null
          discount_amount: number
          expired_at: string | null
          expires_at: string | null
          fulfillment_status: string
          fulfillment_type: string
          guest_session_hash: string | null
          id: string
          idempotency_key: string
          lifecycle_status: string
          lookup_token_hash: string | null
          order_no: string
          organization_id: string | null
          paid_at: string | null
          payment_adapter: string
          payment_status: string
          picked_up_at: string | null
          pos_session_id: string | null
          priority: number
          processing_at: string | null
          ready_pickup_at: string | null
          request_id: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_address_snapshot: Json | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_address_snapshot?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_snapshot?: Json
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_note?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number
          expired_at?: string | null
          expires_at?: string | null
          fulfillment_status?: string
          fulfillment_type: string
          guest_session_hash?: string | null
          id?: string
          idempotency_key: string
          lifecycle_status?: string
          lookup_token_hash?: string | null
          order_no?: string
          organization_id?: string | null
          paid_at?: string | null
          payment_adapter?: string
          payment_status?: string
          picked_up_at?: string | null
          pos_session_id?: string | null
          priority?: number
          processing_at?: string | null
          ready_pickup_at?: string | null
          request_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_address_snapshot?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number
          total_amount: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_address_snapshot?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_snapshot?: Json
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_note?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number
          expired_at?: string | null
          expires_at?: string | null
          fulfillment_status?: string
          fulfillment_type?: string
          guest_session_hash?: string | null
          id?: string
          idempotency_key?: string
          lifecycle_status?: string
          lookup_token_hash?: string | null
          order_no?: string
          organization_id?: string | null
          paid_at?: string | null
          payment_adapter?: string
          payment_status?: string
          picked_up_at?: string | null
          pos_session_id?: string | null
          priority?: number
          processing_at?: string | null
          ready_pickup_at?: string | null
          request_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_address_snapshot?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          available_at: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          organization_id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          available_at?: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          organization_id: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          available_at?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string | null
          order_id: string
          organization_id: string
          paid_at: string | null
          payment_method: string
          provider: string | null
          provider_reference: string | null
          refunded_amount: number
          status: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string | null
          order_id: string
          organization_id: string
          paid_at?: string | null
          payment_method?: string
          provider?: string | null
          provider_reference?: string | null
          refunded_amount?: number
          status: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string
          organization_id?: string
          paid_at?: string | null
          payment_method?: string
          provider?: string | null
          provider_reference?: string | null
          refunded_amount?: number
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          module: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          cash_difference: number | null
          cash_in: number
          cash_out: number
          cash_sales: number
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string
          difference_reason: string | null
          expected_cash: number | null
          id: string
          non_cash_sales: number
          opened_at: string
          opened_by: string
          opening_cash: number
          organization_id: string
          session_no: string
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cash_difference?: number | null
          cash_in?: number
          cash_out?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          difference_reason?: string | null
          expected_cash?: number | null
          id?: string
          non_cash_sales?: number
          opened_at?: string
          opened_by: string
          opening_cash: number
          organization_id: string
          session_no: string
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cash_difference?: number | null
          cash_in?: number
          cash_out?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          difference_reason?: string | null
          expected_cash?: number | null
          id?: string
          non_cash_sales?: number
          opened_at?: string
          opened_by?: string
          opening_cash?: number
          organization_id?: string
          session_no?: string
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      price_book_items: {
        Row: {
          compare_at_price: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          price_book_id: string
          product_id: string
          unit_price: number
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
          variant_id: string | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          price_book_id: string
          product_id: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_id?: string | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          price_book_id?: string
          product_id?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_book_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_books: {
        Row: {
          channel_id: string
          code: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          channel_id: string
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          channel_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_books_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_books_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "price_books_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_books_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_books_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text_en: string | null
          alt_text_it: string | null
          alt_text_zh: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          file_path: string
          file_size_bytes: number | null
          height: number | null
          id: string
          image_type: string
          is_primary: boolean
          mime_type: string | null
          organization_id: string
          product_id: string
          public_url: string
          sort_order: number
          storage_path: string | null
          updated_at: string
          updated_by: string | null
          variant_id: string | null
          width: number | null
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_it?: string | null
          alt_text_zh?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_path: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_type: string
          is_primary?: boolean
          mime_type?: string | null
          organization_id?: string
          product_id: string
          public_url: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text_en?: string | null
          alt_text_it?: string | null
          alt_text_zh?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_path?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_type?: string
          is_primary?: boolean
          mime_type?: string | null
          organization_id?: string
          product_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_id?: string | null
          width?: number | null
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
            foreignKeyName: "product_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_publications: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string | null
          id: string
          last_validated_at: string | null
          organization_id: string
          product_id: string
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: string
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          validation_errors: Json
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_validated_at?: string | null
          organization_id: string
          product_id: string
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_validated_at?: string | null
          organization_id?: string
          product_id?: string
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_publications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "product_publications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "product_tag_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
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
          is_visible_online: boolean
          organization_id: string
          product_id: string
          size_id: string
          sku: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          barcode?: string | null
          color_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_visible_online?: boolean
          organization_id?: string
          product_id: string
          size_id: string
          sku: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          barcode?: string | null
          color_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_visible_online?: boolean
          organization_id?: string
          product_id?: string
          size_id?: string
          sku?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["color_id"]
          },
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["size_id"]
          },
          {
            foreignKeyName: "product_variants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          brand: string | null
          brand_id: string | null
          care_instructions: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          description_en: string | null
          description_it: string | null
          description_zh: string | null
          elasticity: string | null
          fit: string | null
          gender: string | null
          id: string
          internal_name: string | null
          internal_notes: string | null
          is_bestseller: boolean
          is_featured: boolean
          is_new: boolean
          material: string | null
          model_number: string
          name: string | null
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          organization_id: string
          origin: string | null
          origin_country: string | null
          promotional_price: number | null
          retail_price: number | null
          sale_price: number | null
          season: string | null
          seo_description: string | null
          seo_description_en: string | null
          seo_description_it: string | null
          seo_description_zh: string | null
          seo_title: string | null
          seo_title_en: string | null
          seo_title_it: string | null
          seo_title_zh: string | null
          short_description: string | null
          short_description_en: string | null
          short_description_it: string | null
          short_description_zh: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"]
          style_no: string
          subcategory_id: string | null
          subtitle: string | null
          suggested_retail_price: number | null
          supplier_id: string | null
          tax_rate: number
          thickness: string | null
          updated_at: string
          updated_by: string | null
          washing_instructions: string | null
          wholesale_price: number | null
          workflow_status: string
          year: number | null
        }
        Insert: {
          archived_at?: string | null
          brand?: string | null
          brand_id?: string | null
          care_instructions?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          description_en?: string | null
          description_it?: string | null
          description_zh?: string | null
          elasticity?: string | null
          fit?: string | null
          gender?: string | null
          id?: string
          internal_name?: string | null
          internal_notes?: string | null
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          material?: string | null
          model_number: string
          name?: string | null
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          origin?: string | null
          origin_country?: string | null
          promotional_price?: number | null
          retail_price?: number | null
          sale_price?: number | null
          season?: string | null
          seo_description?: string | null
          seo_description_en?: string | null
          seo_description_it?: string | null
          seo_description_zh?: string | null
          seo_title?: string | null
          seo_title_en?: string | null
          seo_title_it?: string | null
          seo_title_zh?: string | null
          short_description?: string | null
          short_description_en?: string | null
          short_description_it?: string | null
          short_description_zh?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          style_no: string
          subcategory_id?: string | null
          subtitle?: string | null
          suggested_retail_price?: number | null
          supplier_id?: string | null
          tax_rate?: number
          thickness?: string | null
          updated_at?: string
          updated_by?: string | null
          washing_instructions?: string | null
          wholesale_price?: number | null
          workflow_status?: string
          year?: number | null
        }
        Update: {
          archived_at?: string | null
          brand?: string | null
          brand_id?: string | null
          care_instructions?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          description_en?: string | null
          description_it?: string | null
          description_zh?: string | null
          elasticity?: string | null
          fit?: string | null
          gender?: string | null
          id?: string
          internal_name?: string | null
          internal_notes?: string | null
          is_bestseller?: boolean
          is_featured?: boolean
          is_new?: boolean
          material?: string | null
          model_number?: string
          name?: string | null
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          organization_id?: string
          origin?: string | null
          origin_country?: string | null
          promotional_price?: number | null
          retail_price?: number | null
          sale_price?: number | null
          season?: string | null
          seo_description?: string | null
          seo_description_en?: string | null
          seo_description_it?: string | null
          seo_description_zh?: string | null
          seo_title?: string | null
          seo_title_en?: string | null
          seo_title_it?: string | null
          seo_title_zh?: string | null
          short_description?: string | null
          short_description_en?: string | null
          short_description_it?: string | null
          short_description_zh?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          style_no?: string
          subcategory_id?: string | null
          subtitle?: string | null
          suggested_retail_price?: number | null
          supplier_id?: string | null
          tax_rate?: number
          thickness?: string | null
          updated_at?: string
          updated_by?: string | null
          washing_instructions?: string | null
          wholesale_price?: number | null
          workflow_status?: string
          year?: number | null
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          organization_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          created_by: string
          id: string
          line_net: number
          line_tax: number
          line_total: number
          ordered_quantity: number
          organization_id: string
          purchase_order_id: string
          received_quantity: number
          tax_rate: number
          unit_cost: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          line_net: number
          line_tax: number
          line_total: number
          ordered_quantity: number
          organization_id: string
          purchase_order_id: string
          received_quantity?: number
          tax_rate?: number
          unit_cost: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          line_net?: number
          line_tax?: number
          line_total?: number
          ordered_quantity?: number
          organization_id?: string
          purchase_order_id?: string
          received_quantity?: number
          tax_rate?: number
          unit_cost?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          currency: string
          expected_delivery_date: string | null
          id: string
          net_amount: number
          notes: string | null
          ordered_at: string | null
          organization_id: string
          purchase_order_no: string
          status: string
          supplier_id: string
          supplier_reference: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
          ordered_at?: string | null
          organization_id: string
          purchase_order_no: string
          status?: string
          supplier_id: string
          supplier_reference?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
          ordered_at?: string | null
          organization_id?: string
          purchase_order_no?: string
          status?: string
          supplier_id?: string
          supplier_reference?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string
          id: string
          idempotency_key: string
          organization_id: string
          paid_at: string | null
          payment_method: string
          provider_reference: string | null
          purchase_order_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          idempotency_key: string
          organization_id: string
          paid_at?: string | null
          payment_method: string
          provider_reference?: string | null
          purchase_order_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          paid_at?: string | null
          payment_method?: string
          provider_reference?: string | null
          purchase_order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          adapter: string
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          order_id: string
          organization_id: string
          payment_id: string | null
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          reason: string
          requested_at: string
          requested_by: string | null
          return_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adapter?: string
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          organization_id: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason: string
          requested_at?: string
          requested_by?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adapter?: string
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          organization_id?: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason?: string
          requested_at?: string
          requested_by?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          created_at: string
          disposition: string | null
          id: string
          inspection_notes: string | null
          inventory_posted_at: string | null
          item_condition: string | null
          media_paths: Json
          order_item_id: string
          organization_id: string
          quantity: number
          reason: string
          return_id: string
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          disposition?: string | null
          id?: string
          inspection_notes?: string | null
          inventory_posted_at?: string | null
          item_condition?: string | null
          media_paths?: Json
          order_item_id: string
          organization_id: string
          quantity: number
          reason: string
          return_id: string
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          disposition?: string | null
          id?: string
          inspection_notes?: string | null
          inventory_posted_at?: string | null
          item_condition?: string | null
          media_paths?: Json
          order_item_id?: string
          organization_id?: string
          quantity?: number
          reason?: string
          return_id?: string
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_note: string | null
          id: string
          idempotency_key: string | null
          inspected_at: string | null
          inspected_by: string | null
          order_id: string
          organization_id: string
          reason: string | null
          received_at: string | null
          received_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          request_id: string | null
          return_no: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          id?: string
          idempotency_key?: string | null
          inspected_at?: string | null
          inspected_by?: string | null
          order_id: string
          organization_id: string
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_id?: string | null
          return_no: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          id?: string
          idempotency_key?: string | null
          inspected_at?: string | null
          inspected_by?: string | null
          order_id?: string
          organization_id?: string
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_id?: string | null
          return_no?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          code: string
          created_at: string
          description: string | null
          display_name_zh: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_name_zh?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_name_zh?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      shipment_items: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          organization_id: string
          picked_at: string | null
          picked_by: string | null
          picked_quantity: number
          quantity: number
          shipment_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          verified_quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          organization_id: string
          picked_at?: string | null
          picked_by?: string | null
          picked_quantity?: number
          quantity: number
          shipment_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          organization_id?: string
          picked_at?: string | null
          picked_by?: string | null
          picked_quantity?: number
          quantity?: number
          shipment_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          completed_by: string | null
          created_at: string
          delivered_at: string | null
          fulfillment_method: string
          id: string
          idempotency_key: string | null
          notes: string | null
          notified_at: string | null
          order_id: string
          organization_id: string
          packed_at: string | null
          packed_by: string | null
          picked_up_at: string | null
          pickup_code_hash: string | null
          ready_at: string | null
          shipped_at: string | null
          shipped_by: string | null
          status: string
          tracking_no: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          carrier?: string | null
          completed_by?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_method?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          notified_at?: string | null
          order_id: string
          organization_id: string
          packed_at?: string | null
          packed_by?: string | null
          picked_up_at?: string | null
          pickup_code_hash?: string | null
          ready_at?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
          tracking_no?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          carrier?: string | null
          completed_by?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_method?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          notified_at?: string | null
          order_id?: string
          organization_id?: string
          packed_at?: string | null
          packed_by?: string | null
          picked_up_at?: string | null
          pickup_code_hash?: string | null
          ready_at?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
          tracking_no?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_packed_by_fkey"
            columns: ["packed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_shipped_by_fkey"
            columns: ["shipped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          {
            foreignKeyName: "shopping_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
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
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          normalized_name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          normalized_name: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_it?: string | null
          name_zh?: string | null
          normalized_name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sizes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      stock_receipt_attachments: {
        Row: {
          created_at: string
          created_by: string
          detected_data: Json
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ocr_text: string | null
          receipt_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          detected_data?: Json
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ocr_text?: string | null
          receipt_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          detected_data?: Json
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ocr_text?: string | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_attachments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
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
          organization_id: string
          product_id: string | null
          purchase_order_item_id: string | null
          raw_color: string | null
          raw_line_number: number | null
          raw_size: string | null
          raw_style_no: string
          receipt_id: string
          received_quantity: number | null
          source_metadata: Json
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
          organization_id?: string
          product_id?: string | null
          purchase_order_item_id?: string | null
          raw_color?: string | null
          raw_line_number?: number | null
          raw_size?: string | null
          raw_style_no: string
          receipt_id: string
          received_quantity?: number | null
          source_metadata?: Json
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
          organization_id?: string
          product_id?: string | null
          purchase_order_item_id?: string | null
          raw_color?: string | null
          raw_line_number?: number | null
          raw_size?: string | null
          raw_style_no?: string
          receipt_id?: string
          received_quantity?: number | null
          source_metadata?: Json
          status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
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
          {
            foreignKeyName: "stock_receipt_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
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
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          counting_started_at: string | null
          created_at: string
          created_by: string
          exception_count: number
          expected_quantity: number
          id: string
          idempotency_key: string | null
          notes: string | null
          organization_id: string
          posted_at: string | null
          purchase_order_id: string | null
          ready_to_post_at: string | null
          receipt_date: string
          receipt_no: string
          received_quantity: number
          source_file_url: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          supplier_id: string | null
          supplier_reference: string | null
          updated_at: string
          updated_by: string | null
          warehouse_id: string
          workflow_status: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          counting_started_at?: string | null
          created_at?: string
          created_by: string
          exception_count?: number
          expected_quantity?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          organization_id?: string
          posted_at?: string | null
          purchase_order_id?: string | null
          ready_to_post_at?: string | null
          receipt_date?: string
          receipt_no?: string
          received_quantity?: number
          source_file_url?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          supplier_id?: string | null
          supplier_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
          workflow_status?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          counting_started_at?: string | null
          created_at?: string
          created_by?: string
          exception_count?: number
          expected_quantity?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          organization_id?: string
          posted_at?: string | null
          purchase_order_id?: string | null
          ready_to_post_at?: string | null
          receipt_date?: string
          receipt_no?: string
          received_quantity?: number
          source_file_url?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          supplier_id?: string | null
          supplier_reference?: string | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
          workflow_status?: string
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
            foreignKeyName: "stock_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
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
            foreignKeyName: "stock_receipts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      stock_reservations: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          idempotency_key: string
          inventory_id: string
          order_id: string
          order_item_id: string
          organization_id: string
          quantity: number
          released_at: string | null
          status: string
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          idempotency_key: string
          inventory_id: string
          order_id: string
          order_item_id: string
          organization_id: string
          quantity: number
          released_at?: string | null
          status?: string
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          idempotency_key?: string
          inventory_id?: string
          order_id?: string
          order_item_id?: string
          organization_id?: string
          quantity?: number
          released_at?: string | null
          status?: string
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          archived_at: string | null
          contact_name: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          notes: string | null
          organization_id: string
          payment_terms_days: number
          phone: string | null
          supplier_code: string | null
          supplier_name: string | null
          updated_at: string
          updated_by: string | null
          vat_number: string | null
        }
        Insert: {
          archived_at?: string | null
          contact_name?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notes?: string | null
          organization_id?: string
          payment_terms_days?: number
          phone?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
        }
        Update: {
          archived_at?: string | null
          contact_name?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms_days?: number
          phone?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_scopes: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          category_id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          category_id: string
          organization_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          category_id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_scopes_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_scopes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_scopes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "user_category_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_scopes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          effect: string
          permission_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          effect: string
          permission_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          effect?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_warehouses: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          is_active: boolean
          organization_id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          is_active?: boolean
          organization_id: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          is_active?: boolean
          organization_id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warehouses_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          location_type: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fulfillment_queue: {
        Row: {
          carrier: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          fulfillment_status: string | null
          fulfillment_type: string | null
          id: string | null
          lifecycle_status: string | null
          open_exception_count: number | null
          order_no: string | null
          organization_id: string | null
          payment_status: string | null
          priority: number | null
          ready_at: string | null
          shipment_id: string | null
          shipment_status: string | null
          shipped_at: string | null
          total_amount: number | null
          total_quantity: number | null
          tracking_no: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_receipt_lines: {
        Row: {
          color_name: string | null
          created_at: string | null
          id: string | null
          match_type: string | null
          model_code: string | null
          notes: string | null
          organization_id: string | null
          product_id: string | null
          quantity: number | null
          receipt_id: string | null
          size_name: string | null
          status: string | null
          variant_id: string | null
        }
        Relationships: []
      }
      inbound_receipts: {
        Row: {
          arrival_date: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          created_by: string | null
          expected_quantity: number | null
          id: string | null
          idempotency_key: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          organization_id: string | null
          party: string | null
          posted_at: string | null
          posted_by: string | null
          receipt_no: string | null
          received_quantity: number | null
          source_mode: string | null
          status: string | null
          supplier_id: string | null
          supplier_reference: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      inventory_balances: {
        Row: {
          available: number | null
          id: string | null
          location_id: string | null
          low_stock_threshold: number | null
          on_hand: number | null
          organization_id: string | null
          reserved: number | null
          safety_stock: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          available?: never
          id?: string | null
          location_id?: string | null
          low_stock_threshold?: number | null
          on_hand?: number | null
          organization_id?: string | null
          reserved?: number | null
          safety_stock?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          available?: never
          id?: string | null
          location_id?: string | null
          low_stock_threshold?: number | null
          on_hand?: number | null
          organization_id?: string | null
          reserved?: number | null
          safety_stock?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          organization_id: string | null
          type: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          type?: never
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          type?: never
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_operations_summary: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          fulfillment_status: string | null
          fulfillment_type: string | null
          id: string | null
          lifecycle_status: string | null
          open_exception_count: number | null
          order_no: string | null
          organization_id: string | null
          payment_status: string | null
          priority: number | null
          shipment_id: string | null
          total_amount: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          fulfillment_status?: string | null
          fulfillment_type?: string | null
          id?: string | null
          lifecycle_status?: string | null
          open_exception_count?: never
          order_no?: string | null
          organization_id?: string | null
          payment_status?: never
          priority?: number | null
          shipment_id?: never
          total_amount?: number | null
          total_quantity?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          fulfillment_status?: string | null
          fulfillment_type?: string | null
          id?: string | null
          lifecycle_status?: string | null
          open_exception_count?: never
          order_no?: string | null
          organization_id?: string | null
          payment_status?: never
          priority?: number | null
          shipment_id?: never
          total_amount?: number | null
          total_quantity?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_primary: boolean | null
          media_type: string | null
          organization_id: string | null
          product_id: string | null
          sort_order: number | null
          storage_path: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_primary?: boolean | null
          media_type?: string | null
          organization_id?: string | null
          product_id?: string | null
          sort_order?: number | null
          storage_path?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_primary?: boolean | null
          media_type?: string | null
          organization_id?: string | null
          product_id?: string | null
          sort_order?: number | null
          storage_path?: string | null
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
            foreignKeyName: "product_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_media: {
        Row: {
          alt_text: string | null
          height: number | null
          id: string | null
          is_primary: boolean | null
          media_path: string | null
          media_type: string | null
          product_id: string | null
          sort_order: number | null
          variant_id: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_catalog_products: {
        Row: {
          brand_name: string | null
          care_instructions: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          channel_code: string | null
          channel_id: string | null
          compare_at_price: number | null
          currency: string | null
          description: string | null
          fit: string | null
          gender: string | null
          id: string | null
          is_bestseller: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          material: string | null
          name_en: string | null
          name_it: string | null
          published_at: string | null
          season: string | null
          short_description: string | null
          slug: string | null
          style_no: string | null
          title: string | null
          unit_price: number | null
        }
        Relationships: []
      }
      storefront_catalog_variants: {
        Row: {
          available_quantity: number | null
          barcode: string | null
          color_id: string | null
          color_name: string | null
          color_name_en: string | null
          color_name_it: string | null
          hex_value: string | null
          id: string | null
          product_id: string | null
          size_id: string | null
          size_name: string | null
          size_sort_order: number | null
          sku: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_product_media: {
        Row: {
          alt_text_en: string | null
          alt_text_it: string | null
          alt_text_zh: string | null
          height: number | null
          id: string | null
          is_primary: boolean | null
          media_type: string | null
          media_url: string | null
          product_id: string | null
          sort_order: number | null
          variant_id: string | null
          width: number | null
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_it?: string | null
          alt_text_zh?: string | null
          height?: number | null
          id?: string | null
          is_primary?: boolean | null
          media_type?: string | null
          media_url?: never
          product_id?: string | null
          sort_order?: number | null
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text_en?: string | null
          alt_text_it?: string | null
          alt_text_zh?: string | null
          height?: number | null
          id?: string | null
          is_primary?: boolean | null
          media_type?: string | null
          media_url?: never
          product_id?: string | null
          sort_order?: number | null
          variant_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_product_variants: {
        Row: {
          barcode: string | null
          color_id: string | null
          id: string | null
          product_id: string | null
          size_id: string | null
          sku: string | null
          sort_order: number | null
        }
        Insert: {
          barcode?: string | null
          color_id?: string | null
          id?: string | null
          product_id?: string | null
          size_id?: string | null
          sku?: string | null
          sort_order?: number | null
        }
        Update: {
          barcode?: string | null
          color_id?: string | null
          id?: string | null
          product_id?: string | null
          size_id?: string | null
          sku?: string | null
          sort_order?: number | null
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
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["color_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_variants"
            referencedColumns: ["size_id"]
          },
        ]
      }
      storefront_products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          channel_id: string | null
          compare_at_price: number | null
          currency: string | null
          description_en: string | null
          description_it: string | null
          description_zh: string | null
          gender: string | null
          id: string | null
          is_bestseller: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          name_en: string | null
          name_it: string | null
          name_zh: string | null
          published_at: string | null
          season: string | null
          short_description_en: string | null
          short_description_it: string | null
          short_description_zh: string | null
          slug: string | null
          style_no: string | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_publications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_publications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["channel_id"]
          },
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storefront_catalog_products"
            referencedColumns: ["category_id"]
          },
        ]
      }
    }
    Functions: {
      adjust_inventory_stock: {
        Args: {
          p_counted_quantity: number
          p_inventory_id: string
          p_notes?: string
          p_reason: string
        }
        Returns: Json
      }
      cancel_inbound_order: {
        Args: { p_inbound_order_id: string; p_reason: string }
        Returns: Json
      }
      confirm_inbound_order: {
        Args: {
          p_idempotency_key?: string
          p_items: Json
          p_notes?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      confirm_stock_receipt: { Args: { p_receipt_id: string }; Returns: Json }
      create_inbound_color: {
        Args: { p_code?: string; p_hex_value?: string; p_name_zh: string }
        Returns: Json
      }
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
      create_stock_receipt: {
        Args: { p_header: Json; p_items: Json; p_raw_lines: Json }
        Returns: Json
      }
      get_my_authorization: { Args: never; Returns: Json }
      manage_product_image: {
        Args: { p_action: string; p_image_id: string; p_product_id: string }
        Returns: Json
      }
      publish_product: { Args: { p_product_id: string }; Returns: Json }
      rpc_bulk_update_products: {
        Args: { p_action: string; p_product_ids: string[]; p_value?: string }
        Returns: Json
      }
      rpc_business_metrics: {
        Args: {
          p_channel_id?: string
          p_from: string
          p_location_id?: string
          p_to: string
        }
        Returns: Json
      }
      rpc_complete_employee_registration: {
        Args: {
          p_auth_user_id: string
          p_email: string
          p_employee_name: string
          p_token_hash: string
        }
        Returns: Json
      }
      rpc_complete_pos_sale: {
        Args: {
          p_cart: Json
          p_idempotency_key: string
          p_payments: Json
          p_request_id?: string
          p_session_id: string
        }
        Returns: Json
      }
      rpc_consume_order_stock: {
        Args: {
          p_idempotency_key: string
          p_order_id: string
          p_request_id?: string
          p_shipment_id: string
        }
        Returns: Json
      }
      rpc_create_product_draft: { Args: { p_payload: Json }; Returns: Json }
      rpc_create_storefront_order: {
        Args: {
          p_contact: Json
          p_customer_note?: string
          p_fulfillment_method: string
          p_guest_session_id?: string
          p_idempotency_key?: string
          p_items: Json
          p_request_id?: string
          p_shipping_address?: Json
        }
        Returns: Json
      }
      rpc_finance_command: {
        Args: {
          p_command: string
          p_entity_id: string
          p_entity_type: string
          p_idempotency_key: string
          p_payload: Json
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_force_employee_logout: {
        Args: { p_user_id: string }
        Returns: number
      }
      rpc_get_storefront_catalog: {
        Args: { p_limit?: number; p_slug?: string }
        Returns: Json
      }
      rpc_get_storefront_order: {
        Args: {
          p_lookup_token?: string
          p_order_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_merge_customer_cart: {
        Args: { p_items: Json; p_request_id?: string }
        Returns: Json
      }
      rpc_order_command: {
        Args: {
          p_command: string
          p_idempotency_key?: string
          p_order_id: string
          p_payload?: Json
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_pos_session_command: {
        Args: {
          p_command: string
          p_idempotency_key: string
          p_payload: Json
          p_request_id?: string
          p_session_id: string
        }
        Returns: Json
      }
      rpc_post_inbound_receipt: {
        Args: {
          p_arrival_date?: string
          p_idempotency_key?: string
          p_items: Json
          p_notes?: string
          p_supplier_id?: string
          p_supplier_reference?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      rpc_post_return: {
        Args: {
          p_dispositions: Json
          p_idempotency_key: string
          p_request_id?: string
          p_return_id: string
        }
        Returns: Json
      }
      rpc_publish_product_channel: {
        Args: {
          p_channel_id: string
          p_product_id: string
          p_scheduled_at?: string
        }
        Returns: Json
      }
      rpc_purchase_order_command: {
        Args: {
          p_command: string
          p_idempotency_key: string
          p_payload: Json
          p_purchase_order_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_receive_purchase_order: {
        Args: {
          p_idempotency_key: string
          p_items: Json
          p_purchase_order_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_register_product_media: {
        Args: {
          p_alt_text_en?: string
          p_alt_text_it?: string
          p_alt_text_zh?: string
          p_file_size: number
          p_height?: number
          p_is_primary?: boolean
          p_media_type?: string
          p_mime_type: string
          p_product_id: string
          p_storage_path: string
          p_variant_id: string
          p_width?: number
        }
        Returns: string
      }
      rpc_release_order_stock: {
        Args: {
          p_idempotency_key: string
          p_order_id: string
          p_reason: string
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_request_return: {
        Args: {
          p_customer_note?: string
          p_idempotency_key?: string
          p_items: Json
          p_order_id: string
          p_reason: string
          p_request_id?: string
        }
        Returns: Json
      }
      rpc_return_command: {
        Args: {
          p_command: string
          p_idempotency_key?: string
          p_payload?: Json
          p_request_id?: string
          p_return_id: string
        }
        Returns: Json
      }
      rpc_save_product_operations: {
        Args: { p_payload: Json; p_product_id: string }
        Returns: Json
      }
      rpc_set_product_channel_price: {
        Args: {
          p_channel_id: string
          p_compare_at_price?: number
          p_product_id: string
          p_unit_price?: number
          p_valid_from?: string
          p_valid_until?: string
          p_variant_id?: string
        }
        Returns: Json
      }
      rpc_soft_delete_product_media: {
        Args: { p_media_id: string; p_product_id: string }
        Returns: string
      }
      rpc_transition_inbound_receipt: {
        Args: {
          p_reason?: string
          p_receipt_id: string
          p_target_status: string
        }
        Returns: Json
      }
      rpc_unpublish_product_channel: {
        Args: { p_channel_id: string; p_product_id: string }
        Returns: Json
      }
      rpc_upsert_product_variant: {
        Args: {
          p_barcode?: string
          p_color_id?: string
          p_is_active?: boolean
          p_is_visible_online?: boolean
          p_product_id: string
          p_size_id?: string
          p_sku?: string
          p_sort_order?: number
          p_variant_id?: string
        }
        Returns: Json
      }
      rpc_validate_product_publication: {
        Args: { p_channel_id: string; p_product_id: string }
        Returns: Json
      }
      save_catalog_product: {
        Args: { p_product: Json; p_product_id: string; p_variants: Json }
        Returns: Json
      }
      save_received_quantities: {
        Args: { p_items: Json; p_receipt_id: string }
        Returns: Json
      }
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
        | "INBOUND"
        | "ADJUSTMENT_IN"
        | "ADJUSTMENT_OUT"
        | "SALE"
        | "RETURN"
        | "RESERVATION"
        | "RESERVATION_RELEASE"
        | "POS_SALE"
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
        "INBOUND",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
        "SALE",
        "RETURN",
        "RESERVATION",
        "RESERVATION_RELEASE",
        "POS_SALE",
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

