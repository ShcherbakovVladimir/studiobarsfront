// /home/user/projects/studioxlam/src/components/FunctionDocumentationTool.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FunctionDocumentation } from '../services/llamaService';
import {
  generateFunctionDocumentation,
  getAvailableTools,
  XlamToolDefinition,
} from '../services/agentService';
import { showErrorToast, showSuccessToast } from '../services/toastService';
import {
  DocumentationFormat,
  fromApiDocumentationFormat,
  normalizeFunctionsPayload,
} from '../utils/functionDocumentationFormatter';
import type { UnknownRecord } from '../types';
import { ResultPanel } from './ui/result-panel';
import { tabChip, toolBtnGhost, toolBtnPrimary, toolCard, toolTitle, toolPreShell, toolPreBody } from './ui/tool-surface';
import { cn } from '../lib/utils';

interface FunctionDocumentationToolProps {
  isDarkMode: boolean;
  tools?: XlamToolDefinition[];
}

function toolsToFunctionSchemas(tools: XlamToolDefinition[]): UnknownRecord[] {
  return tools
    .map((tool) => tool.function ?? tool)
    .filter((item) => Boolean(item && typeof item === 'object')) as UnknownRecord[];
}

function formatToolsJson(tools: XlamToolDefinition[]): string {
  return JSON.stringify(toolsToFunctionSchemas(tools), null, 2);
}

const FORMAT_LABELS: Record<DocumentationFormat, string> = {
  typescript: 'TypeScript',
  markdown: 'Markdown',
  jsdoc: 'JSDoc',
};

