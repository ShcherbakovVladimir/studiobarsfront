// /home/user/projects/studioxlam/src/components/RankingTool.tsx
import React, { useState } from 'react';
import { llamaApi, RankingResponse } from '../services/llamaService';
import { showErrorToast } from '../services/toastService';
import { ResultPanel } from './ui/result-panel';
import { StatusPill } from './ui/status-pill';
import { fieldInputClass, fieldTextareaClass } from './ui/menu-popover';
import { toolBtnDanger, toolBtnGhost, toolBtnPrimary, toolCard, toolTitle } from './ui/tool-surface';
import { cn } from '../lib/utils';

interface RankingToolProps {
  isDarkMode: boolean;
}

const RankingTool: React.FC<RankingToolProps> = ({ isDarkMode }) => {
  const [query, setQuery] = useState<string>('Что такое искусственный интеллект?');
  const [documents, setDocuments] = useState<string[]>([
    'Искусственный интеллект — это область компьютерных наук, занимающаяся созданием интеллектуальных машин.',
    'Машинное обучение — это подраздел искусственного интеллекта, который позволяет компьютерам учиться на данных.',
    'Глубокое обучение использует нейронные сети для решения сложных задач.',
    'Естественный язык — это способность компьютеров понимать и генерировать человеческий язык.'
  ]);
  const [newDocument, setNewDocument] = useState<string>('');
  const [rankingResult, setRankingResult] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRankDocuments = async () => {
    setLoading(true);
    try {
      const response = await llamaApi.rankDocuments(query, documents);
      setRankingResult(response);
    } catch (error) {
      console.error('Error ranking documents:', error);
      showErrorToast('Ошибка ранжирования: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const addDocument = () => {
    if (newDocument.trim()) {
      setDocuments([...documents, newDocument.trim()]);
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const moveDocument = (fromIndex: number, toIndex: number) => {
    const newDocs = [...documents];
    const [removed] = newDocs.splice(fromIndex, 1);
    if (removed !== undefined) {
      newDocs.splice(toIndex, 0, removed);
      setDocuments(newDocs);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      <h3 className={toolTitle}>Ранжирование</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        <div className={cn(toolCard, 'space-y-3')}>
          <label htmlFor="ranking-query" className="text-xs text-muted-foreground">Запрос</label>
          <textarea
            id="ranking-query"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            className={cn(fieldTextareaClass, 'h-28')}
            placeholder="Введите запрос для ранжирования..."
          />
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs text-muted-foreground">Документы ({documents.length})</h4>
            <button
              type="button"
              onClick={() => void handleRankDocuments()}
              disabled={loading || documents.length === 0 || !query.trim()}
              className={toolBtnPrimary}
            >
              {loading ? 'Ранжирование…' : 'Ранжировать'}
            </button>
          </div>
          <div className="space-y-2">
            {documents.map((doc, index) => {
              const ranked = rankingResult?.results?.find((r) => r.document === doc);
              return (
                <div key={index} className="group rounded-xl border border-border bg-background/60 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveDocument(index, index - 1)}
                        disabled={index === 0}
                        className={cn(toolBtnGhost, 'h-6 w-6 px-0')}
                        title="Поднять"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDocument(index, index + 1)}
                        disabled={index === documents.length - 1}
                        className={cn(toolBtnGhost, 'h-6 w-6 px-0')}
                        title="Опустить"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-muted-foreground">Документ {index + 1}</span>
                        {ranked?.rank != null && (
                          <StatusPill variant="info">ранг {ranked.rank}</StatusPill>
                        )}
                      </div>
                      <p className="text-xs line-clamp-3 break-words">{doc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className={cn(toolBtnDanger, 'opacity-0 group-hover:opacity-100')}
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 min-w-0">
            <label htmlFor="ranking-new-document" className="sr-only">Новый документ</label>
            <input
              id="ranking-new-document"
              name="newDocument"
              type="text"
              value={newDocument}
              onChange={(e) => setNewDocument(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDocument()}
              placeholder="Новый документ..."
              className={cn(fieldInputClass, 'flex-1')}
            />
            <button type="button" onClick={addDocument} disabled={!newDocument.trim()} className={toolBtnGhost}>
              Добавить
            </button>
          </div>
        </div>

        <div className={cn(toolCard, 'space-y-3')}>
          <h4 className="text-xs text-muted-foreground">Результаты</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Ранжирование…</p>
          ) : rankingResult ? (
            <>
              <ResultPanel
                success={rankingResult.success}
                title={rankingResult.success ? 'Успешно' : 'Ошибка'}
                className="p-3"
              >
                <p className="text-xs text-muted-foreground mt-1">Время: {rankingResult.generationTime}</p>
              </ResultPanel>
              {rankingResult.success && rankingResult.results && (
                <div className="space-y-2">
                  {rankingResult.results
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((result) => (
                      <div key={result.rank} className="rounded-xl border border-border bg-background/60 p-2.5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold w-5">{result.rank}</span>
                          <span className="text-xs">score {result.score.toFixed(3)}</span>
                          <StatusPill
                            variant={
                              result.relevance === 'high'
                                ? 'success'
                                : result.relevance === 'medium'
                                  ? 'info'
                                  : 'error'
                            }
                          >
                            {result.relevance === 'high' ? 'Высокая' : result.relevance === 'medium' ? 'Средняя' : 'Низкая'}
                          </StatusPill>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 break-words">{result.document}</p>
                      </div>
                    ))}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border p-2">
                      <span className="text-muted-foreground block">Документов</span>
                      <span className="font-medium">{rankingResult.results.length}</span>
                    </div>
                    <div className="rounded-xl border border-border p-2">
                      <span className="text-muted-foreground block">Средний score</span>
                      <span className="font-medium">
                        {(rankingResult.results.reduce((acc, r) => acc + r.score, 0) / rankingResult.results.length).toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Введите запрос и нажмите «Ранжировать»
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


export default RankingTool;