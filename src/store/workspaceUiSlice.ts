import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const PANEL_IDS = {
  AGENT_LAB: 'agent-lab',
  INFERENCE_LAB: 'inference-lab',
  EMBEDDING_TOOLS: 'embedding-tools',
  RAG_CHAT: 'rag-chat',
  FINETUNE: 'finetune',
} as const;

export type PanelId = (typeof PANEL_IDS)[keyof typeof PANEL_IDS];

export type AgentLabTool =
  | 'chat'
  | 'tools'
  | 'grammar'
  | 'embedding'
  | 'insights'
  | 'ranking'
  | 'functions'
  | 'advanced'
  | 'system'
  | 'settings'
  | 'wrappers';

export interface PanelUiState {
  activeTab: string;
  toggles: Record<string, boolean>;
}

export interface WorkspaceUiState {
  panels: Record<string, PanelUiState>;
  scrollPositions: Record<string, number>;
}

const STORAGE_KEY = 'xlam-workspace-ui-v1';

function createPanel(activeTab: string, toggles: Record<string, boolean> = {}): PanelUiState {
  return { activeTab, toggles };
}

export const defaultWorkspaceUiState: WorkspaceUiState = {
  panels: {
    [PANEL_IDS.AGENT_LAB]: createPanel('chat', {
      showSettings: false,
      showMobileMenu: false,
      showChatList: true,
      useTools: false,
      enableThinking: true,
      preserveThinking: false,
    }),
    [PANEL_IDS.INFERENCE_LAB]: createPanel('inference'),
    [PANEL_IDS.EMBEDDING_TOOLS]: createPanel('embedding'),
    [PANEL_IDS.RAG_CHAT]: createPanel('chat', {
      sessionListOpen: true,
      filesListOpen: true,
      showUploadModal: false,
      showDocumentsModal: false,
      batchMode: false,
      showTableList: false,
      showQwenSettings: false,
      enableThinking: true,
      preserveThinking: false,
      pdfRepoOpen: false,
      ragIndexOpen: false,
    }),
    [PANEL_IDS.FINETUNE]: createPanel('train', {
      showAdvanced: false,
      isSidebarOpen: false,
    }),
  },
  scrollPositions: {},
};

function mergePanelState(panelId: string, saved?: Partial<PanelUiState>): PanelUiState {
  const defaults = defaultWorkspaceUiState.panels[panelId] ?? createPanel('default');
  if (!saved) return { ...defaults, toggles: { ...defaults.toggles } };
  return {
    activeTab: saved.activeTab ?? defaults.activeTab,
    toggles: { ...defaults.toggles, ...(saved.toggles ?? {}) },
  };
}

function loadWorkspaceUiState(): WorkspaceUiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWorkspaceUiState;
    const parsed = JSON.parse(raw) as Partial<WorkspaceUiState>;
    const savedPanels = parsed.panels ?? {};
    const panels = Object.fromEntries(
      Object.keys(defaultWorkspaceUiState.panels).map((panelId) => [
        panelId,
        mergePanelState(panelId, savedPanels[panelId]),
      ])
    ) as Record<string, PanelUiState>;
    const scrollPositions = { ...(parsed.scrollPositions ?? {}) };
    delete scrollPositions[getScrollKey(PANEL_IDS.AGENT_LAB, 'chat')];
    return {
      panels,
      scrollPositions,
    };
  } catch {
    return defaultWorkspaceUiState;
  }
}

function persistWorkspaceUiState(state: WorkspaceUiState): void {
  try {
    const scrollPositions = { ...state.scrollPositions };
    delete scrollPositions[getScrollKey(PANEL_IDS.AGENT_LAB, 'chat')];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        panels: state.panels,
        scrollPositions,
      })
    );
  } catch {
    // ignore quota / private mode errors
  }
}

const workspaceUiSlice = createSlice({
  name: 'workspaceUi',
  initialState: loadWorkspaceUiState(),
  reducers: {
    setPanelActiveTab: (
      state,
      action: PayloadAction<{ panelId: string; tab: string }>
    ) => {
      const { panelId, tab } = action.payload;
      if (!state.panels[panelId]) {
        state.panels[panelId] = createPanel(tab);
      } else {
        state.panels[panelId].activeTab = tab;
      }
      persistWorkspaceUiState(state);
    },
    setPanelToggle: (
      state,
      action: PayloadAction<{ panelId: string; key: string; value: boolean }>
    ) => {
      const { panelId, key, value } = action.payload;
      if (!state.panels[panelId]) {
        state.panels[panelId] = createPanel('default');
      }
      state.panels[panelId].toggles[key] = value;
      persistWorkspaceUiState(state);
    },
    togglePanelToggle: (
      state,
      action: PayloadAction<{ panelId: string; key: string }>
    ) => {
      const { panelId, key } = action.payload;
      if (!state.panels[panelId]) {
        state.panels[panelId] = createPanel('default');
      }
      const current = state.panels[panelId].toggles[key] ?? false;
      state.panels[panelId].toggles[key] = !current;
      persistWorkspaceUiState(state);
    },
    setScrollPosition: (
      state,
      action: PayloadAction<{ key: string; scrollTop: number }>
    ) => {
      state.scrollPositions[action.payload.key] = action.payload.scrollTop;
      persistWorkspaceUiState(state);
    },
    resetPanelUi: (state, action: PayloadAction<{ panelId: string }>) => {
      const defaults = defaultWorkspaceUiState.panels[action.payload.panelId];
      if (defaults) {
        state.panels[action.payload.panelId] = { ...defaults };
        Object.keys(state.scrollPositions).forEach((key) => {
          if (key.startsWith(`${action.payload.panelId}:`)) {
            delete state.scrollPositions[key];
          }
        });
        persistWorkspaceUiState(state);
      }
    },
  },
});

export const {
  setPanelActiveTab,
  setPanelToggle,
  togglePanelToggle,
  setScrollPosition,
  resetPanelUi,
} = workspaceUiSlice.actions;

export default workspaceUiSlice.reducer;

export function getScrollKey(panelId: string, tab: string): string {
  return `${panelId}:${tab}`;
}
