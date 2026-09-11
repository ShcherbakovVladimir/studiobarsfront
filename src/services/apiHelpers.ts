import { llamaApi } from './llamaService';
import ragService from './ragService';
import { getErrorMessage } from '../utils/errorUtils';
import { isServerOnline } from '../utils/serverStatus';
import type { XLAMModel } from '../types';

interface ApiTestResult {
  name: string;
  success: boolean;
  data: unknown;
}

export const APIHelpers = {
  async checkConnection(): Promise<{ connected: boolean; message: string; details?: Record<string, unknown> }> {
    try {
      const info = await llamaApi.getApiInfo();
      const health = await llamaApi.getHealth();
      const rootHealth = await llamaApi.getRootHealth();
      const ping = await llamaApi.ping();
      const status = await llamaApi.getStatus();
      
      return {
        connected: true,
        message: 'Сервер подключен и работает',
        details: { info, health, rootHealth, ping, status }
      };
    } catch (error) {
      return {
        connected: false,
        message: `Ошибка подключения: ${getErrorMessage(error)}`
      };
    }
  },
  
  async testAllAPIFunctions() {
    const results: ApiTestResult[] = [];
    
    try {
      const apiInfo = await llamaApi.getApiInfo();
      results.push({ name: 'API Info', success: true, data: apiInfo });
      
      const health = await llamaApi.getHealth();
      results.push({ name: 'Health', success: health.status === 'ok' || health.status === 'healthy', data: health });

      const rootHealth = await llamaApi.getRootHealth();
      results.push({
        name: 'Root Health',
        success: rootHealth.status === 'ok' || rootHealth.status === 'OK' || rootHealth.status === 'healthy',
        data: rootHealth,
      });

      const ping = await llamaApi.ping();
      results.push({ name: 'Ping', success: ping.success !== false || ping.pong === true, data: ping });
      
      const status = await llamaApi.getStatus();
      results.push({ name: 'Status', success: isServerOnline(status), data: status });

      try {
        const serverHealth = await llamaApi.getServerHealth();
        results.push({ name: 'Server Health', success: true, data: serverHealth });
      } catch (error) {
        results.push({ name: 'Server Health', success: false, data: { error: getErrorMessage(error) } });
      }
      
      const models = await llamaApi.getModels();
      results.push({ name: 'Get Models', success: Array.isArray(models), data: models });

      try {
        const compatibility = await llamaApi.getModelCompatibility();
        results.push({ name: 'Model Compatibility', success: true, data: compatibility });
      } catch (error) {
        results.push({ name: 'Model Compatibility', success: false, data: { error: getErrorMessage(error) } });
      }

      const ragHealth = await ragService.healthCheck();
      results.push({ name: 'RAG Health', success: ragHealth.status === 'healthy' || ragHealth.initialized, data: ragHealth });

      const embeddingHealth = await ragService.getEmbeddingHealth();
      results.push({ name: 'RAG Embedding Health', success: embeddingHealth.success !== false, data: embeddingHealth });
      
      const systemInfo = await llamaApi.getSystemInfo();
      results.push({ name: 'System Info', success: true, data: systemInfo });
      
      const wrappers = await llamaApi.getChatWrappers();
      results.push({ name: 'Chat Wrappers', success: wrappers.success, data: wrappers });
      
      const grammarList = await llamaApi.listGrammarTemplates();
      results.push({ name: 'Grammar Templates', success: grammarList.success, data: grammarList });
      if (grammarList.templates.includes('json')) {
        const grammar = await llamaApi.getGrammar('json');
        results.push({ name: 'JSON Grammar GBNF', success: grammar.success, data: grammar });
      }
      
      if (status.modelLoaded) {
        const embedding = await llamaApi.getEmbedding('test');
        results.push({ name: 'Embedding', success: embedding.success, data: embedding });
      }
      
      return {
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        results
      };
    }
  },
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  formatGenerationTime(ms?: string): string {
    if (!ms) return 'N/A';
    const num = parseFloat(ms);
    if (num < 1000) return `${num.toFixed(1)}ms`;
    if (num < 60000) return `${(num / 1000).toFixed(2)}s`;
    return `${(num / 60000).toFixed(1)}m`;
  },
  
  async getServerModelsAsXLAM(): Promise<XLAMModel[]> {
    try {
      const models = await llamaApi.getModels();
      return models.map(model => ({
        id: model.id || '',
        name: model.name || 'Unknown Model',
        parameters: model.parameters || '8B',
        updated: model.lastModified || (new Date().toISOString().split('T')[0] ?? ''),
        type: model.type || 'GGUF',
        description: model.description || '',
        isGGUF: true,
        capabilities: Array.isArray(model.capabilities) ? model.capabilities : [],
        available: model.available || false,
        active: model.active || false,
        size: model.size || 'N/A',
        sizeBytes: model.sizeBytes || 0,
        recommended: model.recommended || false,
        source: 'server' as const,
        modelKey: model.modelKey || model.id || '',
        file: model.file || '',
        path: model.path || ''
      }));
    } catch (error) {
      console.error('Error getting server models:', getErrorMessage(error));
      return [];
    }
  }
};
