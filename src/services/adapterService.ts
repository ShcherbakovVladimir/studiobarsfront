// /home/user/projects/studioxlam/src/services/adapterService.ts
import { api, ApiError } from './apiClient';
import { getErrorMessage } from '../utils/errorUtils';

function isMissingAdapterEndpoint(error: unknown): boolean {
  return error instanceof ApiError && [404, 405, 501].includes(error.status);
}

type RawAdapterRecord = Record<string, unknown>;

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapRawAdapter(adapter: RawAdapterRecord): AdapterInfo {
  const baseModel = getString(adapter.baseModel) || getString(adapter.model) || 'unknown';
  return {
    id: getString(adapter.id) || getString(adapter.name) || `adapter-${Date.now()}`,
    name: getString(adapter.name, 'Unknown Adapter'),
    description: getString(adapter.description) || getString(adapter.notes),
    baseModel,
    type: getString(adapter.type, 'lora'),
    size: (adapter.size as string | number | undefined) ?? (adapter.fileSize as string | number | undefined) ?? 'N/A',
    format: getString(adapter.format, 'gguf'),
    filename: getString(adapter.filename) || getString(adapter.file),
    path: getString(adapter.path) || getString(adapter.location),
    isActive: Boolean(adapter.isActive ?? adapter.loaded),
    compatibleModels: getStringArray(adapter.compatibleModels).length > 0
      ? getStringArray(adapter.compatibleModels)
      : [baseModel],
    metadata: (adapter.metadata as Record<string, unknown> | undefined) ?? {},
    loadedAt: getOptionalString(adapter.loadedAt) ?? getOptionalString(adapter.timestamp),
    scale: getNumber(adapter.scale as number | undefined, 1.0),
    quantization: getString(adapter.quantization) || getString(adapter.quant) || 'q4_0'
  };
}

function mapRawAdapterFromArray(adapter: RawAdapterRecord): AdapterInfo {
  return {
    id: getString(adapter.id) || getString(adapter.name) || `adapter-${Date.now()}`,
    name: getString(adapter.name, 'Unknown Adapter'),
    description: getString(adapter.description),
    baseModel: getString(adapter.baseModel, 'unknown'),
    type: getString(adapter.type, 'lora'),
    size: (adapter.size as string | number | undefined) ?? 'N/A',
    format: getString(adapter.format, 'gguf'),
    filename: getString(adapter.filename) || getString(adapter.name),
    path: getString(adapter.path),
    isActive: Boolean(adapter.isActive),
    compatibleModels: getStringArray(adapter.compatibleModels),
    metadata: (adapter.metadata as Record<string, unknown> | undefined) ?? {}
  };
}

export interface AdapterInfo {
  id: string;
  name: string;
  description?: string;
  baseModel: string;
  type: string;
  size: string | number;
  format?: string;
  filename?: string;
  path?: string;
  isActive?: boolean;
  compatibleModels?: string[];
  metadata?: Record<string, unknown>;
  loadedAt?: string;
  scale?: number;
  quantization?: string;
}

export interface AdapterResponse {
  success: boolean;
  adapters?: AdapterInfo[];
  adapter?: AdapterInfo;
  activeAdapter?: AdapterInfo;
  message?: string;
  error?: string;
}

export interface LoadAdapterRequest {
  adapterId?: string;
  adapterPath?: string;
  modelId?: string;
  scale?: number;
  baseModel?: string;
  quantization?: string;
}

interface LoadAdapterBody {
  scale: number;
  adapterId?: string;
  adapterPath?: string;
  modelId?: string;
  baseModel?: string;
  quantization?: string;
}

