/** Product surfaces: flat DS3 panels, 8px radius, teal accent. */
export const celestia = {
  page: 'min-h-dvh text-foreground font-sans',
  glassPanel: 'glass-panel rounded-lg',
  glassInput: 'glass-input rounded-lg',
  card: 'glass-panel rounded-lg card-hover',
  cardHover: 'glass-panel rounded-lg card-hover',
  btnGradient: 'btn-gradient rounded-lg',
  textGradient: 'text-gradient font-display',
  sidebar: 'glass-panel border-r border-border',
  mobileHeader: 'glass-panel border-b border-border',
  /** Единая высота шапок: сайдбар, список чатов, контент (~48px). */
  appHeader:
    'app-header shrink-0 h-12 min-h-12 max-h-12 overflow-hidden border-b border-border px-2.5 sm:px-4 py-0',
  appHeaderBar:
    'app-header-bar shrink-0 h-12 border-b border-border px-3 flex items-center',
  workspaceScrim:
    'fixed inset-0 z-40 xl:hidden bg-black/45 transition-opacity duration-200 ease-out motion-reduce:transition-none',
  workspaceDrawer:
    'flex flex-col h-full bg-card xl:bg-card shrink-0 overflow-hidden fixed z-50 xl:relative xl:z-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] xl:pt-0 xl:pb-0 transition-[transform,width,box-shadow,border-color,opacity] duration-200 ease-out motion-reduce:transition-none border-r border-border',
  headerIcon:
    'h-8 w-8 transition-colors duration-150 active:bg-accent motion-reduce:transform-none rounded-md',
  headerMenuItem:
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors',
  composerDock:
    'px-3 sm:px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0',
  surfaceElevated: 'surface-elevated rounded-lg shadow-sm',
  surfaceMuted: 'surface-muted',
  chatBubbleAi: 'chat-msg-ai chat-message',
  chatBubbleUser: 'chat-msg-user chat-message',
  chatColumn: 'chat-column',
  chatComposer:
    'chat-composer flex items-center gap-2 rounded-lg border border-border glass-input px-2 py-1 overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 transition-shadow duration-150',
  chatComposerInput:
    'chat-composer-input min-w-0 flex-1 bg-transparent border-0 text-sm resize-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
  chatComposerStop:
    'chat-composer-stop shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
  sendButton:
    'chat-composer-send shrink-0 h-8 w-8 flex items-center justify-center btn-gradient rounded-md disabled:opacity-40',
} as const;
