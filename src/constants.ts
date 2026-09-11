// /home/user/projects/studioxlam/src/constants.ts
import { XLAMModel } from './types';

export const XLAM_MODELS: XLAMModel[] = [
  {
    id: 'xLAM-v0.1-r',
    name: 'Salesforce/xLAM-v0.1-r',
    parameters: '47B',
    updated: '12 апр. 2025',
    type: 'Генерация текста',
    description: 'Базовая модель для задач, требующих глубоких рассуждений и действий.',
    isGGUF: false,
    capabilities: ['Рассуждение', 'Сложное планирование'],
    source: 'local',
    available: false,
    size: '94 GB'
  },
  {
    id: 'xLAM-1b-fc-r',
    name: 'Salesforce/xLAM-1b-fc-r',
    parameters: '1B',
    updated: '12 апр. 2025',
    type: 'Вызов функций',
    description: 'Высокоэффективная модель, оптимизированная специально для использования инструментов.',
    isGGUF: false,
    capabilities: ['Вызов функций', 'Низкая задержка'],
    source: 'local',
    available: false,
    size: '2 GB'
  },
  {
    id: 'xLAM-7b-fc-r',
    name: 'Salesforce/xLAM-7b-fc-r',
    parameters: '7B',
    updated: '12 апр. 2025',
    type: 'Генерация текста',
    description: 'Сбалансированная производительность для сложных сценариев использования инструментов.',
    isGGUF: false,
    capabilities: ['Рассуждение', 'Вызов функций', 'Код'],
    source: 'local',
    available: false,
    size: '14 GB'
  },
  {
    id: 'xLAM-8x7b-r',
    name: 'Salesforce/xLAM-8x7b-r',
    parameters: '47B',
    updated: '12 апр. 2025',
    type: 'Mixture of Experts',
    description: 'Архитектура MoE для широкого обобщения и высокой точности.',
    isGGUF: false,
    capabilities: ['Общие знания', 'Высокая точность'],
    source: 'local',
    available: false,
    size: '94 GB'
  },
  {
    id: 'xLAM-2-32b-fc-r',
    name: 'Salesforce/xLAM-2-32b-fc-r',
    parameters: '33B',
    updated: '6 мая 2025',
    type: 'Генерация текста',
    description: 'Модель действий следующего поколения со значительно улучшенным планированием.',
    isGGUF: false,
    capabilities: ['Продвинутое планирование', 'Длинный контекст'],
    source: 'local',
    available: false,
    size: '65 GB',
    recommended: true
  },
  {
    id: 'Llama-xLAM-2-70b-fc-r',
    name: 'Salesforce/Llama-xLAM-2-70b-fc-r',
    parameters: '71B',
    updated: '6 мая 2025',
    type: 'Генерация текста',
    description: 'Флагманская модель, использующая архитектуру Llama-3 для выполнения действий.',
    isGGUF: false,
    capabilities: ['SOTA Рассуждение', 'Сложные цепочки действий'],
    source: 'local',
    available: false,
    size: '140 GB',
    recommended: true
  }
];

export const BENCHMARK_SAMPLES = [
  {
    device: "RTX 4090",
    tps: 1850,
    latency: 45,
    memory: 24,
    precision: "FP16"
  },
  {
    device: "RTX 3090 (Эталон)",
    tps: 1500,
    latency: 50,
    memory: 24,
    precision: "FP16"
  },
  {
    device: "RTX 3080",
    tps: 1200,
    latency: 55,
    memory: 12,
    precision: "FP16"
  },
  {
    device: "RTX 3060",
    tps: 800,
    latency: 65,
    memory: 12,
    precision: "FP16"
  },
  {
    device: "Apple M3 Max",
    tps: 950,
    latency: 70,
    memory: 36,
    precision: "FP16"
  },
  {
    device: "CPU (i9-13900K)",
    tps: 150,
    latency: 120,
    memory: 64,
    precision: "FP32"
  }
];