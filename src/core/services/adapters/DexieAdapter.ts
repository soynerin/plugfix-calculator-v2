import Dexie, { Table } from 'dexie';
import type { IDatabaseService, HistoryFilters } from '../interfaces/IDatabaseService';
import type { Brand, RepairModel, Service, PriceConfig, RepairHistory } from '@/core/domain/models';

class PlugFixDatabase extends Dexie {
  brands!: Table<Brand, string>;
  models!: Table<RepairModel, string>;
  services!: Table<Service, string>;
  config!: Table<PriceConfig, 'main'>;
  history!: Table<RepairHistory, string>;

  constructor() {
    super('PlugFixDB');
    
    this.version(1).stores({
      brands: 'id, name, createdAt',
      models: 'id, brandId, name, riskFactor, category',
      services: 'id, name, hours',
      config: 'id',
      history: 'id, date, clientName, brand, model, service'
    });
  }
}

export class DexieAdapter implements IDatabaseService {
  private db: PlugFixDatabase;

  constructor() {
    this.db = new PlugFixDatabase();
  }

  async initialize(): Promise<void> {
    await this.db.open();
    
    // Seed inicial si está vacío
    const configExists = await this.db.config.get('main');
    if (!configExists) {
      await this.seedInitialData();
    }
  }

  private async seedInitialData(): Promise<void> {
    // Configuración por defecto
    await this.db.config.add({
      id: 'main',
      hourlyRate: 13000,
      margin: 40,
      usdRate: 1200,
      lastUpdated: new Date()
    });

    // Marcas iniciales
    const samsung: Brand = {
      id: 'samsung',
      name: 'Samsung',
      createdAt: new Date()
    };
    
    const apple: Brand = {
      id: 'apple',
      name: 'Apple',
      createdAt: new Date()
    };

    await this.db.brands.bulkAdd([samsung, apple]);

    // Servicios por defecto
    await this.db.services.bulkAdd([
      { id: 'screen', name: 'Cambio de Pantalla', hours: 1, createdAt: new Date() },
      { id: 'battery', name: 'Cambio de Batería', hours: 0.5, createdAt: new Date() },
      { id: 'charging', name: 'Conector de Carga', hours: 0.75, createdAt: new Date() }
    ]);
  }

  // ============================================
  // BRANDS
  // ============================================
  async getAllBrands(): Promise<Brand[]> {
    return this.db.brands.toArray();
  }

  async getBrandById(id: string): Promise<Brand | null> {
    return (await this.db.brands.get(id)) || null;
  }

  async searchBrands(query: string): Promise<Brand[]> {
    const lowerQuery = query.toLowerCase();
    return this.db.brands
      .filter(b => b.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  async addBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const id = this.generateId(brand.name);
    const newBrand: Brand = {
      ...brand,
      id,
      createdAt: new Date()
    };
    await this.db.brands.add(newBrand);
    return newBrand;
  }

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    await this.db.brands.update(id, { ...data, updatedAt: new Date() });
    const updated = await this.db.brands.get(id);
    if (!updated) throw new Error(`Brand ${id} not found`);
    return updated;
  }

  async deleteBrand(id: string): Promise<void> {
    // Eliminar modelos asociados primero
    await this.db.models.where('brandId').equals(id).delete();
    await this.db.brands.delete(id);
  }

  // ============================================
  // MODELS
  // ============================================
  async getModelsByBrand(brandId: string): Promise<RepairModel[]> {
    return this.db.models.where('brandId').equals(brandId).toArray();
  }

  async getModelById(id: string): Promise<RepairModel | null> {
    return (await this.db.models.get(id)) || null;
  }

