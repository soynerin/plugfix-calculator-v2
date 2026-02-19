import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Tipos de la base de datos Supabase
 * Estos tipos corresponden al schema SQL de Supabase
 */
export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      models: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          category: string | null;
          release_year: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          category?: string | null;
          release_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          category?: string | null;
          release_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          hours: number;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          hours: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          hours?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      config: {
        Row: {
          id: string;
          hourly_rate: number;
          margin: number;
          usd_rate: number;
          last_updated: string | null;
        };
        Insert: {
          id: string;
          hourly_rate: number;
          margin: number;
          usd_rate: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          hourly_rate?: number;
          margin?: number;
          usd_rate?: number;
          last_updated?: string;
        };
      };
      history: {
        Row: {
          id: string;
          client_name: string | null;
          brand: string;
          model: string;
          service: string;
          part_cost: number;
          currency: string;
          final_price: number;
          breakdown: any; // JSONB type
          date: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          client_name?: string | null;
          brand: string;
          model: string;
          service: string;
          part_cost: number;
          currency: string;
          final_price: number;
          breakdown: any;
          date?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          client_name?: string | null;
          brand?: string;
          model?: string;
          service?: string;
          part_cost?: number;
          currency?: string;
          final_price?: number;
          breakdown?: any;
          date?: string;
          notes?: string | null;
        };
      };
    };
  };
}

/**
 * Cliente Supabase configurado
 * Singleton para evitar múltiples instancias
 */
let supabaseInstance: SupabaseClient<any> | null = null;

export function getSupabaseClient(): SupabaseClient<any> {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
      );
    }

    supabaseInstance = createClient<any>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'plugfix-calculator-v2'
        }
      }
    });
  }

  return supabaseInstance;
}

/**
 * Reset del cliente (útil para testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

/**
 * Verificar conexión con Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('config').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export type { SupabaseClient };
