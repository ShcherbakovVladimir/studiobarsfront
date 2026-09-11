import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import chatReducer from './chatSlice';
import chatListReducer from './chatListSlice';
import modelsReducer from './modelsSlice';
import finetuneReducer, { finetunePersistMiddleware } from './finetuneSlice';
import benchmarkReducer from './benchmarkSlice';
import hardwareReducer from './hardwareSlice';
import adaptersReducer from './adaptersSlice';
import ragReducer from './ragSlice';
import authReducer from './authSlice';
import runtimeConfigReducer from './runtimeConfigSlice';
import workspaceUiReducer from './workspaceUiSlice';
import inferenceLabReducer from './inferenceLabSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    workspaceUi: workspaceUiReducer,
    auth: authReducer,
    runtimeConfig: runtimeConfigReducer,
    chat: chatReducer,
    chatList: chatListReducer,
    models: modelsReducer,
    finetune: finetuneReducer,
    benchmark: benchmarkReducer,
    hardware: hardwareReducer,
    adapters: adaptersReducer,
    rag: ragReducer,
    inferenceLab: inferenceLabReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['models.models', 'finetune.dataset', 'finetune.currentSession', 'finetune.sessions'],
      },
    }).concat(finetunePersistMiddleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
