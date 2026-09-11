// /home/user/projects/studioxlam/src/components/GrammarBuilder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { llamaApi, GrammarResponse } from '../services/llamaService';
import { listGrammarTemplates } from '../services/agentService';
import { showSuccessToast } from '../services/toastService';
import { getErrorMessage } from '../utils/errorUtils';
import {
  createEmptyGrammarSelection,
  type GrammarSelection,
  grammarSelectionLabel,
  isGrammarActive,
} from '../utils/grammarUtils';
import { InlineError } from './ui/inline-error';
import { toolBtnGhost, toolBtnPrimary, toolBtnDanger, toolCard, toolTitle, toolPreShell, toolPreBody } from './ui/tool-surface';
import { fieldTextareaClass } from './ui/menu-popover';
import { cn } from '../lib/utils';

interface GrammarBuilderProps {
  isDarkMode: boolean;
  onGrammarChange?: (selection: GrammarSelection) => void;
  currentSelection?: GrammarSelection;
}

const FALLBACK_TEMPLATES = ['json', 'list', 'json_arr'];

const GrammarBuilder: React.FC<GrammarBuilderProps> = ({
  isDarkMode,
  onGrammarChange,
  currentSelection = createEmptyGrammarSelection(),
}) => {
  const [grammarType, setGrammarType] = useState<string>('json');
  const [grammar, setGrammar] = useState<GrammarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [jsonSchema, setJsonSchema] = useState<string>(
    '{\n  "type": "object",\n  "properties": {\n    "name": {\n      "type": "string"\n    }\n  },\n  "required": ["name"]\n}'
  );
  const [availableTypes, setAvailableTypes] = useState<string[]>(FALLBACK_TEMPLATES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await listGrammarTemplates();
      if (response.success && response.templates.length > 0) {
        setAvailableTypes(response.templates);
      }
    })();
  }, []);

  const previewGrammar = useCallback(async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await llamaApi.getGrammar(type);
      if (!response.success || !response.grammar?.trim()) {
        throw new Error('Сервер не вернул GBNF');
      }
      setGrammar(response);
      setGrammarType(type);
    } catch (err) {
      console.error('Error loading grammar:', err);
      setError(`Не удалось загрузить грамматику «${type}»: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyTemplate = useCallback(async (type: string) => {
    await previewGrammar(type);
    onGrammarChange?.({
      source: 'template',
      templateId: type,
      grammar: type,
      label: `шаблон: ${type}`,
    });
    showSuccessToast(`К чату применён алиас «${type}» (сервер развернёт GBNF)`);
  }, [onGrammarChange, previewGrammar]);

  const previewJsonSchemaGrammar = async () => {
    setLoading(true);
    setError(null);
    try {
      const schema = JSON.parse(jsonSchema);
      const response = await llamaApi.createJsonSchemaGrammar(schema);
      if (!response.success || !response.grammar?.trim()) {
        throw new Error('Сервер не вернул грамматику по схеме');
      }
      setGrammar(response);
      setGrammarType('json_schema');
    } catch (err) {
      console.error('Error creating JSON schema grammar:', err);
      setError(`Ошибка JSON Schema: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const applyJsonSchemaToChat = () => {
    try {
      const schema = JSON.parse(jsonSchema);
      onGrammarChange?.({
        source: 'json_schema',
        jsonSchema: schema,
        label: 'JSON Schema',
      });
      showSuccessToast('К чату применён json_schema (приоритет над grammar)');
    } catch (err) {
      setError(`Некорректный JSON Schema: ${getErrorMessage(err)}`);
    }
  };

  const applyPreviewGbnfToChat = () => {
    if (!grammar?.grammar) return;
    onGrammarChange?.({
      source: 'gbnf',
      grammar: grammar.grammar,
      label: 'GBNF',
    });
    showSuccessToast('Полный GBNF применён к чату');
  };

  const clearGrammar = () => {
    setGrammar(null);
    setGrammarType('json');
    setError(null);
    onGrammarChange?.(createEmptyGrammarSelection());
    void previewGrammar('json');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccessToast('Грамматика скопирована в буфер обмена!');
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (isGrammarActive(currentSelection)) {
        if (currentSelection.source === 'template' && currentSelection.templateId) {
          await previewGrammar(currentSelection.templateId);
          return;
        }
        if (currentSelection.source === 'json_schema' && currentSelection.jsonSchema) {
          setJsonSchema(JSON.stringify(currentSelection.jsonSchema, null, 2));
          setLoading(true);
          try {
            const response = await llamaApi.createJsonSchemaGrammar(currentSelection.jsonSchema);
            if (response.success && response.grammar) {
              setGrammar(response);
              setGrammarType('json_schema');
            }
          } catch (err) {
            setError(getErrorMessage(err));
          } finally {
            setLoading(false);
          }
          return;
        }
        if (currentSelection.source === 'gbnf' && currentSelection.grammar) {
          setGrammar({
            success: true,
            type: 'gbnf',
            grammar: currentSelection.grammar,
            rootRuleName: 'root',
          });
          setGrammarType('gbnf');
          return;
        }
      }
      await previewGrammar(availableTypes[0] ?? 'json');
    };
    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial preview only

  const activeLabel = grammarSelectionLabel(currentSelection);

  return (
    <div className="space-y-3 min-w-0">
      <div>
        <h3 className={toolTitle}>Грамматика</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Шаблоны llama.cpp: в чат уходит алиас (<code className="font-mono">json</code>,{' '}
          <code className="font-mono">list</code>) или <code className="font-mono">json_schema</code>.
        </p>
      </div>

      <InlineError message={error} onDismiss={() => setError(null)} />

      {isGrammarActive(currentSelection) && (
        <div className={cn(toolCard, 'flex items-start justify-between gap-2')}>
          <div className="min-w-0">
            <p className="text-sm font-medium">В чате: {activeLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentSelection.source === 'json_schema'
                ? 'В запрос уходит json_schema'
                : currentSelection.source === 'template'
                  ? `grammar: "${currentSelection.templateId}"`
                  : 'Полный текст GBNF'}
            </p>
          </div>
          <button type="button" onClick={clearGrammar} className={toolBtnDanger}>
            Сбросить
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        <div className={cn(toolCard, 'space-y-3')}>
          <h4 className="text-xs text-muted-foreground">Шаблоны</h4>
          <div className="flex flex-wrap gap-1.5">
            {availableTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => void applyTemplate(type)}
                disabled={loading}
                className={cn(
                  toolBtnGhost,
                  currentSelection.templateId === type && currentSelection.source === 'template' && 'bg-primary/10 border border-primary/20'
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <label htmlFor="grammar-json-schema" className="block text-xs text-muted-foreground">
            JSON Schema
          </label>
          <textarea
            id="grammar-json-schema"
            name="jsonSchema"
            value={jsonSchema}
            onChange={(e) => setJsonSchema(e.target.value)}
            className={cn(fieldTextareaClass, 'h-48 font-mono text-xs')}
            placeholder='{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}'
          />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void previewJsonSchemaGrammar()} disabled={loading} className={toolBtnGhost}>
              {loading ? 'Загрузка…' : 'Предпросмотр'}
            </button>
            <button type="button" onClick={applyJsonSchemaToChat} disabled={loading} className={toolBtnPrimary}>
              Применить schema
            </button>
          </div>
        </div>

        <div className={cn(toolCard, 'space-y-3 min-w-0')}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs text-muted-foreground truncate">
              {grammar ? `Предпросмотр: ${grammar.type}` : 'Предпросмотр GBNF'}
            </h4>
            {grammar && (
              <div className="flex gap-1.5 shrink-0">
                <button type="button" onClick={applyPreviewGbnfToChat} className={toolBtnGhost}>
                  Применить GBNF
                </button>
                <button type="button" onClick={() => copyToClipboard(grammar.grammar)} className={toolBtnGhost}>
                  Копировать
                </button>
              </div>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Загрузка GBNF…</p>
          ) : grammar ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {grammar.rootRuleName && (
                  <span className="text-[11px] text-muted-foreground">root: {grammar.rootRuleName}</span>
                )}
                {grammar.trimWhitespaceSuffix != null && (
                  <span className="text-[11px] text-muted-foreground">
                    trim whitespace: {grammar.trimWhitespaceSuffix ? 'да' : 'нет'}
                  </span>
                )}
                {grammar.stopGenerationTriggers && grammar.stopGenerationTriggers.length > 0 && (
                  <span className="text-[11px] text-muted-foreground break-all">
                    stop: {grammar.stopGenerationTriggers.join(', ')}
                  </span>
                )}
              </div>
              <div className={toolPreShell}>
                <pre className={toolPreBody}>
                  {grammar.grammar}
                </pre>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Выберите шаблон или schema</p>
          )}
        </div>
      </div>
    </div>
  );
};


export default GrammarBuilder;
