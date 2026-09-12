// /home/user/projects/studioxlam/src/store/ragSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  RAGState,
  RAGMessage,
  RAGDatabaseStatus,
  RAGMetrics,
  RAGSchema,
  RagSession,
  RAGSource,
  RAGGeneratedFile,
} from '../types';
import ragService, {
  mergeSessionTitles,
  saveSessionTitle,
  clearSessionTitle,
  loadLocalRagSessionStore,
  saveLocalRagSessionStore,
  pickActiveRagSessionId,
} from '../services/ragService';
import { getRagDefaults } from '../config/runtimeConfig';
import { loadRagQueryPrefs, sanitizeLimit, sanitizeRelevance } from '../utils/ragQueryPrefs';

function defaultQuerySettings(): RAGState['querySettings'] {
  const defaults = getRagDefaults();
  const saved = typeof window !== 'undefined' ? loadRagQueryPrefs() : null;
  return {
    limit: sanitizeLimit(saved?.limit ?? defaults?.limit ?? 10),
    relevanceScore: sanitizeRelevance(saved?.relevanceScore ?? defaults?.relevanceScore ?? 0.5),
  };
}

function resolveSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}

function normalizeSources(sources: unknown): RAGSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((item): item is RAGSource => Boolean(item && typeof item === 'object' && 'source' in item))
    .map((item) => ({
      source: String(item.source),
      similarity: typeof item.similarity === 'number' ? item.similarity : undefined,
    }));
}

function normalizeGeneratedFiles(files: unknown): RAGGeneratedFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .filter((item): item is RAGGeneratedFile => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: item.id,
      name: item.name,
      content: item.content,
      type: item.type,
    }));
}

const initialState: RAGState = {
  sessionId: '',
  sessions: [],
  messages: [],
  isLoading: false,
  isStreaming: false,
  isSessionsLoaded: false,
  databaseStatus: null,
  metrics: null,
  schema: null,
  embeddingHealth: null,
  querySettings: defaultQuerySettings(),
  error: null,
  searchMode: 'llm',
};

// Асинхронные thunks
export const bootstrapRAGSessions = createAsyncThunk(
  'rag/bootstrapSessions',
  async (userId: string | undefined) => {
    const server = await ragService.listSessions();
    const local = loadLocalRagSessionStore(userId);
    const sessions = mergeSessionTitles(userId, server);
    saveLocalRagSessionStore(userId, sessions, local.lastActiveId);
    return sessions;
  }
);

export const bootstrapRAG = createAsyncThunk(
  'rag/bootstrap',
  async (userId: string | undefined, { dispatch }) => {
    const [sessions, embeddingHealth] = await Promise.all([
      dispatch(bootstrapRAGSessions(userId)).unwrap(),
      ragService.getEmbeddingHealth().catch(() => null),
    ]);

    const local = loadLocalRagSessionStore(userId);
    const urlSessionId = resolveSessionIdFromUrl();
    const activeId = pickActiveRagSessionId(sessions, [urlSessionId, local.lastActiveId]);
    saveLocalRagSessionStore(userId, sessions, activeId || null);

    return {
      sessions,
      activeId,
      embeddingHealth,
    };
  }
);

export const loadRAGEmbeddingHealth = createAsyncThunk(
  'rag/loadEmbeddingHealth',
  async () => ragService.getEmbeddingHealth()
);

