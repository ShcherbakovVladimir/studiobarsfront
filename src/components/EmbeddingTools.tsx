// /home/user/projects/studioxlam/src/components/EmbeddingTools.tsx
import React, { useState } from 'react';
import { llamaApi, EmbeddingResponse, EmbeddingCompareResponse } from '../services/llamaService';
import { showErrorToast } from '../services/toastService';
import { useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';
import { fieldTextareaClass } from './ui/menu-popover';
import { tabChip, toolBtnGhost, toolBtnPrimary, toolCard, toolTitle, toolPreShell, toolPreBody } from './ui/tool-surface';
import { StatusPill } from './ui/status-pill';
import { cn } from '../lib/utils';

interface EmbeddingToolsProps {
  isDarkMode: boolean;
}

const EmbeddingTools: React.FC<EmbeddingToolsProps> = ({ isDarkMode }) => {
  const [text1, setText1] = useState<string>('Пример текста для embedding');
  const [text2, setText2] = useState<string>('Другой пример текста для сравнения');
  const [embeddingResult1, setEmbeddingResult1] = useState<EmbeddingResponse | null>(null);
  const [embeddingResult2, setEmbeddingResult2] = useState<EmbeddingResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<EmbeddingCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { activeTab, setActiveTab } = useWorkspacePanel(PANEL_IDS.EMBEDDING_TOOLS, 'embedding');
  const activeTabId = activeTab as 'embedding' | 'comparison';

  const handleGetEmbedding = async (text: string, isFirst: boolean = true) => {
    setLoading(true);
    try {
      const response = await llamaApi.getEmbedding(text);
      if (isFirst) {
        setEmbeddingResult1(response);
      } else {
        setEmbeddingResult2(response);
      }
    } catch (error) {
      console.error('Error getting embedding:', error);
      showErrorToast('Ошибка получения embedding: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompareEmbeddings = async () => {
    setLoading(true);
    try {
      const response = await llamaApi.compareEmbeddings(text1, text2);
      setComparisonResult(response);
    } catch (error) {
      console.error('Error comparing embeddings:', error);
      showErrorToast('Ошибка сравнения embeddings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatVector = (vector: number[], maxLength: number = 5) => {
    if (!vector || vector.length === 0) return '[]';
    if (vector.length <= maxLength * 2) {
      return `[${vector.map(v => v.toFixed(4)).join(', ')}]`;
    }
    return `[${vector.slice(0, maxLength).map(v => v.toFixed(4)).join(', ')}, ..., ${vector.slice(-maxLength).map(v => v.toFixed(4)).join(', ')}]`;
  };

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={toolTitle}>Embeddings</h3>
        <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit">
          <button type="button" onClick={() => setActiveTab('embedding')} className={tabChip(activeTabId === 'embedding')}>
            Векторы
          </button>
          <button type="button" onClick={() => setActiveTab('comparison')} className={tabChip(activeTabId === 'comparison')}>
            Сходство
          </button>
        </div>
      </div>

      {activeTabId === 'embedding' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
          {[{ id: '1', text: text1, set: setText1, result: embeddingResult1, first: true, label: 'Текст 1' },
            { id: '2', text: text2, set: setText2, result: embeddingResult2, first: false, label: 'Текст 2' }].map((item) => (
            <div key={item.id} className={cn(toolCard, 'space-y-2')}>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`embedding-text-${item.id}`} className="text-xs text-muted-foreground">{item.label}</label>
                {item.result && <StatusPill variant="success">готово</StatusPill>}
              </div>
              <textarea
                id={`embedding-text-${item.id}`}
                value={item.text}
                onChange={(e) => item.set(e.target.value)}
                className={cn(fieldTextareaClass, 'h-36')}
              />
              <button
                type="button"
                onClick={() => void handleGetEmbedding(item.text, item.first)}
                disabled={loading || !item.text.trim()}
                className={item.first ? toolBtnPrimary : toolBtnGhost}
              >
                {loading ? 'Считаем…' : 'Получить вектор'}
              </button>
              {item.result && (
                <div className={toolPreShell}>
                  <pre className={cn(toolPreBody, 'max-h-24 text-[11px] text-muted-foreground')}>
                    dim {item.result.vectorSize} · {item.result.generationTime}
                    {'\n'}
                    {formatVector(item.result.embedding)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(toolCard, 'space-y-3')}>
          <div className="grid grid-cols-2 gap-2">
            <p className="text-xs text-muted-foreground line-clamp-4 break-words">{text1}</p>
            <p className="text-xs text-muted-foreground line-clamp-4 break-words">{text2}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleCompareEmbeddings()}
            disabled={loading || !text1.trim() || !text2.trim()}
            className={toolBtnPrimary}
          >
            {loading ? 'Считаем…' : 'Сравнить'}
          </button>
          {comparisonResult && (
            <div className="space-y-2">
              <p className="text-2xl font-semibold">
                {(comparisonResult.similarity * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{comparisonResult.interpretation}</p>
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full bg-foreground/40" style={{ width: `${comparisonResult.similarity * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                cosine {comparisonResult.similarity.toFixed(4)} · {comparisonResult.generationTime}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default EmbeddingTools;