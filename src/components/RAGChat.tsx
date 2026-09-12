// /home/user/projects/studioxlam/src/components/RAGChat.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  sendRAGQueryStream, 
  loadRAGHistory, 
  clearRAGHistory, 
  checkRAGDatabase, 
  loadRAGMetrics,
  refreshRAGSchema,
  bootstrapRAG,
  refreshRAGSessions,
  createRAGSession,
  deleteRAGSession,
  renameRAGSession,
  addMessage,
  clearMessages,
  setSessionId,
  setLoading,
  setError,
  setSearchMode,
  setQuerySettings,
  loadRAGEmbeddingHealth,
} from '../store/ragSlice';
import { getRagDefaults } from '../config/runtimeConfig';
import type { RAGSource, RAGGeneratedFile } from '../types';
import { saveLocalRagSessionStore } from '../services/ragService';
import { usePanelScroll, useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';
import RAGSessionSidebar from './RAGSessionSidebar';
import RAGFilesSidebar from './RAGFilesSidebar';
import ragService, { type QwenInfoResponse } from '../services/ragService';
import userFilesService, { isPdfFile, userFileStatusLabel } from '../services/userFilesService';
import type { RagDocumentPreview } from '../types';
import { RAGMessage } from '../types';
import 'katex/dist/katex.min.css';
import { confirmDialog } from '../services/dialogService';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';
import { InlineError, InlineSuccess } from './ui/alert-banner';
import { IconButton } from './ui/icon-button';
import { StatusPill } from './ui/status-pill';
import { MenuPopover } from './ui/menu-popover';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { FormInput, FormLabel } from './ui/form-field';
import { SelectMenu } from './ui/select-menu';
import { isWorkspaceOverlay, WORKSPACE_OVERLAY_MQ, WORKSPACE_PHONE_MQ } from '../utils/workspaceLayout';

interface RAGChatProps {
  isDarkMode: boolean;
}

interface TableInfo {
  name: string;
  columns: Array<{name: string; type: string; nullable: boolean}>;
  columnCount: number;
  rowCount: number;
  schema?: string;
}

interface QwenInfo {
  isQwen36: boolean;
  enableThinking: boolean;
  preserveThinking: boolean;
  mode: string;
  availableModes: string[];
}

function isQwenInfo(data: QwenInfoResponse): data is QwenInfoResponse & { success: true } {
  return data.success === true;
}

// Иконки с оптимизированными размерами
const Icon = ({ children, className = "w-5 h-5" }: { children: React.ReactNode, className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {children}
  </svg>
);

const UploadIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></Icon>;
const RefreshIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></Icon>;
const TrashIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></Icon>;
const SendIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></Icon>;
const DatabaseIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></Icon>;
const CloseIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></Icon>;
const FolderIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></Icon>;
const PanelLeftIcon = () => (
  <Icon className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16" />
  </Icon>
);
const PanelRightIcon = () => (
  <Icon className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 4v16" />
  </Icon>
);
const TableIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></Icon>;
const ClearIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></Icon>;
const VectorIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></Icon>;
const CopyIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></Icon>;
const ThinkingIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></Icon>;
const LLMIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></Icon>;
const DirectIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></Icon>;
const SettingsIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></Icon>;
const MoreIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" /></Icon>;

type ChartData = NonNullable<RAGMessage['chart_data']>;

// Компонент графика
const ChartDisplay = ({ chartData }: { chartData: ChartData }) => {
  if (!chartData) return null;
  
  if (chartData.type === 'line' || chartData.type === 'bar') {
    const maxY = Math.max(...(chartData.y_axis || []), 1);
    const bars = chartData.y_axis?.map((value: number, idx: number) => ({
      label: chartData.x_axis?.[idx] || idx,
      value,
      percent: (value / maxY) * 100
    }));

    return (
      <div className="mt-4 p-4 bg-background/50 dark:bg-muted/50 rounded-lg overflow-x-auto">
        <div className="text-sm font-medium mb-2">{chartData.title || 'График'}</div>
        <div className="flex items-end gap-2 h-40 min-w-[200px]">
          {bars?.map((bar: { label: string | number; value: number; percent: number }, idx: number) => (
            <div key={idx} className="flex-1 flex flex-col items-center min-w-[30px]">
              <div 
                className="w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                style={{ height: `${bar.percent}%`, minHeight: '4px' }}
              />
              <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-full" title={String(bar.label)}>
                {String(bar.label).slice(0, 10)}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">{bar.value}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{chartData.x_label || 'X'}</span>
          <span>{chartData.y_label || 'Y'}</span>
        </div>
      </div>
    );
  }
  
  if (chartData.type === 'pie' && chartData.labels && chartData.values) {
    const values = chartData.values;
    const total = values.reduce((a: number, b: number) => a + b, 0);
    return (
      <div className="mt-4 p-4 bg-background/50 dark:bg-muted/50 rounded-lg">
        <div className="text-sm font-medium mb-2">{chartData.title || 'Распределение'}</div>
        <div className="space-y-2">
          {chartData.labels.map((label: string, idx: number) => {
            const value = values[idx] ?? 0;
            const percent = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={idx}>
                <div className="flex justify-between text-xs flex-wrap gap-1">
                  <span className="truncate">{label}</span>
                  <span>{value} ({percent.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-border dark:bg-muted rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  return null;
};

const VECTOR_DOC_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'html', 'htm', 'xml',
]);

function isVectorDocumentFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return VECTOR_DOC_EXTENSIONS.has(ext);
}

async function ingestPdfFile(
  file: File,
  onProgress: (percent: number) => void,
  onStatus: (message: string) => void
) {
  const uploaded = await userFilesService.uploadPdf(file, onProgress);
  onStatus(uploaded.statusMessage || 'PDF принят, запущен OCR…');
  const done = await userFilesService.poll(uploaded.id, (current) => {
    onProgress(Math.max(current.progress, 5));
    onStatus(current.statusMessage || userFileStatusLabel(current.status));
  });
  if (done.status === 'error') {
    throw new Error(done.error || `Ошибка обработки «${file.name}»`);
  }
  return done;
}

const RAGSourcesList = ({
  sources,
  onOpenDocument,
}: {
  sources: RAGSource[];
  onOpenDocument?: (source: string) => void;
}) => {
  if (!sources.length) return null;
  return (
    <div className="mt-3 pt-2 border-t border-border">
      <div className="text-xs font-semibold mb-2">📎 Источники</div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <button
            key={`${source.source}-${source.similarity ?? 0}`}
            type="button"
            onClick={() => onOpenDocument?.(source.source)}
            className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:underline"
            title={source.similarity != null ? `Релевантность ${Math.round(source.similarity * 100)}%` : undefined}
          >
            {source.source}
            {source.similarity != null ? ` (${Math.round(source.similarity * 100)}%)` : ''}
          </button>
        ))}
      </div>
    </div>
  );
};

const RAGGeneratedFilesList = ({ files }: { files: RAGGeneratedFile[] }) => {
  if (!files.length) return null;
  return (
    <div className="mt-3 pt-2 border-t border-border">
      <div className="text-xs font-semibold mb-2">📄 Сгенерированные файлы</div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={file.id ?? `${file.name ?? 'file'}-${index}`} className="text-xs">
            {file.id ? (
              <button
                type="button"
                onClick={() => void ragService.downloadArtifact(file.id!, file.name)}
                className="text-primary hover:underline"
              >
                {file.name ?? `Отчёт ${index + 1}`}
              </button>
            ) : (
              <span>{file.name ?? `Файл ${index + 1}`}</span>
            )}
            {file.content && (
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap bg-accent p-2 rounded">
                {file.content.slice(0, 500)}
                {file.content.length > 500 ? '…' : ''}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Компонент для отображения think блоков Qwen3.6
const ThinkBlockDisplay = ({ thinkBlocks }: { thinkBlocks: string[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinkBlocks || thinkBlocks.length === 0) return null;
  
  return (
    <div className="mt-2 mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
      >
        <ThinkingIcon />
        <span>{isExpanded ? 'Скрыть' : 'Показать'} рассуждения модели</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500">
          <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">🧠 Рассуждения модели:</div>
          {thinkBlocks.map((block, idx) => (
            <div key={idx} className="text-xs text-muted-foreground whitespace-pre-wrap">
              {block}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Основной компонент форматированного сообщения с поддержкой формул и кода
const FormattedMessage: React.FC<{ content: string; isDarkMode: boolean; isUser?: boolean; isStreaming?: boolean; thinkBlocks?: string[]; searchMode?: string }> = ({ 
  content, 
  isDarkMode, 
  isUser = false,
  isStreaming = false,
  thinkBlocks,
  searchMode
}) => {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopyCode = async (code: string, blockId: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  if (isUser) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {content}
      </div>
    );
  }

  if (!content || content.trim() === '') {
    return (
      <div className="text-muted-foreground italic">
        {isStreaming ? 'Ожидание первого токена...' : 'Пустой ответ от модели'}
        {isStreaming && <span className="inline-block ml-1 animate-pulse">▊</span>}
      </div>
    );
  }

  return (
    <>
      {thinkBlocks && thinkBlocks.length > 0 && <ThinkBlockDisplay thinkBlocks={thinkBlocks} />}
      {searchMode && (
        <div className="mb-2 text-[10px] text-muted-foreground flex items-center gap-1">
          {searchMode === 'direct' ? '💾 Прямой поиск по БД' : '🤖 Поиск через LLM'}
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            const codeString = String(children).replace(/\n$/, '');
            const blockId = Math.random().toString(36);
            
            if (!isInline && match) {
              const language = match[1];
              const style = isDarkMode ? vscDarkPlus : vs;
              
              return (
                <div className="relative group my-3 rounded-lg overflow-hidden">
                  <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyCode(codeString, blockId)}
                      className="p-1.5 bg-muted hover:bg-accent text-foreground rounded-md text-xs transition-colors"
                      title="Копировать код"
                    >
                      {copiedBlock === blockId ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground px-3 pt-1.5 pb-0 bg-muted/50 dark:bg-card/50">
                    {language}
                  </div>
                  <SyntaxHighlighter
                    style={style as Record<string, React.CSSProperties>}
                    language={language}
                    PreTag="div"
                    className="!m-0 !rounded-none text-sm overflow-x-auto"
                    showLineNumbers={codeString.split('\n').length > 1}
                    wrapLines={true}
                    lineNumberStyle={{ 
                      minWidth: '2.5em', 
                      paddingRight: '1em', 
                      color: '#6b7280',
                      userSelect: 'none'
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code 
                className={`${className || ''} bg-accent px-1.5 py-0.5 rounded-md text-sm font-mono text-red-600 dark:text-red-400 break-words`} 
                {...props}
              >
                {children}
              </code>
            );
          },
          
          pre({ children }) {
            return <div className="overflow-x-auto max-w-full">{children}</div>;
          },
          
          a({ href, children }) {
            if (!href) return <span>{children}</span>;
            const isExternal = href.startsWith('http') || href.startsWith('https');
            return (
              <a 
                href={href} 
                target={isExternal ? "_blank" : "_self"}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-primary hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors break-words"
              >
                {children}
                {isExternal && (
                  <svg className="inline-block w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </a>
            );
          },
          
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 shadow-sm rounded-lg border border-border">
                <table className="min-w-full border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          
          thead({ children }) {
            return <thead className="bg-background/50 dark:bg-muted/50">{children}</thead>;
          },
          
          th({ children }) {
            return (
              <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                {children}
              </th>
            );
          },
          
          td({ children }) {
            return (
              <td className="border border-border px-3 py-2 text-foreground/80">
                {children}
              </td>
            );
          },
          
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 my-3 rounded-r-lg">
                <div className="text-foreground/80 italic">{children}</div>
              </blockquote>
            );
          },
          
          ul({ children }) {
            return <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>;
          },
          
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>;
          },
          
          li({ children }) {
            return <li className="my-1 leading-relaxed">{children}</li>;
          },
          
          h1({ children }) {
            return <h1 className="text-2xl font-bold my-4 pb-2 border-b-2 border-border break-words">{children}</h1>;
          },
          
          h2({ children }) {
            return <h2 className="text-xl font-bold my-3 pb-1.5 border-b border-border break-words">{children}</h2>;
          },
          
          h3({ children }) {
            return <h3 className="text-lg font-bold my-2.5 text-blue-700 dark:text-blue-300 break-words">{children}</h3>;
          },
          
          h4({ children }) {
            return <h4 className="text-base font-bold my-2 break-words">{children}</h4>;
          },
          
          p({ children }) {
            return <p className="my-2.5 leading-relaxed break-words">{children}</p>;
          },
          
          hr() {
            return <hr className="my-4 border-t border-border" />;
          },
          
          strong({ children }) {
            return <strong className="font-bold text-blue-700 dark:text-blue-300 break-words">{children}</strong>;
          },
          
          em({ children }) {
            return <em className="italic text-muted-foreground break-words">{children}</em>;
          },
          
          span({ className, children }) {
            if (className?.includes('katex')) {
              return <span className={className}>{children}</span>;
            }
            return <span className="break-words">{children}</span>;
          },
          
          img({ src, alt }) {
            return (
              <img 
                src={src} 
                alt={alt} 
                className="max-w-full h-auto rounded-lg my-2"
                loading="lazy"
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </>
  );
};

const RAGChat: React.FC<RAGChatProps> = ({ isDarkMode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    messages,
    isLoading,
    isStreaming,
    databaseStatus,
    metrics,
    error: ragError,
    searchMode,
    sessionId,
    sessions,
    isSessionsLoaded,
    querySettings,
    embeddingHealth,
  } = useSelector((state: RootState) => state.rag);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { getToggle, setToggle } = useWorkspacePanel(PANEL_IDS.RAG_CHAT, 'chat');
  const showSessionSidebar = getToggle('sessionListOpen', true);
  const setShowSessionSidebar = (value: boolean) => setToggle('sessionListOpen', value);
  const showFilesSidebar = getToggle('filesListOpen', true);
  const setShowFilesSidebar = (value: boolean) => setToggle('filesListOpen', value);
  const [highlightFileSource, setHighlightFileSource] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLButtonElement>(null);
  const closeSessionSidebarIfMobile = () => {
    if (isWorkspaceOverlay()) setShowSessionSidebar(false);
  };
  const showUploadModal = getToggle('showUploadModal', false);
  const setShowUploadModal = (value: boolean) => setToggle('showUploadModal', value);
  const batchMode = getToggle('batchMode', false);
  const setBatchMode = (value: boolean) => setToggle('batchMode', value);
  const showTableList = getToggle('showTableList', false);
  const setShowTableList = (value: boolean) => setToggle('showTableList', value);
  const showQwenSettings = getToggle('showQwenSettings', false);
  const setShowQwenSettings = (value: boolean) => setToggle('showQwenSettings', value);
  const enableThinking = getToggle('enableThinking', true);
  const setEnableThinking = (value: boolean) => setToggle('enableThinking', value);
  const preserveThinking = getToggle('preserveThinking', false);
  const setPreserveThinking = (value: boolean) => setToggle('preserveThinking', value);
  const [input, setInput] = useState('');
  const scrollRef = usePanelScroll(PANEL_IDS.RAG_CHAT, 'chat', { restore: false });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<(() => void) | null>(null);
  
  // Состояния для загрузки данных
  const [selectedDocumentSources, setSelectedDocumentSources] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareDocumentSources, setCompareDocumentSources] = useState<string[]>([]);
  const [selectedTableNames, setSelectedTableNames] = useState<string[]>([]);
  const [showRagSettings, setShowRagSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentPreview, setDocumentPreview] = useState<RagDocumentPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState('');
  const [ifExists, setIfExists] = useState<'replace' | 'append' | 'skip'>('replace');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  
  // Состояния для toast-уведомлений
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  // Состояния для векторного поиска
  const [uploadType, setUploadType] = useState<'vector' | 'sql'>('vector');
  const [useAutoTableName, setUseAutoTableName] = useState(true);
  const [excelToText, setExcelToText] = useState(true);
  const [summaryMode, setSummaryMode] = useState<'detailed' | 'summary'>('summary');
  
  // Qwen3.6 состояния
  const [qwenInfo, setQwenInfo] = useState<QwenInfo | null>(null);
  const [qwenMode, setQwenMode] = useState<string>('auto');
  const [availableModes, setAvailableModes] = useState<string[]>(['auto', 'thinking', 'instruct', 'coding']);

  // ========== showToast ОПРЕДЕЛЯЕМ ПЕРВЫМ (ПЕРЕД ВСЕМИ CALLBACK-ФУНКЦИЯМИ) ==========
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const loadTables = useCallback(async () => {
    setIsLoadingTables(true);
    try {
      const data = await ragService.getTables();
      if (data.success) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  }, []);

  const loadQwenInfo = useCallback(async () => {
    try {
      const data = await ragService.getQwenInfo();
      if (isQwenInfo(data)) {
        setQwenInfo(data);
        if (data.isQwen36) {
          setEnableThinking(data.enableThinking);
          setPreserveThinking(data.preserveThinking);
          setQwenMode(data.mode || 'auto');
          if (data.availableModes) setAvailableModes(data.availableModes);
        }
      }
    } catch (error) {
      console.error('Failed to load Qwen info:', error);
    }
  }, []);

  const updateQwenConfig = useCallback(async () => {
    try {
      const data = await ragService.updateQwenConfig({
        enableThinking,
        preserveThinking,
        qwenMode: qwenMode !== 'auto' ? qwenMode : undefined,
      });
      if (data.success) {
        showToast('Настройки Qwen3.6 обновлены', 'success');
        void loadQwenInfo();
      } else {
        showToast(data.message || 'Ошибка обновления настроек', 'error');
      }
    } catch (error) {
      console.error('Failed to update Qwen config:', error);
      showToast('Ошибка обновления настроек', 'error');
    }
  }, [enableThinking, preserveThinking, qwenMode, loadQwenInfo, showToast]);

  const loadDocumentPreview = useCallback(
    async (file: File) => {
      if (uploadType !== 'vector' || batchMode) {
        setDocumentPreview(null);
        return;
      }
      setIsPreviewLoading(true);
      try {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const preview = await ragService.previewDocument(file, {
          ifExists,
          chunking_mode: summaryMode,
          content_format: isExcel && excelToText ? 'text' : undefined,
          original_source: file.name,
        });
        setDocumentPreview(preview);
      } catch (error) {
        setDocumentPreview({
          success: false,
          error: error instanceof Error ? error.message : 'Preview failed',
        });
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [uploadType, batchMode, ifExists, summaryMode, excelToText]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = scrollRef.current;
    if (container) {
      if (behavior === 'smooth') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleUpload = async () => {
    if (batchMode) {
      if (selectedFiles.length === 0) {
        setUploadError('Выберите один или несколько файлов');
        return;
      }
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(null);
      try {
        if (uploadType === 'vector') {
          const invalid = selectedFiles.filter((file) => !isVectorDocumentFile(file));
          if (invalid.length > 0) {
            setUploadError(
              `Недопустимые файлы для документов: ${invalid.map((f) => f.name).join(', ')}. Excel/CSV загружайте через SQL.`
            );
            setIsUploading(false);
            return;
          }
          const pdfs = selectedFiles.filter(isPdfFile);
          const others = selectedFiles.filter((file) => !isPdfFile(file));
          let pdfDone = 0;
          for (const pdf of pdfs) {
            const done = await ingestPdfFile(
              pdf,
              (progress) => setUploadProgress(progress),
              (message) => setUploadSuccess(`${pdf.name}: ${message}`)
            );
            pdfDone += 1;
            if (done.ragSource) {
              setSelectedDocumentSources((prev) =>
                prev.includes(done.ragSource!) ? prev : [...prev, done.ragSource!]
              );
            }
          }
          if (others.length > 0) {
            const result = await ragService.uploadDocumentsBatch(
              others,
              {
                ifExists,
                chunking_mode: summaryMode,
                content_format: excelToText ? 'text' : undefined,
              },
              (progress) => setUploadProgress(progress)
            );
            setUploadSuccess(
              `✅ PDF: ${pdfDone}, документы: ${result.results.length}` +
                (result.failed.length ? `, ошибок: ${result.failed.length}` : '')
            );
          } else {
            setUploadSuccess(`✅ Обработано PDF: ${pdfDone}`);
          }
        } else {
          const result = await ragService.uploadBatchWithProgress(
            selectedFiles,
            { tableNamePrefix: tableName.trim() || 'upload_', ifExists },
            (progress) => setUploadProgress(progress)
          );
          setUploadSuccess(
            `✅ Пакет: ${result.success_count}/${result.total} успешно`
          );
        }
        setSelectedFiles([]);
        setSelectedFile(null);
        void loadTables();
        dispatch(refreshRAGSchema());
        dispatch(checkRAGDatabase());
        setTimeout(() => {
          setShowUploadModal(false);
          setShowFilesSidebar(true);
          setUploadSuccess(null);
        }, 2000);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Ошибка пакетной загрузки');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!selectedFile) {
      setUploadError('Пожалуйста, выберите файл');
      return;
    }

    if (uploadType === 'vector' && !isVectorDocumentFile(selectedFile)) {
      setUploadError('Для векторного поиска используйте PDF, DOCX, TXT, MD и другие документы. Excel/CSV — через SQL-загрузку.');
      return;
    }

    const finalTableName = uploadType === 'vector'
      ? 'vector_store'
      : tableName.trim();

    if (uploadType === 'vector' && useAutoTableName) {
      setTableName('vector_store');
    }

    if (uploadType === 'sql' && !finalTableName) {
      setUploadError('Пожалуйста, введите название таблицы');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      if (uploadType === 'vector') {
        if (isPdfFile(selectedFile)) {
          const done = await ingestPdfFile(
            selectedFile,
            (progress) => setUploadProgress(progress),
            (message) => setUploadSuccess(message)
          );
          if (done.ragSource) {
            setSelectedDocumentSources((prev) =>
              prev.includes(done.ragSource!) ? prev : [...prev, done.ragSource!]
            );
          }
          setUploadSuccess(
            `✅ PDF «${selectedFile.name}» готов` +
              (done.ragSource ? ` → ${done.ragSource}` : '')
          );
          setSelectedFile(null);
          void dispatch(loadRAGEmbeddingHealth());
          setTimeout(() => {
            setShowUploadModal(false);
            setShowFilesSidebar(true);
            setUploadSuccess(null);
          }, 2000);
          return;
        }

        const isExcel =
          selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

        const response = await ragService.uploadDocumentWithProgress(
          selectedFile,
          {
            ifExists,
            chunking_mode: summaryMode,
            content_format: isExcel && excelToText ? 'text' : undefined,
            original_source: selectedFile.name,
          },
          (progress) => setUploadProgress(progress)
        );

        const chunkInfo = response.chunks != null ? `${response.chunks} чанков` : 'индексация';
        setUploadSuccess(
          `✅ Документ «${response.source ?? selectedFile.name}» загружен (${chunkInfo})`
        );
        setSelectedFile(null);
        loadTables();
        dispatch(refreshRAGSchema());
        dispatch(checkRAGDatabase());
        setTimeout(() => {
          setShowUploadModal(false);
          setShowFilesSidebar(true);
          setUploadSuccess(null);
        }, 2000);
      } else {
        const response = await ragService.uploadTableWithProgress(
          selectedFile,
          { tableName: finalTableName, ifExists },
          (progress) => setUploadProgress(progress)
        );

        setUploadSuccess(
          `✅ ${response.message} (${response.rowsInserted ?? response.rowCount} строк)`
        );
        setSelectedFile(null);
        setTableName('');
        loadTables();
        dispatch(refreshRAGSchema());
        dispatch(checkRAGDatabase());
        setTimeout(() => {
          setShowUploadModal(false);
          setShowFilesSidebar(true);
          setUploadSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTable = async (tableName: string) => {
    const confirmed = await confirmDialog({
      title: 'Удалить таблицу?',
      description: `Вы уверены, что хотите удалить таблицу "${tableName}"? Это действие нельзя отменить.`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;

    try {
      const data = await ragService.deleteTable(tableName, true);
      if (data.success) {
        setUploadSuccess(`✅ Таблица "${tableName}" удалена`);
        void loadTables();
        dispatch(refreshRAGSchema());
        dispatch(checkRAGDatabase());
        setTimeout(() => setUploadSuccess(null), 3000);
      } else {
        setUploadError(data.message);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleClearTable = async (tableName: string) => {
    const confirmed = await confirmDialog({
      title: 'Очистить таблицу?',
      description: `Вы уверены, что хотите очистить все данные из таблицы "${tableName}"?`,
      destructive: true,
      confirmLabel: 'Очистить',
    });
    if (!confirmed) return;

    try {
      const data = await ragService.clearTable(tableName);
      if (data.success) {
        setUploadSuccess(`✅ Таблица "${tableName}" очищена`);
        setTimeout(() => setUploadSuccess(null), 3000);
      } else {
        setUploadError(data.message);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка очистки');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (batchMode) {
      setSelectedFiles(files.slice(0, 20));
      setSelectedFile(null);
      setUploadError(null);
      return;
    }

    const file = files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const sqlExts = ['csv', 'json', 'xlsx', 'xls'];
    const allowed = uploadType === 'vector' ? VECTOR_DOC_EXTENSIONS.has(ext) : sqlExts.includes(ext);

    if (allowed) {
      setSelectedFile(file);
      setUploadError(null);
      void loadDocumentPreview(file);
    } else {
      setUploadError(`Неподдерживаемый формат: .${ext}`);
    }
  };

  const toggleTableExpand = (tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  // Переключение режима поиска
  const handleSearchModeToggle = useCallback(() => {
    const newMode = searchMode === 'llm' ? 'direct' : 'llm';
    dispatch(setSearchMode(newMode));
    showToast(
      newMode === 'llm'
        ? '🤖 Режим: RAG-чат со стримингом (POST /query/stream)'
        : '🔍 Режим: Поиск фрагментов (POST /search, без LLM)',
      'info'
    );
  }, [searchMode, dispatch, showToast]);

  const handleStopGeneration = () => {
    streamAbortRef.current?.();
    streamAbortRef.current = null;
    dispatch(setLoading(false));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const created = await dispatch(createRAGSession('Новая сессия')).unwrap();
        activeSessionId = created.sessionId;
        syncSessionUrl(created.sessionId);
      } catch (error) {
        showToast(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Не удалось создать сессию', 'error');
        return;
      }
    }

    if (compareMode && compareDocumentSources.length < 2) {
      showToast('Для сравнения выберите минимум 2 документа в библиотеке', 'error');
      return;
    }

    const attachedFiles =
      selectedDocumentSources.length > 0
        ? selectedDocumentSources.map((name) => ({
            name,
            type: 'document',
            role: compareMode ? 'compare_with' : 'context',
          }))
        : undefined;

    const userMessage: RAGMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      metrics: {},
      sql: '',
      explanation: '',
      row_count: 0,
      execution_time: 0,
      search_mode: searchMode,
      attached_files: attachedFiles,
    };

    const history = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    dispatch(addMessage(userMessage));
    setInput('');
    dispatch(setLoading(true));

    streamAbortRef.current?.();

    const compareDocs =
      compareMode && compareDocumentSources.length >= 2 ? compareDocumentSources : undefined;
    const queryIntent =
      compareDocs
        ? 'document' as const
        : selectedTableNames.length > 0
          ? 'sql' as const
          : selectedDocumentSources.length > 0 && searchMode === 'llm'
            ? 'document' as const
            : undefined;

    const queryAction = dispatch(
      sendRAGQueryStream({
        query: userMessage.content,
        sessionId: activeSessionId,
        qwenParams: {
          enableThinking,
          preserveThinking,
          qwenMode: qwenMode !== 'auto' ? qwenMode : undefined,
        },
        searchMode,
        history,
        intent: queryIntent,
        documentSources:
          compareDocs ? undefined : selectedDocumentSources.length > 0 ? selectedDocumentSources : undefined,
        compareDocuments: compareDocs,
        tableNames: selectedTableNames.length > 0 ? selectedTableNames : undefined,
        attachedFiles,
      })
    );
    streamAbortRef.current = queryAction.abort;

    try {
      await queryAction.unwrap();
    } catch (error) {
      console.error('RAG stream error:', error);
      dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      dispatch(setLoading(false));
      streamAbortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirmDialog({
      title: 'Очистить историю?',
      description: 'Очистить всю историю запросов?',
      destructive: true,
      confirmLabel: 'Очистить',
    });
    if (!confirmed) return;
    await dispatch(clearRAGHistory(sessionId)).unwrap();
    dispatch(clearMessages());
  };

  const syncSessionUrl = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('session', id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === sessionId) {
        closeSessionSidebarIfMobile();
        return;
      }
      streamAbortRef.current?.();
      dispatch(clearMessages());
      dispatch(setSessionId(id));
      syncSessionUrl(id);
      closeSessionSidebarIfMobile();
    },
    [dispatch, sessionId, syncSessionUrl]
  );

  const handleNewSession = useCallback(async () => {
    streamAbortRef.current?.();
    try {
      const session = await dispatch(createRAGSession('Новая сессия')).unwrap();
      syncSessionUrl(session.sessionId);
      closeSessionSidebarIfMobile();
    } catch (error) {
      showToast(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Не удалось создать сессию', 'error');
    }
  }, [dispatch, syncSessionUrl, showToast]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await dispatch(deleteRAGSession(id)).unwrap();
        showToast('Сессия удалена', 'success');
      } catch (error) {
        console.error('Failed to delete RAG session:', error);
        showToast('Не удалось удалить сессию', 'error');
      }
    },
    [dispatch, showToast]
  );

  const handleRenameSession = useCallback(
    async (id: string, title: string) => {
      try {
        await dispatch(renameRAGSession({ sessionId: id, title, userId })).unwrap();
        showToast('Сессия переименована', 'success');
      } catch (error) {
        console.error('Failed to rename RAG session:', error);
        showToast('Не удалось переименовать сессию', 'error');
      }
    },
    [dispatch, showToast, userId]
  );

  const handleRefreshSessions = useCallback(() => {
    void dispatch(refreshRAGSessions(userId));
  }, [dispatch, userId]);

  const handleRefreshSchema = async () => {
    await dispatch(refreshRAGSchema()).unwrap();
    await dispatch(checkRAGDatabase()).unwrap();
    await loadTables();
    showToast('Схема базы данных обновлена', 'success');
  };

  const handleUploadTypeChange = (type: 'vector' | 'sql') => {
    setUploadType(type);
    if (type === 'vector') {
      setUseAutoTableName(true);
      setTableName('vector_store');
      setExcelToText(true);
    } else {
      setUseAutoTableName(false);
      setTableName('');
      setExcelToText(false);
    }
  };

  const getModeDisplayName = (mode: string) => {
    const names: Record<string, string> = {
      auto: '🤖 Авто',
      thinking: '🧠 Рассуждения',
      instruct: '⚡ Быстрый',
      coding: '💻 Программирование'
    };
    return names[mode] || mode;
  };

  const getModeDescription = (mode: string) => {
    const descriptions: Record<string, string> = {
      auto: 'Автоматический выбор режима по запросу',
      thinking: 'Режим рассуждений - для сложных аналитических задач',
      instruct: 'Быстрый режим - для простых вопросов',
      coding: 'Режим программирования - для генерации SQL и кода'
    };
    return descriptions[mode] || '';
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString();
  };

  const isConnected = databaseStatus?.connected || false;
  const tablesCount = databaseStatus?.tables_count || 0;
  const isQwenActive = qwenInfo?.isQwen36 || false;

  // ========== useEffect'ы ==========
  useEffect(() => {
    const defaults = getRagDefaults();
    if (defaults) {
      dispatch(
        setQuerySettings({
          limit: defaults.limit,
          relevanceScore: defaults.relevanceScore,
        })
      );
    }
    dispatch(checkRAGDatabase());
    dispatch(loadRAGMetrics());
    dispatch(loadRAGEmbeddingHealth());
    loadTables();
    loadQwenInfo();
    if (!isSessionsLoaded) {
      void dispatch(bootstrapRAG(userId));
    }
  }, [dispatch, loadTables, loadQwenInfo, isSessionsLoaded, userId]);

  useEffect(() => {
    if (!isSessionsLoaded || !sessionId) return;
    syncSessionUrl(sessionId);
    void dispatch(loadRAGHistory(sessionId));
  }, [dispatch, sessionId, syncSessionUrl, isSessionsLoaded]);

  useEffect(() => {
    if (!userId || !isSessionsLoaded) return;
    if (sessionId && sessions.length > 0 && !sessions.some((s) => s.sessionId === sessionId)) {
      return;
    }
    saveLocalRagSessionStore(userId, sessions, sessionId);
  }, [sessions, sessionId, userId, isSessionsLoaded]);

  useEffect(() => {
    const phone = window.matchMedia(WORKSPACE_PHONE_MQ);
    const overlay = window.matchMedia(WORKSPACE_OVERLAY_MQ);
    if (phone.matches) {
      setToggle('sessionListOpen', false);
      setToggle('filesListOpen', false);
    } else if (overlay.matches) {
      setToggle('filesListOpen', false);
    }
    const onPhone = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      setToggle('sessionListOpen', false);
      setToggle('filesListOpen', false);
    };
    const onOverlay = (event: MediaQueryListEvent) => {
      if (event.matches) setToggle('filesListOpen', false);
    };
    phone.addEventListener('change', onPhone);
    overlay.addEventListener('change', onOverlay);
    return () => {
      phone.removeEventListener('change', onPhone);
      overlay.removeEventListener('change', onOverlay);
    };
  }, [setToggle]);

  useLayoutEffect(() => {
    scrollToBottom('auto');
    const frame = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, isStreaming, scrollToBottom]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    if (selectedFile && uploadType === 'vector' && !batchMode && !isPdfFile(selectedFile)) {
      void loadDocumentPreview(selectedFile);
    } else {
      setDocumentPreview(null);
    }
  }, [selectedFile, uploadType, batchMode, ifExists, summaryMode, excelToText, loadDocumentPreview]);

  return (
    <div className="flex h-full w-full overflow-hidden glass-panel text-foreground">
      <button
        type="button"
        className={cn(
          celestia.workspaceScrim,
          showSessionSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-label="Закрыть панель сессий"
        onClick={() => setShowSessionSidebar(false)}
      />

      <RAGSessionSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        isLoading={!isSessionsLoaded}
        isSessionsLoaded={isSessionsLoaded}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onRefresh={handleRefreshSessions}
        onClose={() => setShowSessionSidebar(false)}
        open={showSessionSidebar}
      />

      <div className="@container/ragchat flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Toast уведомление */}
      {toastMessage && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto z-50 animate-in slide-in-from-top-2 duration-300 max-w-sm">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
 toastType === 'success' 
              ? 'bg-green-500 text-white' 
              : toastType === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white'
          }`}>
            {toastMessage}
          </div>
        </div>
      )}

      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <IconButton
              label={showSessionSidebar ? 'Скрыть список сессий' : 'Показать список сессий'}
              onClick={() => {
                const next = !showSessionSidebar;
                if (next && isWorkspaceOverlay()) setShowFilesSidebar(false);
                setShowSessionSidebar(next);
              }}
              className={cn(celestia.headerIcon, '-ml-0.5', showSessionSidebar && 'bg-accent text-foreground')}
              aria-pressed={showSessionSidebar}
            >
              <PanelLeftIcon />
            </IconButton>
            <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">Аналитик БД</h2>
            <span className="hidden @[30rem]/ragchat:block h-4 w-px bg-border shrink-0" />
            <StatusPill
              variant={isConnected ? 'success' : 'error'}
              dot
              className="hidden @[24rem]/ragchat:inline-flex shrink-0"
            >
              {isConnected ? `${tablesCount} табл.` : 'Нет БД'}
            </StatusPill>
            <div className="hidden @[48rem]/ragchat:flex min-w-0 items-center gap-2 text-xs text-muted-foreground truncate">
              {metrics?.status === 'ready' && <span className="shrink-0">RAG готов</span>}
              {typeof embeddingHealth?.completion_percentage === 'number' && (
                <span className="truncate">
                  {embeddingHealth.indexing_in_progress ? 'Индексация' : 'Эмбеддинги'}{' '}
                  {embeddingHealth.completion_percentage}%
                </span>
              )}
              {isQwenActive && <span className="shrink-0">Qwen3.6</span>}
            </div>
          </div>

          <div className="flex h-full shrink-0 items-center gap-0.5 sm:gap-1">
            <div className="flex items-center bg-accent rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                aria-pressed={searchMode === 'llm'}
                onClick={() => {
                  if (searchMode !== 'llm') handleSearchModeToggle();
                }}
                className={cn(
                  'px-1.5 @[34rem]/ragchat:px-2 h-8 sm:h-7 rounded-lg text-xs transition-all duration-200 flex items-center gap-1 active:scale-95',
                  searchMode === 'llm'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-border/80'
                )}
                title="Поиск через LLM"
              >
                <LLMIcon />
                <span className="hidden @[40rem]/ragchat:inline">LLM</span>
              </button>
              <button
                type="button"
                aria-pressed={searchMode === 'direct'}
                onClick={() => {
                  if (searchMode !== 'direct') handleSearchModeToggle();
                }}
                className={cn(
                  'px-1.5 @[34rem]/ragchat:px-2 h-8 sm:h-7 rounded-lg text-xs transition-all duration-200 flex items-center gap-1 active:scale-95',
                  searchMode === 'direct'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-border/80'
                )}
                title="Прямой поиск по БД"
              >
                <DirectIcon />
                <span className="hidden @[40rem]/ragchat:inline">Direct</span>
              </button>
            </div>

            <IconButton
              label={showFilesSidebar ? 'Скрыть файлы RAG' : 'Показать файлы RAG'}
              onClick={() => {
                const next = !showFilesSidebar;
                if (next && isWorkspaceOverlay()) setShowSessionSidebar(false);
                setShowFilesSidebar(next);
              }}
              className={cn(
                'relative',
                celestia.headerIcon,
                showFilesSidebar && 'bg-accent text-foreground'
              )}
              aria-pressed={showFilesSidebar}
            >
              <PanelRightIcon />
              {selectedDocumentSources.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-muted text-[9px] leading-none flex items-center justify-center text-foreground">
                  {selectedDocumentSources.length}
                </span>
              )}
            </IconButton>

            <IconButton
              label="Настройки RAG"
              onClick={() => setShowRagSettings(true)}
              className={cn('hidden @[28rem]/ragchat:inline-flex', celestia.headerIcon)}
            >
              <SettingsIcon />
            </IconButton>

            {isQwenActive && (
              <IconButton
                label="Настройки Qwen3.6"
                onClick={() => setShowQwenSettings(true)}
                className={cn('hidden @[42rem]/ragchat:inline-flex', celestia.headerIcon)}
              >
                <ThinkingIcon />
              </IconButton>
            )}

            <IconButton
              label="Загрузить данные в БД"
              onClick={() => setShowUploadModal(true)}
              className={cn('hidden @[42rem]/ragchat:inline-flex', celestia.headerIcon)}
            >
              <UploadIcon />
            </IconButton>

            <IconButton
              label="Обновить схему БД"
              onClick={handleRefreshSchema}
              className={cn('hidden @[42rem]/ragchat:inline-flex', celestia.headerIcon)}
            >
              <RefreshIcon />
            </IconButton>

            <IconButton
              label="Очистить историю"
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              variant="ghost"
              className={cn('hidden @[42rem]/ragchat:inline-flex', celestia.headerIcon)}
            >
              <TrashIcon />
            </IconButton>

            <button
              ref={headerMenuRef}
              type="button"
              title="Ещё"
              aria-label="Ещё действия"
              aria-expanded={headerMenuOpen}
              onClick={() => setHeaderMenuOpen((open) => !open)}
              className={cn(
                'inline-flex items-center justify-center rounded-xl hover:bg-accent/70 text-foreground/80',
                celestia.headerIcon,
                headerMenuOpen && 'bg-accent text-foreground',
                '@[42rem]/ragchat:hidden'
              )}
            >
              <MoreIcon />
            </button>
            <MenuPopover
              open={headerMenuOpen}
              onClose={() => setHeaderMenuOpen(false)}
              triggerRef={headerMenuRef}
              matchTriggerWidth={false}
              minWidth={220}
            >
              <button
                type="button"
                className={celestia.headerMenuItem}
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setShowRagSettings(true);
                }}
              >
                <SettingsIcon /> Настройки RAG
              </button>
              {isQwenActive && (
                <button
                  type="button"
                  className={celestia.headerMenuItem}
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setShowQwenSettings(true);
                  }}
                >
                  <ThinkingIcon /> Настройки Qwen3.6
                </button>
              )}
              <button
                type="button"
                className={celestia.headerMenuItem}
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setShowUploadModal(true);
                }}
              >
                <UploadIcon /> Загрузить в БД
              </button>
              <button
                type="button"
                className={celestia.headerMenuItem}
                onClick={() => {
                  setHeaderMenuOpen(false);
                  void handleRefreshSchema();
                }}
              >
                <RefreshIcon /> Обновить схему
              </button>
              <button
                type="button"
                className={cn(celestia.headerMenuItem, 'text-red-500')}
                disabled={messages.length === 0}
                onClick={() => {
                  setHeaderMenuOpen(false);
                  void handleClearHistory();
                }}
              >
                <TrashIcon /> Очистить историю
              </button>
            </MenuPopover>
          </div>
        </div>
      </header>

      {/* Qwen3.6 настройки модальное окно */}
      {showQwenSettings && (
        <div className="fixed inset-0 modal-scrim flex items-center justify-center z-50 p-4" onClick={() => setShowQwenSettings(false)}>
          <div className="max-w-md w-full rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal rounded-3xl">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <ThinkingIcon />
                  Настройки Qwen3.6
                </h3>
                <button 
                  onClick={() => setShowQwenSettings(false)} 
                  className="p-1 hover:bg-accent/70 rounded-lg transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="rag-qwen-enable-thinking" className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">🧠 Режим рассуждений (Thinking Mode)</span>
                    <input
                      id="rag-qwen-enable-thinking"
                      name="enableThinking"
                      type="checkbox"
                      checked={enableThinking}
                      onChange={(e) => setEnableThinking(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Модель будет показывать свои рассуждения перед ответом. Для сложных аналитических задач.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="rag-qwen-preserve-thinking" className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">💾 Сохранять рассуждения в истории</span>
                    <input
                      id="rag-qwen-preserve-thinking"
                      name="preserveThinking"
                      type="checkbox"
                      checked={preserveThinking}
                      onChange={(e) => setPreserveThinking(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                      disabled={!enableThinking}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Сохранять блоки рассуждений в контексте диалога для лучшей связности.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="rag-qwen-mode" className="block text-sm font-medium mb-1">🎯 Режим работы</label>
                  <SelectMenu
                    id="rag-qwen-mode"
                    aria-label="Режим работы Qwen"
                    value={qwenMode}
                    onChange={setQwenMode}
                    options={availableModes.map((mode) => ({
                      value: mode,
                      label: getModeDisplayName(mode),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {getModeDescription(qwenMode)}
                  </p>
                </div>
                
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      updateQwenConfig();
                      setShowQwenSettings(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setShowQwenSettings(false)}
                    className="flex-1 py-2 bg-border dark:bg-muted hover:bg-accent dark:hover:bg-accent rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRagSettings && (
        <div className="fixed inset-0 modal-scrim flex items-center justify-center z-50 p-4" onClick={() => setShowRagSettings(false)}>
          <div className="max-w-md w-full rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal rounded-3xl">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="text-base font-semibold">Настройки RAG-запроса</h3>
                <button type="button" onClick={() => setShowRagSettings(false)} className="p-1 hover:bg-accent/70 rounded-lg">
                  <CloseIcon />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label htmlFor="rag-limit" className="block text-sm font-medium mb-1">
                    Лимит чанков ({querySettings.limit})
                  </label>
                  <input
                    id="rag-limit"
                    type="range"
                    min={1}
                    max={100}
                    value={querySettings.limit}
                    onChange={(e) => dispatch(setQuerySettings({ limit: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="rag-relevance" className="block text-sm font-medium mb-1">
                    Порог релевантности ({querySettings.relevanceScore.toFixed(2)})
                  </label>
                  <input
                    id="rag-relevance"
                    type="range"
                    min={0.1}
                    max={0.95}
                    step={0.05}
                    value={querySettings.relevanceScore}
                    onChange={(e) =>
                      dispatch(setQuerySettings({ relevanceScore: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Настройки применяются к каждому запросу и хранятся локально в сессии.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3" ref={scrollRef}>
        <div className={cn(celestia.chatColumn, 'space-y-4')}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground px-4">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3">
              <DatabaseIcon />
            </div>
            <span className="text-base font-medium text-foreground text-center">
              Аналитика данных на естественном языке
            </span>
            <p className="text-sm mt-2 text-muted-foreground text-center max-w-md">
              Задайте вопрос о ваших данных, например:<br/>
              "Сколько всего заявок в системе"<br/>
              "Покажи конверсию из заявки в оплату"<br/>
              "Покажи мне из файлов данные о посещаемости"
            </p>
            <div className="mt-4 flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${searchMode === 'llm' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-accent text-muted-foreground'}`}>
                🤖 LLM режим
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${searchMode === 'direct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-accent text-muted-foreground'}`}>
                💾 Direct режим
              </span>
            </div>
            {isQwenActive && (
              <p className="text-xs mt-3 text-purple-500 text-center max-w-md">
                🐫 Активна модель Qwen3.6 с поддержкой режима рассуждений
              </p>
            )}
            {!isConnected && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                ⚠️ База данных не подключена. Проверьте настройки подключения.
              </div>
            )}
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={msg.role === 'user' ? celestia.chatBubbleUser : celestia.chatBubbleAi}>
              {msg.role !== 'user' && Boolean(msg.search_mode || msg.metrics?.qwen_mode) && (
                <div className="mb-1 flex flex-wrap gap-1">
                {typeof msg.metrics?.qwen_mode === 'string' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400">
                    {String(msg.metrics.qwen_mode)}
                  </span>
                )}
                {msg.search_mode && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    msg.search_mode === 'direct' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                      : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400'
                  }`}>
                    {msg.search_mode === 'direct' ? 'Direct' : 'LLM'}
                  </span>
                )}
                </div>
              )}
              
              {msg.role === 'user' && msg.attached_files && msg.attached_files.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {msg.attached_files.map((file) => (
                    <span key={file.name} className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15">
                      {file.name}
                    </span>
                  ))}
                </div>
              )}

              <FormattedMessage 
                content={msg.content} 
                isDarkMode={isDarkMode}
                isUser={msg.role === 'user'}
                isStreaming={msg.isStreaming}
                thinkBlocks={msg.think_blocks}
                searchMode={msg.search_mode}
              />

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <RAGSourcesList
                  sources={msg.sources}
                  onOpenDocument={(source) => {
                    setSelectedDocumentSources([source]);
                    setHighlightFileSource(source);
                    setShowFilesSidebar(true);
                  }}
                />
              )}

              {msg.role === 'assistant' && msg.generated_files && msg.generated_files.length > 0 && (
                <RAGGeneratedFilesList files={msg.generated_files} />
              )}
              
              {msg.metrics && Object.keys(msg.metrics).length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="text-xs font-semibold mb-2">📈 Метрики:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(msg.metrics).map(([key, value]) => (
                      <span key={key} className="text-xs bg-accent dark:bg-muted px-2 py-1 rounded">
                        {key}: {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {msg.insights && msg.insights.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="text-xs font-semibold mb-2">💡 Инсайты:</div>
                  <ul className="text-xs list-disc pl-4 space-y-1">
                    {msg.insights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="text-xs font-semibold mb-2">🎯 Рекомендации:</div>
                  <ul className="text-xs list-disc pl-4 space-y-1">
                    {msg.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {msg.chart_data && <ChartDisplay chartData={msg.chart_data} />}
              
              {msg.sql && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/80 dark:hover:text-foreground">
                    🔍 Показать SQL запрос
                  </summary>
                  <pre className="mt-2 text-[10px] font-mono bg-accent p-2 rounded overflow-x-auto">
                    {msg.sql}
                  </pre>
                  {msg.explanation && (
                    <p className="text-[10px] text-muted-foreground mt-1">{msg.explanation}</p>
                  )}
                  {msg.execution_time !== undefined && (
                    <p className="text-[9px] text-muted-foreground mt-1">
                      ⏱️ Выполнено за {msg.execution_time}ms
                    </p>
                  )}
                </details>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && !messages.some((m) => m.isStreaming) && (
          <div className="flex justify-start py-1">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
              </div>
          </div>
        )}
        
        {ragError && (
          <div className="flex justify-center">
            <InlineError message={ragError} className="w-full" />
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - адаптивный */}
      <div className={celestia.composerDock}>
        <div className={celestia.chatColumn}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => {
                setCompareMode(e.target.checked);
                if (!e.target.checked) setCompareDocumentSources([]);
              }}
            />
            Режим сравнения (2+ документа)
          </label>
          {selectedTableNames.length > 0 && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Таблицы: {selectedTableNames.join(', ')}
            </span>
          )}
        </div>

        {(compareMode ? compareDocumentSources : selectedDocumentSources).length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(compareMode ? compareDocumentSources : selectedDocumentSources).map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
              >
                📄 {source.length > 24 ? `${source.slice(0, 24)}…` : source}
                <button
                  type="button"
                  onClick={() =>
                    compareMode
                      ? setCompareDocumentSources((prev) => prev.filter((s) => s !== source))
                      : setSelectedDocumentSources((prev) => prev.filter((s) => s !== source))
                  }
                  className="hover:text-indigo-900"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() =>
                compareMode ? setCompareDocumentSources([]) : setSelectedDocumentSources([])
              }
              className="text-[11px] text-muted-foreground hover:underline"
            >
              Сбросить
            </button>
          </div>
        )}
        <div className={celestia.chatComposer}>
          <textarea
            id="rag-prompt"
            name="prompt"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? searchMode === 'direct'
                  ? 'Прямой поиск по базе…'
                  : 'Вопрос о данных…'
                : 'База данных не подключена'
            }
            className={cn(celestia.chatComposerInput, 'placeholder:text-muted-foreground')}
            rows={1}
            autoComplete="off"
            disabled={isLoading || isStreaming || !isConnected}
          />

          {(isLoading || isStreaming) && (
            <button
              type="button"
              onClick={handleStopGeneration}
              className={celestia.chatComposerStop}
            >
              Стоп
            </button>
          )}

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isLoading || isStreaming || !input.trim() || !isConnected}
            aria-label="Отправить"
            className={celestia.sendButton}
          >
            <SendIcon />
          </button>
        </div>

        <div className="text-[10px] sm:text-xs text-center mt-2 text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
          <span>{isConnected ? 'Enter для отправки, Shift+Enter для новой строки' : 'База данных не подключена'}</span>
          {selectedDocumentSources.length > 0 && searchMode === 'llm' && (
            <span className="text-indigo-500">📄 Поиск по {selectedDocumentSources.length} док.</span>
          )}
          {searchMode === 'direct' ? (
            <span className="text-emerald-500">💾 Режим прямого поиска по БД</span>
          ) : (
            <>
              {isQwenActive && enableThinking && (
                <span className="text-purple-500">🧠 Режим рассуждений активен</span>
              )}
              <span className="text-purple-500">🤖 LLM режим</span>
            </>
          )}
        </div>
        </div>
      </div>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b border-border/60 text-left">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UploadIcon />
              Загрузка данных в БД
            </DialogTitle>
            <DialogDescription>
              Документы в векторный индекс или файлы в SQL-таблицы.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <label htmlFor="rag-upload-batch-mode" className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                id="rag-upload-batch-mode"
                name="batchMode"
                type="checkbox"
                checked={batchMode}
                onChange={(e) => {
                  setBatchMode(e.target.checked);
                  setSelectedFile(null);
                  setSelectedFiles([]);
                  setDocumentPreview(null);
                }}
                className="h-4 w-4 rounded-md border-border accent-foreground"
              />
              Пакетная загрузка (до 20 файлов)
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'rounded-3xl border-2 border-dashed p-5 sm:p-6 text-center transition-colors cursor-pointer glass-input',
                dragActive ? 'border-foreground/40 bg-accent/50' : 'border-border'
              )}
            >
              <input
                type="file"
                id="rag-upload-file"
                name="file"
                multiple={batchMode}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (batchMode) {
                    setSelectedFiles(files.slice(0, 20));
                    setSelectedFile(null);
                    setDocumentPreview(null);
                  } else {
                    const file = files[0] ?? null;
                    setSelectedFile(file);
                    setSelectedFiles([]);
                    if (file) void loadDocumentPreview(file);
                  }
                  setUploadError(null);
                }}
                accept={
                  uploadType === 'vector'
                    ? '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.rtf,.html,.htm,.xml'
                    : '.csv,.json,.xlsx,.xls'
                }
                className="hidden"
              />
              <label htmlFor="rag-upload-file" className="cursor-pointer block">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-foreground">
                  <FolderIcon />
                </span>
                <p className="text-sm mt-3 break-words font-medium">
                  {batchMode
                    ? selectedFiles.length > 0
                      ? `${selectedFiles.length} файл(ов) выбрано`
                      : 'Выберите несколько файлов'
                    : selectedFile
                      ? selectedFile.name
                      : 'Перетащите файл или нажмите для выбора'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {uploadType === 'vector'
                    ? 'PDF (OCR), DOCX, PPTX, TXT, MD, HTML, XML'
                    : 'CSV, JSON, Excel (SQL-таблицы)'}
                </p>
              </label>
            </div>

            {uploadType === 'vector' && !batchMode && selectedFile && (
              <div className="rounded-2xl border border-border/70 p-3 text-xs bg-muted/40">
                <div className="font-medium mb-1">Превью индексации</div>
                {isPreviewLoading && <p className="text-muted-foreground">Анализ файла...</p>}
                {!isPreviewLoading && documentPreview && (
                  <>
                    {documentPreview.error && (
                      <InlineError message={documentPreview.error} className="text-xs" />
                    )}
                    {documentPreview.estimated_chunks != null && (
                      <p>Ожидается чанков: {documentPreview.estimated_chunks}</p>
                    )}
                    {documentPreview.preview && (
                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-muted-foreground">
                        {documentPreview.preview.slice(0, 800)}
                        {documentPreview.preview.length > 800 ? '…' : ''}
                      </pre>
                    )}
                    {documentPreview.message && (
                      <p className="text-muted-foreground mt-1">{documentPreview.message}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <FormLabel>Тип загрузки</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUploadTypeChange('vector')}
                  className={cn(
                    'flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors',
                    uploadType === 'vector'
                      ? 'border-foreground/25 bg-accent shadow-sm'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  <VectorIcon />
                  <span>
                    <span className="block text-sm font-medium">Векторный поиск</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Запросы «из файлов»</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUploadTypeChange('sql')}
                  className={cn(
                    'flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors',
                    uploadType === 'sql'
                      ? 'border-foreground/25 bg-accent shadow-sm'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  <TableIcon />
                  <span>
                    <span className="block text-sm font-medium">SQL-аналитика</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Прямые SQL-запросы</span>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <FormLabel htmlFor="rag-upload-table-name">
                Название таблицы
                {uploadType === 'vector' && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">vector_store</span>
                )}
              </FormLabel>
              <FormInput
                id="rag-upload-table-name"
                name="tableName"
                type="text"
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value);
                  if (uploadType === 'vector') {
                    setUseAutoTableName(false);
                  }
                }}
                placeholder={uploadType === 'vector' ? 'vector_store' : 'например: customers, orders'}
                disabled={uploadType === 'vector' && useAutoTableName}
                className={cn(
                  'rounded-2xl',
                  uploadType === 'vector' && useAutoTableName && 'opacity-70'
                )}
              />
              {uploadType === 'vector' && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  PDF-сканы: OCR → Markdown → RAG. Остальные документы — через /api/rag/upload/document.
                </p>
              )}
            </div>

            {uploadType === 'vector' && selectedFile &&
              (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) && (
              <div className="space-y-3">
                <label htmlFor="rag-upload-excel-to-text" className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm font-medium">Конвертировать Excel в текст</span>
                  <input
                    id="rag-upload-excel-to-text"
                    name="excelToText"
                    type="checkbox"
                    checked={excelToText}
                    onChange={(e) => setExcelToText(e.target.checked)}
                    className="h-4 w-4 rounded-md border-border accent-foreground"
                  />
                </label>

                {excelToText && (
                  <div>
                    <FormLabel>Режим индексации</FormLabel>
                    <SelectMenu
                      aria-label="Режим индексации Excel"
                      value={summaryMode}
                      onChange={(value) => setSummaryMode(value as 'summary' | 'detailed')}
                      options={[
                        { value: 'summary', label: 'Краткий (итоги по листам)' },
                        { value: 'detailed', label: 'Детальный (построчно)' },
                      ]}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {summaryMode === 'summary'
                        ? 'Общее описание каждого листа — меньше записей, быстрее поиск.'
                        : 'Отдельная запись на каждую строку — точнее поиск, больше данных.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <FormLabel htmlFor="rag-upload-if-exists">Если таблица существует</FormLabel>
              <SelectMenu
                id="rag-upload-if-exists"
                aria-label="Если таблица существует"
                value={ifExists}
                onChange={(value) => setIfExists(value as 'replace' | 'append' | 'skip')}
                options={[
                  { value: 'replace', label: 'Заменить (удалить и создать заново)' },
                  { value: 'append', label: 'Добавить к существующей' },
                  { value: 'skip', label: 'Пропустить, если уже есть' },
                ]}
              />
            </div>

            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadProgress < 20 && uploadType === 'vector' ? 'Конвертация…' : 'Загрузка…'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-border/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-foreground/70 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={handleUpload}
              disabled={
                isUploading ||
                (batchMode ? selectedFiles.length === 0 : !selectedFile) ||
                (uploadType === 'sql' && !tableName.trim())
              }
            >
              {isUploading ? 'Загрузка…' : 'Загрузить в базу данных'}
            </Button>

            <div className="rounded-2xl border border-border/70 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setShowTableList(!showTableList);
                  if (!showTableList) loadTables();
                }}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-accent/50 transition-colors"
              >
                <span className="font-medium flex items-center gap-2 text-sm">
                  <TableIcon />
                  Таблицы в БД
                  <span className="text-xs text-muted-foreground font-normal">({tables.length})</span>
                </span>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${showTableList ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTableList && (
                <div className="border-t border-border/60 p-3 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-[11px] text-muted-foreground">
                    SQL-таблицы могут быть общими для инстанса.
                  </p>
                  {isLoadingTables ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Загрузка...</div>
                  ) : tables.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Нет таблиц. Загрузите данные, чтобы создать таблицы.
                    </p>
                  ) : (
                    tables.map((table) => (
                      <div
                        key={table.name}
                        className="rounded-xl bg-muted/40"
                      >
                        <div className="flex justify-between items-center p-2 gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={selectedTableNames.includes(table.name)}
                            onChange={() => {
                              setSelectedTableNames((prev) =>
                                prev.includes(table.name)
                                  ? prev.filter((name) => name !== table.name)
                                  : [...prev, table.name]
                              );
                            }}
                            title="Использовать в SQL-запросе"
                            className="h-4 w-4 shrink-0 rounded-md border-border accent-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => toggleTableExpand(table.name)}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform shrink-0 ${expandedTables.has(table.name) ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="min-w-0">
                              <div className="font-mono text-xs sm:text-sm font-medium break-words">
                                {table.name}
                                {table.name === 'vector_store' && (
                                  <span className="ml-2 text-xs text-muted-foreground">(векторный)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{table.columnCount} колонок, {table.rowCount} строк</div>
                            </div>
                          </button>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleClearTable(table.name)}
                              className="p-1.5 text-xs rounded-xl hover:bg-accent text-muted-foreground transition-colors"
                              title="Очистить таблицу"
                            >
                              <ClearIcon />
                            </button>
                            <IconButton
                              variant="danger"
                              size="sm"
                              label="Удалить таблицу"
                              onClick={() => handleDeleteTable(table.name)}
                              className="text-xs"
                            >
                              <TrashIcon />
                            </IconButton>
                          </div>
                        </div>
                        {expandedTables.has(table.name) && table.columns && (
                          <div className="border-t border-border/50 px-3 py-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Колонки:</div>
                            <div className="flex flex-wrap gap-1">
                              {table.columns.slice(0, 10).map((col, idx) => (
                                <span key={idx} className="text-xs px-1.5 py-0.5 bg-accent rounded-lg break-words" title={col.type}>
                                  {col.name}
                                </span>
                              ))}
                              {table.columns.length > 10 && (
                                <span className="text-xs text-muted-foreground">+{table.columns.length - 10}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {uploadError && (
              <InlineError message={uploadError} onDismiss={() => setUploadError(null)} />
            )}
            {uploadSuccess && (
              <InlineSuccess message={uploadSuccess} onDismiss={() => setUploadSuccess(null)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <button
        type="button"
        className={cn(
          celestia.workspaceScrim,
          showFilesSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-label="Закрыть панель файлов"
        onClick={() => setShowFilesSidebar(false)}
      />

      <RAGFilesSidebar
        isDarkMode={isDarkMode}
        selectedSources={compareMode ? compareDocumentSources : selectedDocumentSources}
        onSelectionChange={compareMode ? setCompareDocumentSources : setSelectedDocumentSources}
        onDocumentsChange={() => {
          void loadTables();
          void dispatch(loadRAGEmbeddingHealth());
        }}
        onUpload={() => setShowUploadModal(true)}
        highlightSource={highlightFileSource}
        onClose={() => setShowFilesSidebar(false)}
        open={showFilesSidebar}
      />
    </div>
  );
};

export default RAGChat;