export const sendRAGQueryStream = createAsyncThunk(
  'rag/sendQueryStream',
  async (
    {
      query,
      sessionId,
      qwenParams,
      searchMode,
      history,
      intent,
      documentSources,
      compareDocuments,
      tableNames,
      attachedFiles,
    }: {
      query: string;
      sessionId: string;
      qwenParams?: {
        enableThinking?: boolean;
        preserveThinking?: boolean;
        qwenMode?: string;
      };
      searchMode?: 'llm' | 'direct';
      history?: Array<{ role: string; content: string }>;
      intent?: 'chat' | 'document' | 'sql';
      documentSources?: string[];
      compareDocuments?: string[];
      tableNames?: string[];
      attachedFiles?: RAGMessage['attached_files'];
    },
    { dispatch, signal, rejectWithValue, getState }
  ) => {
    const assistantId = `assistant_${Date.now()}`;
    const mode = searchMode ?? 'llm';

    dispatch(setError(null));
    dispatch(setLoading(true));
    dispatch(setStreaming(true));

    dispatch(
      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        search_mode: mode,
        metrics: {},
      })
    );

    let streamedContent = '';
    let streamError: string | null = null;

    try {
      const state = getState() as { rag: RAGState };
      const { limit, relevanceScore } = state.rag.querySettings;

      if (mode === 'direct') {
        const search = await ragService.searchDocuments(query, limit, relevanceScore);
        const results = search.results ?? [];
        const text = results.length > 0
          ? results
              .map(
                (chunk, index) =>
                  `**${index + 1}. ${chunk.source ?? 'фрагмент'}** (${Math.round((chunk.similarity ?? 0) * 100)}%)\n${chunk.content ?? ''}`
              )
              .join('\n\n---\n\n')
          : 'По вашему запросу фрагменты не найдены среди ваших документов.';

        dispatch(
          finalizeRAGMessage({
            id: assistantId,
            content: text,
            search_mode: 'direct',
            sources: normalizeSources(results.map((c) => ({ source: c.source, similarity: c.similarity }))),
          })
        );
        return { sessionId, assistantId };
      }

      const resolvedIntent =
        intent ??
        (compareDocuments && compareDocuments.length >= 2
          ? 'document'
          : tableNames && tableNames.length > 0
            ? 'sql'
            : documentSources?.length
              ? 'document'
              : 'chat');

      await ragService.queryStream(
        {
          query,
          sessionId,
          enableThinking: qwenParams?.enableThinking,
          preserveThinking: qwenParams?.preserveThinking,
          qwenMode: qwenParams?.qwenMode || 'auto',
          history: history ?? [],
          limit,
          relevanceScore,
          intent: resolvedIntent,
          documentSources,
          compareDocuments,
          tableNames,
        },
        {
          signal,
          onEvent: (event) => {
            if (event.type === 'chunk') {
              if (event.content) {
                streamedContent += event.content;
                dispatch(updateStreamingMessage({ id: assistantId, content: streamedContent }));
              }
              if (Array.isArray(event.thinkBlocks)) {
                for (const block of event.thinkBlocks) {
                  if (typeof block === 'string' && block.trim()) {
                    dispatch(appendThinkBlock({ id: assistantId, block }));
                  }
                }
              }
            } else if (event.type === 'thinking') {
              const blocks = [
                ...(Array.isArray(event.thinkBlocks) ? event.thinkBlocks : []),
                event.content,
              ];
              for (const block of blocks) {
                if (typeof block === 'string' && block.trim()) {
                  dispatch(appendThinkBlock({ id: assistantId, block }));
                }
              }
            } else if (event.type === 'final') {
              const finalContent =
                event.text_analysis ?? event.response ?? streamedContent;
              const thinkBlocks = [
                ...(Array.isArray(event.think_blocks) ? event.think_blocks : []),
                ...(Array.isArray(event.thinkBlocks) ? event.thinkBlocks.filter((b): b is string => typeof b === 'string') : []),
              ];
              dispatch(
                finalizeRAGMessage({
                  id: assistantId,
                  content: finalContent,
                  metrics: event.metrics,
                  chart_data: event.chart_data ?? null,
                  insights: event.insights,
                  recommendations: event.recommendations,
                  sql: event.sql,
                  explanation: event.explanation,
                  row_count: event.row_count,
                  execution_time: event.execution_time,
                  search_mode: event.search_mode ?? mode,
                  ...(thinkBlocks.length ? { think_blocks: thinkBlocks } : {}),
                  sources: normalizeSources(event.sources),
                  generated_files: normalizeGeneratedFiles(event.generated_files),
                })
              );
            } else if (event.type === 'error') {
              // По контракту после error часто приходит final — поток не обрываем.
              streamError = event.error ?? 'RAG stream error';
            }
          },
        }
      );

      const assistant = (getState() as { rag: RAGState }).rag.messages.find(
        (m: RAGMessage) => m.id === assistantId
      );
      if (assistant?.isStreaming) {
        if (streamError && !streamedContent) {
          throw new Error(streamError);
        }
        dispatch(
          finalizeRAGMessage({
            id: assistantId,
            content: streamedContent || 'Ответ получен.',
            search_mode: mode,
          })
        );
      }

      return { sessionId, assistantId };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const message = isAbort
        ? 'Генерация остановлена'
        : error instanceof Error
          ? error.message
          : 'Request failed';
      dispatch(
        finalizeRAGMessage({
          id: assistantId,
          content: isAbort ? (streamedContent || '⏹ Генерация остановлена') : `❌ ${message}`,
          isError: !isAbort && Boolean(message),
          isAborted: isAbort,
          search_mode: mode,
        })
      );
      return rejectWithValue(message);
    } finally {
      dispatch(setLoading(false));
      dispatch(setStreaming(false));
    }
  }
);