// Сервис для работы с адаптерами
export const adapterService = {
  // Получить список доступных адаптеров
  async getAvailableAdapters(): Promise<AdapterResponse> {
    try {
      let data: (AdapterResponse & { adapters?: RawAdapterRecord[] }) | RawAdapterRecord[];
      try {
        data = await api<(AdapterResponse & { adapters?: RawAdapterRecord[] }) | RawAdapterRecord[]>('/adapters');
      } catch (error) {
        if (isMissingAdapterEndpoint(error)) {
          console.warn('Adapters API endpoint not available');
          return {
            success: true,
            adapters: [],
            message: 'Adapter feature not available',
          };
        }
        throw error;
      }
      
      // Обрабатываем разные форматы ответа
      if (!Array.isArray(data) && !data.success && !data.adapters) {
        return {
          success: false,
          error: data.error || 'Failed to fetch adapters',
          adapters: []
        };
      }
      
      // Преобразуем адаптеры в нужный формат
      const adapters: AdapterInfo[] = [];
      
      // Проверяем разные возможные структуры ответа
      if (!Array.isArray(data) && Array.isArray(data.adapters)) {
        data.adapters.forEach((adapter) => {
          adapters.push(mapRawAdapter(adapter as unknown as RawAdapterRecord));
        });
      } else if (Array.isArray(data)) {
        // Если ответ просто массив адаптеров
        data.forEach((adapter) => {
          adapters.push(mapRawAdapterFromArray(adapter));
        });
      }
      
      // Получаем активный адаптер
      let activeAdapter: AdapterInfo | undefined;
      const activeResult = await this.getActiveAdapter();
      if (activeResult.success && activeResult.adapter) {
        activeAdapter = activeResult.adapter;
      }
      
      return {
        success: true,
        adapters,
        activeAdapter
      };
    } catch (error: unknown) {
      console.error('Error fetching adapters:', error);
      // Возвращаем успех с пустым списком для совместимости
      return {
        success: true,
        adapters: [],
        error: getErrorMessage(error) || 'Failed to fetch adapters',
        message: 'Adapter feature might not be available'
      };
    }
  },

  // Загрузить адаптер
  async loadAdapter(request: LoadAdapterRequest): Promise<AdapterResponse> {
    try {
      // Проверяем обязательные параметры
      if (!request.adapterId && !request.adapterPath) {
        return {
          success: false,
          error: 'Either adapterId or adapterPath is required'
        };
      }
      
      const body: LoadAdapterBody = {
        scale: request.scale || 1.0
      };
      
      if (request.adapterId) {
        body.adapterId = request.adapterId;
      }
      
      if (request.adapterPath) {
        body.adapterPath = request.adapterPath;
      }
      
      if (request.modelId) {
        body.modelId = request.modelId;
      }
      
      if (request.baseModel) {
        body.baseModel = request.baseModel;
      }
      
      if (request.quantization) {
        body.quantization = request.quantization;
      }
      
      const data = await api<AdapterResponse & { adapter?: RawAdapterRecord }>('/adapters/load', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to load adapter'
        };
      }
      
      let adapter: AdapterInfo | undefined;
      
      if (data.adapter) {
        const raw = data.adapter;
        adapter = {
          id: getString(raw.id) || getString(raw.name) || request.adapterId || '',
          name: getString(raw.name, 'Loaded Adapter'),
          description: getString(raw.description),
          baseModel: getString(raw.baseModel) || request.baseModel || 'unknown',
          type: getString(raw.type, 'lora'),
          size: (raw.size as string | number | undefined) ?? 'N/A',
          format: getString(raw.format, 'gguf'),
          filename: getString(raw.filename),
          path: getString(raw.path) || request.adapterPath || '',
          isActive: true,
          compatibleModels: getStringArray(raw.compatibleModels),
          metadata: (raw.metadata as Record<string, unknown> | undefined) ?? {},
          loadedAt: new Date().toISOString(),
          scale: getNumber(raw.scale as number | undefined, request.scale || 1.0)
        };
      }
      
      return {
        success: true,
        adapter,
        message: data.message || 'Adapter loaded successfully'
      };
    } catch (error: unknown) {
      if (isMissingAdapterEndpoint(error)) {
        return {
          success: false,
          error: 'Adapter loading feature not available on this server',
        };
      }
      console.error('Error loading adapter:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to load adapter'
      };
    }
  },

  // Выгрузить адаптер
  async unloadAdapter(modelId?: string): Promise<AdapterResponse> {
    try {
      const body: { modelId?: string } = {};
      if (modelId) {
        body.modelId = modelId;
      }
      
      const data = await api<AdapterResponse>('/adapters/unload', {
        method: 'POST',
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to unload adapter'
        };
      }
      
      return {
        success: true,
        message: data.message || 'Adapter unloaded successfully'
      };
    } catch (error: unknown) {
      if (isMissingAdapterEndpoint(error)) {
        return {
          success: false,
          error: 'Adapter unloading feature not available on this server',
        };
      }
      console.error('Error unloading adapter:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to unload adapter'
      };
    }
  },

  // Получить активный адаптер
  async getActiveAdapter(): Promise<AdapterResponse> {
    try {
      let data: AdapterResponse & { adapter?: RawAdapterRecord };
      try {
        data = await api<AdapterResponse & { adapter?: RawAdapterRecord }>('/adapters/active');
      } catch (error) {
        if (error instanceof ApiError && [404, 400, 204].includes(error.status)) {
          return {
            success: true,
            message: 'No active adapter',
          };
        }
        throw error;
      }
      
      // Проверяем разные форматы ответа
      if (!data.success && !data.adapter) {
        return {
          success: false,
          error: data.error || 'Failed to get active adapter',
          message: data.message
        };
      }
      
      // Если ответ пустой или success: true без adapter
      if (!data.adapter && data.success) {
        return { success: true };
      }
      
      let adapter: AdapterInfo | undefined;
      
      if (data.adapter) {
        const raw = data.adapter;
        adapter = {
          id: getString(raw.id) || getString(raw.name) || 'active-adapter',
          name: getString(raw.name, 'Active Adapter'),
          description: getString(raw.description),
          baseModel: getString(raw.baseModel) || getString(raw.model) || 'unknown',
          type: getString(raw.type, 'lora'),
          size: (raw.size as string | number | undefined) ?? 'N/A',
          format: getString(raw.format, 'gguf'),
          filename: getString(raw.filename) || getString(raw.file),
          path: getString(raw.path),
          isActive: true,
          compatibleModels: getStringArray(raw.compatibleModels),
          metadata: (raw.metadata as Record<string, unknown> | undefined) ?? {},
          loadedAt: getOptionalString(raw.loadedAt) ?? new Date().toISOString(),
          scale: getNumber(raw.scale as number | undefined, 1.0),
          quantization: getString(raw.quantization, 'q4_0')
        };
      }
      
      return {
        success: true,
        adapter,
        activeAdapter: adapter
      };
    } catch (error: unknown) {
      console.error('Error getting active adapter:', error);
      // Возвращаем успех, если нет активного адаптера
      return {
        success: true,
        message: 'No active adapter or feature not available',
        error: getErrorMessage(error)
      };
    }
  },

  // Проверить поддержку адаптеров
  async checkAdapterSupport(): Promise<{ 
    supported: boolean; 
    features: Record<string, unknown>;
    message?: string;
  }> {
    try {
      // Попробуем получить список адаптеров
      const adaptersResponse = await this.getAvailableAdapters();
      
      if (!adaptersResponse.success) {
        // Если это ошибка 404/501, значит фича не поддерживается
        if (adaptersResponse.error?.includes('404') || adaptersResponse.error?.includes('501')) {
          return {
            supported: false,
            features: {},
            message: 'Adapter feature not supported by this server'
          };
        }
        
        return {
          supported: false,
          features: {},
          message: adaptersResponse.error
        };
      }
      
      // Если успешно получили список (даже пустой), значит фича поддерживается
      return {
        supported: true,
        features: {
          listAdapters: true,
          loadAdapter: true,
          unloadAdapter: true,
          getActiveAdapter: true,
          adapterCount: adaptersResponse.adapters?.length || 0
        }
      };
    } catch (error: unknown) {
      console.error('Error checking adapter support:', error);
      return {
        supported: false,
        features: {},
        message: getErrorMessage(error) || 'Failed to check adapter support'
      };
    }
  },

  async swapAdapter(
    params: string | { adapterId?: string; adapterPath?: string; scale?: number },
    scale = 1.0
  ): Promise<AdapterResponse> {
    const body =
      typeof params === 'string'
        ? { adapterId: params, scale }
        : {
            adapterId: params.adapterId,
            adapterPath: params.adapterPath,
            scale: params.scale ?? 1.0,
          };

    try {
      const data = await api<AdapterResponse & { adapter?: RawAdapterRecord }>('/adapters/swap', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to swap adapter',
        };
      }

      let adapter: AdapterInfo | undefined;
      if (data.adapter) {
        adapter = mapRawAdapter(data.adapter as unknown as RawAdapterRecord);
        adapter.isActive = true;
      }

      return {
        success: true,
        adapter,
        message: data.message || 'Adapter swapped successfully',
      };
    } catch (error) {
      if (isMissingAdapterEndpoint(error)) {
        return this.loadAdapter(body);
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to swap adapter',
      };
    }
  },

  // Удалить адаптер из списка (если сервер поддерживает)
  async deleteAdapter(adapterId: string): Promise<AdapterResponse> {
    try {
      const data = await api<AdapterResponse>(`/adapters/${encodeURIComponent(adapterId)}`, {
        method: 'DELETE',
      });
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to delete adapter'
        };
      }
      
      return {
        success: true,
        message: data.message || 'Adapter deleted successfully'
      };
    } catch (error: unknown) {
      if (isMissingAdapterEndpoint(error)) {
        return { success: false, error: 'Adapter deletion not supported' };
      }
      console.error('Error deleting adapter:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to delete adapter'
      };
    }
  },

  // Обновить информацию об адаптере
  async updateAdapter(adapterId: string, updates: Partial<AdapterInfo>): Promise<AdapterResponse> {
    try {
      const data = await api<AdapterResponse & { adapter?: RawAdapterRecord }>(
        `/adapters/${encodeURIComponent(adapterId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to update adapter'
        };
      }
      
      let adapter: AdapterInfo | undefined;
      
      if (data.adapter) {
        const raw = data.adapter;
        adapter = {
          id: getString(raw.id) || adapterId,
          name: getString(raw.name) || updates.name || 'Updated Adapter',
          description: getString(raw.description) || updates.description || '',
          baseModel: getString(raw.baseModel) || updates.baseModel || 'unknown',
          type: getString(raw.type) || updates.type || 'lora',
          size: (raw.size as string | number | undefined) ?? updates.size ?? 'N/A',
          format: getString(raw.format) || updates.format || 'gguf',
          filename: getString(raw.filename) || updates.filename || '',
          path: getString(raw.path) || updates.path || '',
          isActive: Boolean(raw.isActive ?? updates.isActive),
          compatibleModels: getStringArray(raw.compatibleModels).length > 0
            ? getStringArray(raw.compatibleModels)
            : updates.compatibleModels || [],
          metadata: (raw.metadata as Record<string, unknown> | undefined) ?? updates.metadata ?? {},
          scale: getNumber(raw.scale as number | undefined, updates.scale ?? 1.0)
        };
      }
      
      return {
        success: true,
        adapter,
        message: data.message || 'Adapter updated successfully'
      };
    } catch (error: unknown) {
      if (isMissingAdapterEndpoint(error)) {
        return { success: false, error: 'Adapter update not supported' };
      }
      console.error('Error updating adapter:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to update adapter'
      };
    }
  },

  // Получить информацию об адаптере
  async getAdapter(adapterId: string): Promise<AdapterResponse> {
    try {
      // Сначала попробуем получить все адаптеры
      const allResponse = await this.getAvailableAdapters();
      
      if (allResponse.success && allResponse.adapters) {
        const adapter = allResponse.adapters.find(a => a.id === adapterId);
        if (adapter) {
          return {
            success: true,
            adapter,
            message: 'Adapter found'
          };
        }
      }
      
      // Если не нашли в списке, попробуем прямой запрос
      let data: AdapterResponse & { adapter?: RawAdapterRecord };
      try {
        data = await api<AdapterResponse & { adapter?: RawAdapterRecord }>(
          `/adapters/${encodeURIComponent(adapterId)}`
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { success: false, error: 'Adapter not found' };
        }
        throw error;
      }
      
      if (!data.success && !data.adapter) {
        return {
          success: false,
          error: data.error || 'Failed to get adapter'
        };
      }
      
      let adapter: AdapterInfo | undefined;
      
      if (data.adapter) {
        const raw = data.adapter;
        adapter = {
          id: getString(raw.id) || adapterId,
          name: getString(raw.name, 'Adapter'),
          description: getString(raw.description),
          baseModel: getString(raw.baseModel, 'unknown'),
          type: getString(raw.type, 'lora'),
          size: (raw.size as string | number | undefined) ?? 'N/A',
          format: getString(raw.format, 'gguf'),
          filename: getString(raw.filename),
          path: getString(raw.path),
          isActive: Boolean(raw.isActive),
          compatibleModels: getStringArray(raw.compatibleModels),
          metadata: (raw.metadata as Record<string, unknown> | undefined) ?? {}
        };
      }
      
      return {
        success: true,
        adapter,
        message: data.message || 'Adapter retrieved'
      };
    } catch (error: unknown) {
      console.error('Error getting adapter:', error);
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to get adapter'
      };
    }
  }
};

export default adapterService;