  async searchModels(query: string): Promise<RepairModel[]> {
    const lowerQuery = query.toLowerCase();
    return this.db.models
      .filter(m => m.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  async addModel(model: Omit<RepairModel, 'id'>): Promise<RepairModel> {
    const id = this.generateId(model.name);
    const newModel: RepairModel = {
      ...model,
      id,
      createdAt: new Date()
    };
    await this.db.models.add(newModel);
    return newModel;
  }

  async updateModel(id: string, data: Partial<RepairModel>): Promise<RepairModel> {
    await this.db.models.update(id, { ...data, updatedAt: new Date() });
    const updated = await this.db.models.get(id);
    if (!updated) throw new Error(`Model ${id} not found`);
    return updated;
  }

  async deleteModel(id: string): Promise<void> {
    await this.db.models.delete(id);
  }

  // ============================================
  // SERVICES
  // ============================================
  async getAllServices(): Promise<Service[]> {
    return this.db.services.toArray();
  }

  async getServiceById(id: string): Promise<Service | null> {
    return (await this.db.services.get(id)) || null;
  }

  async addService(service: Omit<Service, 'id'>): Promise<Service> {
    const id = this.generateId(service.name);
    const newService: Service = {
      ...service,
      id,
      createdAt: new Date()
    };
    await this.db.services.add(newService);
    return newService;
  }

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    await this.db.services.update(id, { ...data, updatedAt: new Date() });
    const updated = await this.db.services.get(id);
    if (!updated) throw new Error(`Service ${id} not found`);
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await this.db.services.delete(id);
  }

  // ============================================
  // CONFIG
  // ============================================
  async getConfig(): Promise<PriceConfig> {
    const config = await this.db.config.get('main');
    if (!config) {
      throw new Error('Configuration not found');
    }
    return config;
  }

  async updateConfig(data: Partial<PriceConfig>): Promise<PriceConfig> {
    await this.db.config.update('main', { ...data, lastUpdated: new Date() });
    return this.getConfig();
  }

  // ============================================
  // HISTORY
  // ============================================
  async getAllHistory(): Promise<RepairHistory[]> {
    return this.db.history.orderBy('date').reverse().toArray();
  }

  async getHistoryById(id: string): Promise<RepairHistory | null> {
    return (await this.db.history.get(id)) || null;
  }

  async addHistory(entry: Omit<RepairHistory, 'id'>): Promise<RepairHistory> {
    const id = Date.now().toString();
    const newEntry: RepairHistory = {
      ...entry,
      id,
      date: new Date()
    };
    await this.db.history.add(newEntry);
    return newEntry;
  }

  async deleteHistory(id: string): Promise<void> {
    await this.db.history.delete(id);
  }

  async searchHistory(filters: HistoryFilters): Promise<RepairHistory[]> {
    let collection = this.db.history.toCollection();

    if (filters.brand) {
      collection = this.db.history.where('brand').equals(filters.brand);
    }

    return collection.filter(entry => {
      if (filters.clientName && !entry.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) {
        return false;
      }
      if (filters.model && entry.model !== filters.model) {
        return false;
      }
      if (filters.dateFrom && entry.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && entry.date > filters.dateTo) {
        return false;
      }
      return true;
    }).toArray();
  }

  async exportHistory(format: 'csv' | 'json'): Promise<Blob> {
    const history = await this.getAllHistory();
    
    if (format === 'json') {
      const json = JSON.stringify(history, null, 2);
      return new Blob([json], { type: 'application/json' });
    }
    
    // CSV
    const headers = 'ID,Cliente,Marca,Modelo,Servicio,Costo Repuesto,Moneda,Precio Final,Fecha\n';
    const rows = history.map(h => 
      `${h.id},${h.clientName || ''},${h.brand},${h.model},${h.service},${h.partCost},${h.currency},${h.finalPrice},${h.date}`
    ).join('\n');
    
    return new Blob([headers + rows], { type: 'text/csv' });
  }

  // ============================================
  // UTILITY
  // ============================================
  async clearAll(): Promise<void> {
    await this.db.brands.clear();
    await this.db.models.clear();
    await this.db.services.clear();
    await this.db.history.clear();
  }

  async backup(): Promise<Blob> {
    const data = {
      brands: await this.db.brands.toArray(),
      models: await this.db.models.toArray(),
      services: await this.db.services.toArray(),
      config: await this.db.config.toArray(),
      history: await this.db.history.toArray()
    };
    
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async restore(data: Blob): Promise<void> {
    const text = await data.text();
    const parsed = JSON.parse(text);
    
    await this.clearAll();
    await this.db.brands.bulkAdd(parsed.brands);
    await this.db.models.bulkAdd(parsed.models);
    await this.db.services.bulkAdd(parsed.services);
    await this.db.config.bulkAdd(parsed.config);
    await this.db.history.bulkAdd(parsed.history);
  }

  // ============================================
  // HELPERS
  // ============================================
  private generateId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}