/** @deprecated Use sendRAGQueryStream */
export const sendRAGQuery = sendRAGQueryStream;

export const loadRAGHistory = createAsyncThunk(
  'rag/loadHistory',
  async (sessionId: string) => {
    const history = await ragService.getHistory(sessionId);
    return history;
  }
);

export const clearRAGHistory = createAsyncThunk(
  'rag/clearHistory',
  async (sessionId: string) => {
    await ragService.clearHistory(sessionId);
    return sessionId;
  }
);

export const createRAGSession = createAsyncThunk(
  'rag/createSession',
  async (title: string | undefined, { getState, rejectWithValue }) => {
    try {
      const session = await ragService.createSession(title || 'Новая сессия');
      const userId = (getState() as { auth?: { user?: { id?: string } }; rag: RAGState }).auth?.user?.id;
      const current = (getState() as { rag: RAGState }).rag.sessions;
      saveLocalRagSessionStore(userId, [session, ...current.filter((row) => row.sessionId !== session.sessionId)], session.sessionId);
      return session;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось создать сессию');
    }
  }
);

export const deleteRAGSession = createAsyncThunk(
  'rag/deleteSession',
  async (sessionId: string, { getState }) => {
    await ragService.deleteSession(sessionId);
    const userId = (getState() as { auth?: { user?: { id?: string } } }).auth?.user?.id;
    if (userId) {
      const local = loadLocalRagSessionStore(userId);
      saveLocalRagSessionStore(
        userId,
        local.sessions.filter((session) => session.sessionId !== sessionId),
        local.lastActiveId === sessionId ? null : local.lastActiveId
      );
    }
    return sessionId;
  }
);

export const refreshRAGSessions = createAsyncThunk(
  'rag/refreshSessions',
  async (userId: string | undefined, { getState }) => {
    const server = await ragService.listSessions();
    const sessions = mergeSessionTitles(userId, server);
    saveLocalRagSessionStore(userId, sessions, (getState() as { rag: RAGState }).rag.sessionId);
    return sessions;
  }
);

