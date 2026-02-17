import type { IDatabaseService, HistoryFilters } from '../interfaces/IDatabaseService';
import type { Brand, RepairModel, Service, PriceConfig, RepairHistory } from '@/core/domain/models';
import { getSupabaseClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseAdapter - Implementación Cloud con PostgreSQL
 * Implementa IDatabaseService usando Supabase como backend
 */
export class SupabaseAdapter implements IDatabaseService {
  private client: SupabaseClient<any>;

  constructor() {
    this.client = getSupabaseClient();
  }

  async initialize(): Promise<void> {
    // Verificar que existe la configuración
    const { error } = await this.client
      .from('config')
      .select('id')
      .eq('id', 'main')
      .single();

    if (error && error.code === 'PGRST116') {
      // No existe config, crear una por defecto
      await this.client.from('config').insert({
        id: 'main',
        hourly_rate: 13000,
        margin: 40,
        usd_rate: 1200
      });
    }
  }

  // ============================================
  // BRANDS
  // ============================================

  async getAllBrands(): Promise<Brand[]> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch brands: ${error.message}`);

    return (data || []).map(this.mapBrandFromDB);
  }

  async getBrandById(id: string): Promise<Brand | null> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch brand: ${error.message}`);
    }

    return this.mapBrandFromDB(data);
  }

  async searchBrands(query: string): Promise<Brand[]> {
    const { data, error } = await this.client
      .from('brands')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to search brands: ${error.message}`);

    return (data || []).map(this.mapBrandFromDB);
  }

  async addBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const { data, error } = await this.client
      .from('brands')
      .insert({
        name: brand.name
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add brand: ${error.message}`);

    return this.mapBrandFromDB(data);
  }

  async updateBrand(id: string, brandData: Partial<Brand>): Promise<Brand> {
    const { data, error } = await this.client
      .from('brands')
      .update({
        name: brandData.name
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update brand: ${error.message}`);

    return this.mapBrandFromDB(data);
  }

  async deleteBrand(id: string): Promise<void> {
    const { error } = await this.client
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete brand: ${error.message}`);
  }

  // ============================================
  // MODELS
  // ============================================

  async getModelsByBrand(brandId: string): Promise<RepairModel[]> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch models: ${error.message}`);

    return (data || []).map(this.mapModelFromDB);
  }

  async getModelById(id: string): Promise<RepairModel | null> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch model: ${error.message}`);
    }

    return this.mapModelFromDB(data);
  }

  async searchModels(query: string): Promise<RepairModel[]> {
    const { data, error } = await this.client
      .from('models')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to search models: ${error.message}`);

    return (data || []).map(this.mapModelFromDB);
  }

  async addModel(model: Omit<RepairModel, 'id'>): Promise<RepairModel> {
    const { data, error } = await this.client
      .from('models')
      .insert({
        brand_id: model.brandId,
        name: model.name,
        risk_factor: model.riskFactor,
        category: model.category || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add model: ${error.message}`);

    return this.mapModelFromDB(data);
  }

  async updateModel(id: string, modelData: Partial<RepairModel>): Promise<RepairModel> {
    const updateData: Record<string, any> = {};
    if (modelData.brandId !== undefined) updateData.brand_id = modelData.brandId;
    if (modelData.name !== undefined) updateData.name = modelData.name;
    if (modelData.riskFactor !== undefined) updateData.risk_factor = modelData.riskFactor;
    if (modelData.category !== undefined) updateData.category = modelData.category;

    const { data, error } = await this.client
      .from('models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update model: ${error.message}`);

    return this.mapModelFromDB(data);
  }

  async deleteModel(id: string): Promise<void> {
    const { error } = await this.client
      .from('models')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete model: ${error.message}`);
  }

  // ============================================
  // SERVICES
  // ============================================

  async getAllServices(): Promise<Service[]> {
    const { data, error } = await this.client
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch services: ${error.message}`);

    return (data || []).map(this.mapServiceFromDB);
  }

  async getServiceById(id: string): Promise<Service | null> {
    const { data, error } = await this.client
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch service: ${error.message}`);
    }

    return this.mapServiceFromDB(data);
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const { data, error } = await this.client
      .from('services')
      .insert({
        name: service.name,
        hours: service.hours,
        description: service.description || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add service: ${error.message}`);

    return this.mapServiceFromDB(data);
  }

  async updateService(id: string, serviceData: Partial<Service>): Promise<Service> {
    const updateData: Record<string, any> = {};
    if (serviceData.name !== undefined) updateData.name = serviceData.name;
    if (serviceData.hours !== undefined) updateData.hours = serviceData.hours;
    if (serviceData.description !== undefined) updateData.description = serviceData.description;

    const { data, error } = await this.client
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update service: ${error.message}`);

    return this.mapServiceFromDB(data);
  }

  async deleteService(id: string): Promise<void> {
    const { error } = await this.client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete service: ${error.message}`);
  }

  // ============================================
  // CONFIG
  // ============================================

  async getConfig(): Promise<PriceConfig> {
    const { data, error } = await this.client
      .from('config')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error) throw new Error(`Failed to fetch config: ${error.message}`);

    return this.mapConfigFromDB(data);
  }

  async updateConfig(configData: Partial<PriceConfig>): Promise<PriceConfig> {
    const updateData: Record<string, any> = {};
    if (configData.hourlyRate !== undefined) updateData.hourly_rate = configData.hourlyRate;
    if (configData.margin !== undefined) updateData.margin = configData.margin;
    if (configData.usdRate !== undefined) updateData.usd_rate = configData.usdRate;

    const { data, error } = await this.client
      .from('config')
      .update(updateData)
      .eq('id', 'main')
      .select()
      .single();

    if (error) throw new Error(`Failed to update config: ${error.message}`);

    return this.mapConfigFromDB(data);
  }

  // ============================================
  // HISTORY
  // ============================================

  async getAllHistory(): Promise<RepairHistory[]> {
    const { data, error } = await this.client
      .from('history')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch history: ${error.message}`);

    return (data || []).map(this.mapHistoryFromDB);
  }

  async getHistoryById(id: string): Promise<RepairHistory | null> {
    const { data, error } = await this.client
      .from('history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch history entry: ${error.message}`);
    }

    return this.mapHistoryFromDB(data);
  }

  async addHistory(entry: Omit<RepairHistory, 'id'>): Promise<RepairHistory> {
    const { data, error } = await this.client
      .from('history')
      .insert({
        client_name: entry.clientName || null,
        brand: entry.brand,
        model: entry.model,
        service: entry.service,
        part_cost: entry.partCost,
        currency: entry.currency,
        final_price: entry.finalPrice,
        breakdown: entry.breakdown,
        date: entry.date.toISOString(),
        notes: entry.notes || null
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add history entry: ${error.message}`);

    return this.mapHistoryFromDB(data);
  }

  async deleteHistory(id: string): Promise<void> {
    const { error } = await this.client
      .from('history')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete history entry: ${error.message}`);
  }

  async searchHistory(filters: HistoryFilters): Promise<RepairHistory[]> {
    let query = this.client
      .from('history')
      .select('*');

    if (filters.clientName) {
      query = query.ilike('client_name', `%${filters.clientName}%`);
    }

    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }

    if (filters.model) {
      query = query.eq('model', filters.model);
    }

    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo.toISOString());
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(`Failed to search history: ${error.message}`);

    return (data || []).map(this.mapHistoryFromDB);
  }

  async exportHistory(format: 'csv' | 'json'): Promise<Blob> {
    const history = await this.getAllHistory();

    if (format === 'json') {
      const json = JSON.stringify(history, null, 2);
      return new Blob([json], { type: 'application/json' });
    }

    // CSV format
    const headers = [
      'ID',
      'Cliente',
      'Marca',
      'Modelo',
      'Servicio',
      'Costo Repuesto',
      'Moneda',
      'Precio Final',
      'Fecha',
      'Notas'
    ];

    const rows = history.map(entry => [
      entry.id,
      entry.clientName || '',
      entry.brand,
      entry.model,
      entry.service,
      entry.partCost.toString(),
      entry.currency,
      entry.finalPrice.toString(),
      entry.date.toISOString(),
      entry.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  // ============================================
  // UTILITY
  // ============================================

  async clearAll(): Promise<void> {
    await this.client.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('models').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Reset config to defaults
    await this.client
      .from('config')
      .update({
        hourly_rate: 13000,
        margin: 40,
        usd_rate: 1200
      })
      .eq('id', 'main');
  }

  async backup(): Promise<Blob> {
    const [brands, models, services, config, history] = await Promise.all([
      this.getAllBrands(),
      this.client.from('models').select('*').then(r => r.data || []),
      this.getAllServices(),
      this.getConfig(),
      this.getAllHistory()
    ]);

    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      data: {
        brands,
        models: models.map(this.mapModelFromDB),
        services,
        config,
        history
      }
    };

    const json = JSON.stringify(backup, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async restore(data: Blob): Promise<void> {
    const text = await data.text();
    const backup = JSON.parse(text);

    // Clear existing data
    await this.clearAll();

    // Restore brands
    if (backup.data.brands?.length) {
      for (const brand of backup.data.brands) {
        await this.addBrand({ name: brand.name });
      }
    }

    // Restore services
    if (backup.data.services?.length) {
      for (const service of backup.data.services) {
        await this.addService({
          name: service.name,
          hours: service.hours,
          description: service.description
        });
      }
    }

    // Restore models
    if (backup.data.models?.length) {
      for (const model of backup.data.models) {
        await this.addModel({
          brandId: model.brandId,
          name: model.name,
          riskFactor: model.riskFactor,
          category: model.category
        });
      }
    }

    // Restore config
    if (backup.data.config) {
      await this.updateConfig({
        hourlyRate: backup.data.config.hourlyRate,
        margin: backup.data.config.margin,
        usdRate: backup.data.config.usdRate
      });
    }

    // Restore history
    if (backup.data.history?.length) {
      for (const entry of backup.data.history) {
        await this.addHistory({
          clientName: entry.clientName,
          brand: entry.brand,
          model: entry.model,
          service: entry.service,
          partCost: entry.partCost,
          currency: entry.currency,
          finalPrice: entry.finalPrice,
          breakdown: entry.breakdown,
          date: new Date(entry.date),
          notes: entry.notes
        });
      }
    }
  }

  // ============================================
  // HELPER METHODS (Mappers)
  // ============================================

  private mapBrandFromDB(data: any): Brand {
    return {
      id: data.id,
      name: data.name,
      ...(data.created_at && { createdAt: new Date(data.created_at) }),
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapModelFromDB(data: any): RepairModel {
    const model: RepairModel = {
      id: data.id,
      brandId: data.brand_id,
      name: data.name,
      riskFactor: data.risk_factor
    };

    if (data.category && typeof data.category === 'string') {
      model.category = data.category as 'Gama Baja' | 'Gama Media' | 'Gama Alta' | 'Premium';
    }

    if (data.created_at) {
      model.createdAt = new Date(data.created_at);
    }

    if (data.updated_at) {
      model.updatedAt = new Date(data.updated_at);
    }

    return model;
  }

  private mapServiceFromDB(data: any): Service {
    return {
      id: data.id,
      name: data.name,
      hours: data.hours,
      ...(data.description && { description: data.description }),
      ...(data.created_at && { createdAt: new Date(data.created_at) }),
      ...(data.updated_at && { updatedAt: new Date(data.updated_at) })
    };
  }

  private mapConfigFromDB(data: any): PriceConfig {
    return {
      id: 'main',
      hourlyRate: data.hourly_rate,
      margin: data.margin,
      usdRate: data.usd_rate,
      ...(data.last_updated && { lastUpdated: new Date(data.last_updated) })
    };
  }

  private mapHistoryFromDB(data: any): RepairHistory {
    return {
      id: data.id,
      ...(data.client_name && { clientName: data.client_name }),
      brand: data.brand,
      model: data.model,
      service: data.service,
      partCost: data.part_cost,
      currency: data.currency as 'ARS' | 'USD',
      finalPrice: data.final_price,
      breakdown: data.breakdown,
      date: new Date(data.date || Date.now()),
      ...(data.notes && { notes: data.notes })
    };
  }
}
