// /home/user/projects/studioxlam/src/components/ModelCard.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { XLAMModel } from '../types';
import type { RootState } from '../store/store';
import { toggleFavorite } from '../store/modelsSlice';
import { cn } from '../lib/utils';
import { StatusPill } from './ui/status-pill';

interface ModelCardProps {
  model: XLAMModel;
  isStarting?: boolean;
  onStart?: () => void;
  onSelect: (model: XLAMModel) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, onSelect, onStart, isStarting = false }) => {
  const dispatch = useDispatch();
  const favorites = useSelector((state: RootState) => state.models.favorites);
  const isFavorite = favorites.includes(model.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleFavorite(model.id));
  };

  const handleSelect = () => {
    onSelect(model);
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart?.();
  };

  const isAvailable = model.available === true && model.source === 'server';
  const isLocalOnly = model.source === 'local' && !model.available;
  const isServerUnavailable = model.source === 'server' && !model.available;
  const isActive = model.active === true;

  // Проверка типа модели
  const isSaigaModel = model.name.toLowerCase().includes('saiga') || 
                       model.description?.toLowerCase().includes('saiga') ||
                       model.modelFamily === 'saiga';
  
  const isQwenModel = model.name.toLowerCase().includes('qwen') || 
                      model.modelFamily === 'qwen' ||
                      model.chatTemplate === 'chatml';
  
  const isXlamModel = model.name.toLowerCase().includes('xlam') || 
                      model.description?.toLowerCase().includes('xlam') ||
                      model.supportsTools === true;
  
  const isMistralModel = model.name.toLowerCase().includes('mistral') || 
                         model.modelFamily === 'mistral';
  
  const isLlamaModel = model.name.toLowerCase().includes('llama') || 
                       model.modelFamily === 'llama';

  const getStatusInfo = () => {
    if (isActive) {
      return {
        color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        text: '🟢 Активна',
        badgeColor: 'bg-green-500',
        description: 'Запущена на сервере'
      };
    }
    if (isAvailable) {
      return {
        color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        text: '✅ Доступна',
        badgeColor: 'bg-emerald-500',
        description: 'Готова к запуску'
      };
    }
    if (isLocalOnly) {
      return {
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        text: '🌐 Информация',
        badgeColor: 'bg-blue-500',
        description: 'Оригинальная модель'
      };
    }
    return {
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      text: '❌ Недоступна',
      badgeColor: 'bg-red-500',
      description: 'Файл отсутствует'
    };
  };

  const statusInfo = getStatusInfo();

  const getTypeInfo = () => {
    if (model.source === 'server') {
      if (isSaigaModel) {
        return {
          color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
          text: 'GGUF 🇷🇺'
        };
      } else if (isXlamModel) {
        return {
          color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
          text: 'GGUF 🔧'
        };
      } else if (isQwenModel) {
        return {
          color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
          text: 'GGUF 🐫'
        };
      }
      return {
        color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
        text: 'GGUF'
      };
    }
    return {
      color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      text: 'Original'
    };
  };

  const typeInfo = getTypeInfo();

  // Определение иконки модели
  const getModelIcon = () => {
    if (isSaigaModel) {
      return (
        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="text-xs font-bold">RU</span>
        </div>
      );
    } else if (isQwenModel) {
      return (
        <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span className="text-xs font-bold">Qwen</span>
        </div>
      );
    } else if (isXlamModel) {
      return (
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-bold">XLAM</span>
        </div>
      );
    } else if (isMistralModel) {
      return (
        <div className="flex items-center gap-1.5 text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-xs font-bold">MR</span>
        </div>
      );
    } else if (isLlamaModel) {
      return (
        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804l-1.2-1.6a1 1 0 010-1.2l1.2-1.6a1 1 0 00.3-.7V8.4a1 1 0 00-.3-.7l-1.2-1.6a1 1 0 010-1.2l1.2-1.6a1 1 0 01.8-.4h13.6a1 1 0 01.8.4l1.2 1.6a1 1 0 010 1.2l-1.2 1.6a1 1 0 00-.3.7v4.304a1 1 0 00.3.7l1.2 1.6a1 1 0 010 1.2l-1.2 1.6a1 1 0 01-.8.4H5.921a1 1 0 01-.8-.4z" />
          </svg>
          <span className="text-xs font-bold">LLM</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      onClick={handleSelect}
      className={cn(
        'group relative bg-background/50 border rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-colors duration-200 cursor-pointer flex flex-col min-w-0 overflow-hidden',
        isActive
          ? 'border-green-200 dark:border-green-800'
          : 'border-border hover:border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
        <div className="flex flex-wrap gap-1.5 min-w-0">
          <StatusPill variant={isActive ? 'success' : isAvailable ? 'info' : isLocalOnly ? 'neutral' : 'error'} dot className="max-w-full">
            {statusInfo.text.replace(/^[^\s]+\s/, '')}
          </StatusPill>
          <span className={cn('inline-flex items-center px-2 h-6 rounded-lg text-[11px]', typeInfo.color)}>
            {typeInfo.text}
          </span>
          {getModelIcon()}
        </div>

        <button 
          type="button"
          onClick={handleFavoriteClick}
          className={cn(
            'p-1.5 rounded-xl shrink-0 transition-colors',
            isFavorite
              ? 'text-amber-500 bg-amber-400/10'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {model.parameters && (
            <span className="text-[11px] font-mono bg-accent text-muted-foreground px-2 py-0.5 rounded-lg">
              {model.parameters}
            </span>
          )}
          {model.size && (
            <span className="text-[11px] font-mono bg-accent text-muted-foreground px-2 py-0.5 rounded-lg">
              {model.size}
            </span>
          )}
          {model.recommended && (
            <span className="text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg">
              рекомендуется
            </span>
          )}
          {model.supportsTools && (
            <span className="text-[11px] bg-accent text-muted-foreground px-2 py-0.5 rounded-lg">
              инструменты
            </span>
          )}
        </div>
        
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 break-words" title={model.name}>
          {model.name.split('/').pop()}
        </h3>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2 text-[11px] text-muted-foreground">
          <span>{model.updated ? `Обновлено ${model.updated}` : 'Недавно добавлена'}</span>
          {model.source === 'server' && (
            <span className="min-w-0 truncate max-w-full">
              {model.relativePath ? `в ${model.relativePath.split('/')[0]}` : 'Локальная'}
            </span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3 break-words">
          {model.description || 'Описание модели не указано'}
        </p>
        
        <p className="text-xs text-muted-foreground mb-3 break-words">
          {statusInfo.description}
          {isActive && model.source === 'server' && ' — можно использовать для генерации'}
          {isAvailable && model.source === 'server' && ' — можно запустить с сервера'}
        </p>
        
        <div className="mb-3 space-y-2">
          {isSaigaModel && (
            <div className="p-2.5 rounded-xl bg-accent/60 text-xs text-muted-foreground break-words">
              Русская Saiga — оптимизирована для диалогов на русском.
            </div>
          )}
          {isQwenModel && !isSaigaModel && (
            <div className="p-2.5 rounded-xl bg-accent/60 text-xs text-muted-foreground break-words">
              Qwen — мультиязычная instruct-модель, ChatML.
            </div>
          )}
          {isXlamModel && !isSaigaModel && !isQwenModel && (
            <div className="p-2.5 rounded-xl bg-accent/60 text-xs text-muted-foreground break-words">
              xLAM — вызов функций и инструменты.
            </div>
          )}
          {isLocalOnly && (
            <div className="p-2.5 rounded-xl bg-accent/60 text-xs text-muted-foreground break-words">
              Справочная модель. Для запуска используйте GGUF.
            </div>
          )}
          {isServerUnavailable && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-xs text-destructive break-words">
              Файл отсутствует. Загрузите .gguf в ~/models/
            </div>
          )}
        </div>
        
        {model.capabilities && model.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {model.capabilities.slice(0, 6).map((cap, index) => (
              <span 
                key={index} 
                className="text-[11px] bg-accent text-muted-foreground px-2 py-0.5 rounded-lg max-w-full truncate"
                title={cap}
              >
                {cap}
              </span>
            ))}
            {model.capabilities.length > 6 && (
              <span className="text-[11px] bg-accent text-muted-foreground px-2 py-0.5 rounded-lg">
                +{model.capabilities.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="pt-3 mt-auto border-t border-border/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
          <span className="font-medium">{model.type || 'GGUF'}</span>
          {model.chatTemplate && (
            <span className="font-mono bg-accent px-1.5 py-0.5 rounded-md truncate max-w-[9rem]" title={model.chatTemplate}>
              {model.chatTemplate}
            </span>
          )}
        </div>
        
        {isAvailable && !isActive ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium shrink-0 w-full min-w-0 sm:w-auto',
              isStarting
                ? 'bg-accent text-muted-foreground cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            )}
          >
            {isStarting ? 'Запуск…' : 'Запустить'}
          </button>
        ) : isActive ? (
          <StatusPill variant="success" dot>Активна</StatusPill>
        ) : (
          <span className="text-xs text-muted-foreground">
            {isLocalOnly ? 'Информация' : 'Недоступна'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ModelCard;
