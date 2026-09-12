import type { ModelInfo } from '../types';

function basename(value: string): string {
  return value.replace(/\\/g, '/').split('/').pop()?.trim() || '';
}

/** Short label of a GGUF/catalog model: file stem, without path. */
export function formatLoadedModelLabel(model?: Pick<ModelInfo, 'id' | 'name' | 'file' | 'parameters' | 'quantType'> | null): string {
  if (!model) return '';
  const raw = basename(model.name || model.file || model.id || '');
  const stem = raw.replace(/\.(gguf|bin|ggml)$/i, '');
  if (stem) return stem;
  return [model.parameters, model.quantType].filter(Boolean).join(' · ');
}

export function isQwenNamed(model?: Pick<ModelInfo, 'name' | 'id' | 'modelFamily'> | null): boolean {
  if (!model) return false;
  const haystack = `${model.modelFamily || ''} ${model.name || ''} ${model.id || ''}`.toLowerCase();
  return haystack.includes('qwen');
}

/** Qwen3 / 3.5 / 3.6 and similar — thinking / instruct modes. */
export function isQwenThinkingModel(model?: Pick<ModelInfo, 'name' | 'id' | 'modelFamily'> | null): boolean {
  if (!model || !isQwenNamed(model)) return false;
  const haystack = `${model.name || ''} ${model.id || ''}`.toLowerCase();
  return /qwen[\s._-]*3/.test(haystack) || haystack.includes('thinking');
}

export function formatQwenApiModelLabel(info?: {
  modelName?: string;
  model_name?: string;
  model?: string;
  name?: string;
  version?: string;
} | null): string {
  if (!info) return '';
  const candidates = [info.modelName, info.model_name, info.model, info.name];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return basename(value.trim());
  }
  return '';
}