const FunctionDocumentationTool: React.FC<FunctionDocumentationToolProps> = ({
  isDarkMode,
  tools,
}) => {
  const [functionsJson, setFunctionsJson] = useState<string>('[]');
  const [format, setFormat] = useState<DocumentationFormat>('typescript');
  const [documentParams, setDocumentParams] = useState(true);
  const [documentationResult, setDocumentationResult] = useState<FunctionDocumentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsSource, setToolsSource] = useState<'server' | 'manual' | 'workspace'>('manual');
  const hasGeneratedRef = useRef(false);

  const applyTools = useCallback((nextTools: XlamToolDefinition[], source: 'server' | 'workspace') => {
    if (nextTools.length === 0) return;
    setFunctionsJson(formatToolsJson(nextTools));
    setToolsSource(source);
    setDocumentationResult(null);
    hasGeneratedRef.current = false;
  }, []);

  const loadToolsFromServer = useCallback(async () => {
    setLoadingTools(true);
    try {
      const response = await getAvailableTools();
      const nextTools = response.tools ?? [];
      if (nextTools.length === 0) {
        showErrorToast('На сервере нет доступных инструментов');
        return;
      }
      applyTools(nextTools, 'server');
      showSuccessToast(`Загружено инструментов: ${nextTools.length}`);
    } catch (error) {
      showErrorToast(
        'Не удалось загрузить инструменты: ' +
          (error instanceof Error ? error.message : 'неизвестная ошибка')
      );
    } finally {
      setLoadingTools(false);
    }
  }, [applyTools]);

  useEffect(() => {
    if (tools && tools.length > 0) {
      applyTools(tools, 'workspace');
    } else {
      void loadToolsFromServer();
    }
  }, [tools, applyTools, loadToolsFromServer]);

  const generateDocumentation = useCallback(async (
    nextFormat: DocumentationFormat,
    nextDocumentParams: boolean
  ) => {
    setLoading(true);
    setDocumentationResult(null);
    try {
      let functions: UnknownRecord[] | undefined;
      try {
        const parsed = JSON.parse(functionsJson);
        functions = normalizeFunctionsPayload(parsed);
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : 'Некорректный JSON функций'
        );
      }

      const response = await generateFunctionDocumentation(
        functions.length > 0 ? functions : undefined,
        nextFormat,
        nextDocumentParams
      );

      const responseFormat = fromApiDocumentationFormat(response.format, response.language);

      if (!response.success || !response.documentation?.trim()) {
        setDocumentationResult({
          success: false,
          format: responseFormat,
          language: response.language,
          documentation: '',
          hasFunctions: false,
          functionCount: functions?.length ?? 0,
          error: response.error ?? 'Сервер не вернул документацию',
        });
        showErrorToast(response.error ?? 'Сервер не вернул документацию');
        return;
      }

      setDocumentationResult({
        success: true,
        format: responseFormat,
        language: response.language,
        documentation: response.documentation,
        hasFunctions: true,
        functionCount: response.functionCount ?? functions?.length ?? 0,
        modelName: response.modelName,
        role: response.role,
        error: undefined,
      });
      hasGeneratedRef.current = true;
    } catch (error) {
      console.error('Error generating documentation:', error);
      setDocumentationResult({
        success: false,
        format: nextFormat,
        documentation: '',
        hasFunctions: false,
        functionCount: 0,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
      showErrorToast(
        'Ошибка генерации документации: ' +
          (error instanceof Error ? error.message : 'неизвестная ошибка')
      );
    } finally {
      setLoading(false);
    }
  }, [functionsJson]);

  const handleGenerateDocumentation = () => {
    void generateDocumentation(format, documentParams);
  };

  useEffect(() => {
    if (!hasGeneratedRef.current) return;
    void generateDocumentation(format, documentParams);
  }, [format, documentParams, generateDocumentation]);

  const copyToClipboard = () => {
    if (documentationResult?.documentation) {
      navigator.clipboard.writeText(documentationResult.documentation);
      showSuccessToast('Документация скопирована в буфер обмена!');
    }
  };

  const sourceLabel =
    toolsSource === 'server'
      ? 'Загружено с сервера'
      : toolsSource === 'workspace'
        ? 'Из рабочего пространства'
        : 'Ручной ввод';

  const resultFormatLabel = documentationResult
    ? FORMAT_LABELS[fromApiDocumentationFormat(documentationResult.format, documentationResult.language)]
    : FORMAT_LABELS[format];

  return (
    <div className="space-y-3 min-w-0">
      <h3 className={toolTitle}>Документация функций</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        <div className={cn(toolCard, 'space-y-3')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="function-doc-json" className="text-xs text-muted-foreground">
              Функции (JSON)
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{sourceLabel}</span>
              <button
                type="button"
                onClick={() => void loadToolsFromServer()}
                disabled={loadingTools}
                className={toolBtnGhost}
              >
                {loadingTools ? 'Загрузка…' : 'С сервера'}
              </button>
            </div>
          </div>
          <div className={cn(toolPreShell, 'h-72')}>
            <textarea
              id="function-doc-json"
              name="functionsJson"
              value={functionsJson}
              onChange={(e) => {
                setFunctionsJson(e.target.value);
                setToolsSource('manual');
                setDocumentationResult(null);
                hasGeneratedRef.current = false;
              }}
              className="h-full w-full resize-none overflow-auto scroll-clip bg-transparent px-3.5 py-2.5 font-mono text-xs outline-none border-0 rounded-none"
              placeholder='[{"name":"get_time","description":"...","parameters":{"type":"object","properties":{}}}]'
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Пустой массив — сервер возьмёт tools по текущей роли модели.
          </p>
          <fieldset>
            <legend className="text-xs text-muted-foreground mb-1.5">Формат</legend>
            <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit">
              {(['typescript', 'markdown', 'jsdoc'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={format === fmt}
                  onClick={() => setFormat(fmt)}
                  className={tabChip(format === fmt)}
                >
                  {FORMAT_LABELS[fmt]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              id="documentParams"
              name="documentParameters"
              checked={documentParams}
              onChange={(e) => setDocumentParams(e.target.checked)}
              className="rounded border-border"
            />
            Document Parameters
          </label>
          <button
            type="button"
            onClick={handleGenerateDocumentation}
            disabled={loading}
            className={toolBtnPrimary}
          >
            {loading ? 'Генерация…' : 'Сгенерировать'}
          </button>
        </div>

        <div className={cn(toolCard, 'space-y-3 min-w-0')}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs text-muted-foreground">Результат</h4>
            {documentationResult?.documentation && (
              <button type="button" onClick={copyToClipboard} className={toolBtnGhost}>
                Копировать
              </button>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Генерация…</p>
          ) : documentationResult ? (
            <>
              <ResultPanel
                success={documentationResult.success}
                title={documentationResult.success ? 'Успешно сгенерировано' : 'Ошибка генерации'}
                error={documentationResult.error}
                className="p-3"
              />
              {documentationResult.success && (
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="rounded-xl border border-border px-2.5 py-2">
                    <div className="font-medium text-foreground">Формат</div>
                    <div>{resultFormatLabel}</div>
                  </div>
                  {documentationResult.language && (
                    <div className="rounded-xl border border-border px-2.5 py-2">
                      <div className="font-medium text-foreground">Язык</div>
                      <div className="truncate">{documentationResult.language}</div>
                    </div>
                  )}
                  {documentationResult.modelName && (
                    <div className="rounded-xl border border-border px-2.5 py-2 min-w-0">
                      <div className="font-medium text-foreground">Модель</div>
                      <div className="truncate">{documentationResult.modelName}</div>
                    </div>
                  )}
                  {documentationResult.functionCount > 0 && (
                    <div className="rounded-xl border border-border px-2.5 py-2">
                      <div className="font-medium text-foreground">Функций</div>
                      <div>{documentationResult.functionCount}</div>
                    </div>
                  )}
                  {documentationResult.role && (
                    <div className="rounded-xl border border-border px-2.5 py-2">
                      <div className="font-medium text-foreground">Роль</div>
                      <div className="truncate">{documentationResult.role}</div>
                    </div>
                  )}
                </div>
              )}
              {documentationResult.documentation && (
                <div className={cn(toolPreShell, 'h-72')}>
                  <pre className={cn(toolPreBody, 'max-h-none h-full whitespace-pre-wrap')}>
                    {documentationResult.documentation}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Загрузите инструменты и нажмите «Сгенерировать»
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


export default FunctionDocumentationTool;