export const renameRAGSession = createAsyncThunk(
  'rag/renameSession',
  async (
    { sessionId, title, userId }: { sessionId: string; title: string; userId?: string },
    { rejectWithValue }
  ) => {
    try {
      const nextTitle = title.trim();
      if (userId) {
        if (nextTitle) saveSessionTitle(userId, sessionId, nextTitle);
        else clearSessionTitle(userId, sessionId);
      }
      const updated = await ragService.updateSessionTitle(sessionId, nextTitle);
      return {
        sessionId,
        title: updated?.title ?? nextTitle,
        customTitle: updated?.customTitle ?? nextTitle.length > 0,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось переименовать');
    }
  }
);

export const checkRAGDatabase = createAsyncThunk(
  'rag/checkDatabase',
  async () => {
    const result = await ragService.testConnection();
    return result.database;
  }
);

export const loadRAGMetrics = createAsyncThunk(
  'rag/loadMetrics',
  async () => {
    const metrics = await ragService.getMetrics();
    return metrics;
  }
);

export const loadRAGSchema = createAsyncThunk(
  'rag/loadSchema',
  async () => {
    const schema = await ragService.getSchema();
    return schema.schema;
  }
);

export const refreshRAGSchema = createAsyncThunk(
  'rag/refreshSchema',
  async () => {
    await ragService.refreshSchema();
    const schema = await ragService.getSchema();
    return schema.schema;
  }
);

const ragSlice = createSlice({
  name: 'rag',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
    addMessage: (state, action: PayloadAction<RAGMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateDatabaseStatus: (state, action: PayloadAction<RAGDatabaseStatus>) => {
      state.databaseStatus = action.payload;
    },
    updateMetrics: (state, action: PayloadAction<RAGMetrics>) => {
      state.metrics = action.payload;
    },
    updateSchema: (state, action: PayloadAction<RAGSchema>) => {
      state.schema = action.payload;
    },
    setSessions: (state, action: PayloadAction<RAGState['sessions']>) => {
      state.sessions = action.payload;
      state.isSessionsLoaded = true;
    },
    addRAGSession: (state, action: PayloadAction<RagSession>) => {
      const exists = state.sessions.some((s) => s.sessionId === action.payload.sessionId);
      if (!exists) {
        state.sessions.unshift(action.payload);
      }
    },
    removeRAGSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter((s) => s.sessionId !== action.payload);
    },
    setStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
    },
    updateStreamingMessage: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) msg.content = action.payload.content;
    },
    appendThinkBlock: (state, action: PayloadAction<{ id: string; block: string }>) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (!msg) return;
      if (!msg.think_blocks) msg.think_blocks = [];
      if (msg.think_blocks[msg.think_blocks.length - 1] === action.payload.block) return;
      msg.think_blocks.push(action.payload.block);
    },
    finalizeRAGMessage: (
      state,
      action: PayloadAction<{ id: string } & Partial<RAGMessage>>
    ) => {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (!msg) return;
      const { id: _removed, think_blocks, ...patch } = action.payload;
      void _removed;
      Object.assign(msg, patch, { isStreaming: false });
      if (Array.isArray(think_blocks) && think_blocks.length > 0) {
        msg.think_blocks = think_blocks;
      }
    },
    setSearchMode: (state, action: PayloadAction<'llm' | 'direct'>) => {
      state.searchMode = action.payload;
    },
    setQuerySettings: (state, action: PayloadAction<Partial<RAGState['querySettings']>>) => {
      state.querySettings = { ...state.querySettings, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapRAG.fulfilled, (state, action) => {
        state.sessions = action.payload.sessions;
        state.isSessionsLoaded = true;
        state.sessionId = action.payload.activeId;
        state.embeddingHealth = action.payload.embeddingHealth;
      })
      .addCase(loadRAGEmbeddingHealth.fulfilled, (state, action) => {
        state.embeddingHealth = action.payload;
      })
      .addCase(bootstrapRAGSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
        state.isSessionsLoaded = true;
      })
      .addCase(createRAGSession.fulfilled, (state, action) => {
        const session = action.payload;
        state.sessions = [session, ...state.sessions.filter((row) => row.sessionId !== session.sessionId)];
        state.sessionId = session.sessionId;
        state.messages = [];
        state.isSessionsLoaded = true;
      })
      .addCase(refreshRAGSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
        state.isSessionsLoaded = true;
        if (state.sessionId && !state.sessions.some((session) => session.sessionId === state.sessionId)) {
          state.sessionId = state.sessions[0]?.sessionId ?? '';
        }
      })
      .addCase(renameRAGSession.fulfilled, (state, action) => {
        const { sessionId, title, customTitle } = action.payload;
        const session = state.sessions.find((s) => s.sessionId === sessionId);
        if (session) {
          session.title = title || session.title;
          session.customTitle = customTitle;
        }
      })
      // sendRAGQueryStream
      .addCase(sendRAGQueryStream.pending, (state) => {
        state.error = null;
      })
      .addCase(sendRAGQueryStream.fulfilled, (state, action) => {
        const { sessionId, query } = action.meta.arg;
        const trimmed = query.trim();
        const titleFromQuery =
          trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
        const existing = state.sessions.find((s) => s.sessionId === sessionId);
        const messageCount = (existing?.messageCount ?? 0) + 2;
        const now = new Date().toISOString();
        const keepTitle = existing?.customTitle === true;
        const session: RagSession = {
          sessionId,
          title: keepTitle ? existing.title : titleFromQuery || existing?.title || 'Новая сессия',
          customTitle: keepTitle,
          updatedAt: now,
          messageCount,
          count: messageCount,
        };
        state.sessions = [
          session,
          ...state.sessions.filter((s) => s.sessionId !== sessionId),
        ];
      })
      .addCase(sendRAGQueryStream.rejected, (state, action) => {
        state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Request failed';
      })
      // loadRAGHistory
      .addCase(loadRAGHistory.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.history) {
          const messages: RAGMessage[] = [];
          for (const item of action.payload.history) {
            messages.push({
              id: item.timestamp,
              role: 'user',
              content: item.query,
              timestamp: new Date(item.timestamp),
              attached_files: item.attached_files,
            });
            messages.push({
              id: `${item.timestamp}_response`,
              role: 'assistant',
              content: item.response.text_analysis,
              metrics: item.response.metrics,
              timestamp: new Date(item.timestamp),
              search_mode: item.response.search_mode,
              think_blocks: item.think_blocks,
              sources: normalizeSources(item.response.sources),
              generated_files: normalizeGeneratedFiles(item.response.generated_files),
              sql: item.response.sql ?? undefined,
              response_type: item.response.type,
            });
          }
          state.messages = messages;
        }
      })
      // clearRAGHistory
      .addCase(clearRAGHistory.fulfilled, (state) => {
        state.messages = [];
      })
      .addCase(deleteRAGSession.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.sessions = state.sessions.filter((s) => s.sessionId !== deletedId);
        if (state.sessionId === deletedId) {
          state.sessionId = state.sessions[0]?.sessionId ?? '';
          state.messages = [];
        }
      })
      // checkRAGDatabase
      .addCase(checkRAGDatabase.fulfilled, (state, action) => {
        state.databaseStatus = action.payload;
      })
      // loadRAGMetrics
      .addCase(loadRAGMetrics.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.metrics = action.payload;
        }
      })
      // loadRAGSchema
      .addCase(loadRAGSchema.fulfilled, (state, action) => {
        state.schema = action.payload;
      })
      // refreshRAGSchema
      .addCase(refreshRAGSchema.fulfilled, (state, action) => {
        state.schema = action.payload;
      });
  }
});

export const {
  setSessionId,
  addMessage,
  clearMessages,
  setLoading,
  setError,
  updateDatabaseStatus,
  updateMetrics,
  updateSchema,
  setSearchMode,
  setQuerySettings,
  setSessions,
  addRAGSession,
  removeRAGSession,
  setStreaming,
  updateStreamingMessage,
  appendThinkBlock,
  finalizeRAGMessage,
} = ragSlice.actions;

export default ragSlice.reducer;