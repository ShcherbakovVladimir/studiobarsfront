import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ChatListState, ChatSummary, PersistedChat } from '../types';
import * as chatSyncService from '../services/chatSyncService';

const PREFETCH_TTL_MS = 120_000;

const initialState: ChatListState = {
  chats: [],
  activeChatId: null,
  isLoading: false,
  isPrefetchDone: false,
  error: null,
  lastFetchedAt: null,
};

export const prefetchChatList = createAsyncThunk(
  'chatList/prefetch',
  async (force: boolean | undefined, { getState }) => {
    const state = getState() as { chatList: ChatListState };
    if (
      !force &&
      state.chatList.isPrefetchDone &&
      state.chatList.lastFetchedAt &&
      Date.now() - state.chatList.lastFetchedAt < PREFETCH_TTL_MS
    ) {
      return state.chatList.chats;
    }
    return chatSyncService.listChatSummaries();
  }
);

export const loadChatById = createAsyncThunk(
  'chatList/loadById',
  async (chatId: string) => chatSyncService.getChatFromServer(chatId)
);

export const syncChat = createAsyncThunk(
  'chatList/sync',
  async (chat: PersistedChat) => chatSyncService.saveChatToServer(chat)
);

export const deleteChatById = createAsyncThunk(
  'chatList/delete',
  async (chatId: string) => {
    await chatSyncService.deleteChat(chatId);
    return chatId;
  }
);

const chatListSlice = createSlice({
  name: 'chatList',
  initialState,
  reducers: {
    setActiveChatId: (state, action: PayloadAction<string | null>) => {
      state.activeChatId = action.payload;
    },
    upsertChatSummary: (state, action: PayloadAction<ChatSummary>) => {
      const idx = state.chats.findIndex((c) => c.id === action.payload.id);
      if (idx >= 0) {
        state.chats[idx] = { ...state.chats[idx], ...action.payload };
      } else {
        state.chats.unshift(action.payload);
      }
    },
    clearChatList: (state) => {
      state.chats = [];
      state.activeChatId = null;
      state.isPrefetchDone = false;
      state.lastFetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(prefetchChatList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(prefetchChatList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
        state.isPrefetchDone = true;
        state.lastFetchedAt = Date.now();
      })
      .addCase(prefetchChatList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to load chats';
      })
      .addCase(deleteChatById.fulfilled, (state, action) => {
        state.chats = state.chats.filter((c) => c.id !== action.payload);
        if (state.activeChatId === action.payload) {
          state.activeChatId = state.chats[0]?.id ?? null;
        }
      });
  },
});

export const { setActiveChatId, upsertChatSummary, clearChatList } = chatListSlice.actions;
export default chatListSlice.reducer;
