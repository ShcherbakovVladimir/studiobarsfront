/** Celestia-style surfaces: glass, iOS radius, gradient actions. */
export const celestia = {
  page: 'min-h-dvh text-foreground font-sans',
  glassPanel: 'glass-panel rounded-3xl',
  glassInput: 'glass-input rounded-3xl',
  card: 'glass-panel rounded-3xl card-hover',
  cardHover: 'glass-panel rounded-3xl card-hover',
  btnGradient: 'btn-gradient rounded-3xl',
  textGradient: 'text-gradient font-display',
  sidebar: 'glass-panel border-r border-white/50 dark:border-white/10',
  mobileHeader: 'glass-panel border-b border-white/50 dark:border-white/10',
  /** Единая высота шапок: сайдбар, список чатов, контент (~48px). */
  appHeader: 'app-header shrink-0 min-h-12 border-b border-border/60 px-3 sm:px-4 py-2',
  appHeaderBar: 'app-header-bar shrink-0 h-12 border-b border-border/60 px-3 flex items-center',
  surfaceElevated: 'surface-elevated rounded-3xl shadow-xl',
  surfaceMuted: 'surface-muted',
  chatBubbleAi: 'chat-msg-ai chat-message',
  chatBubbleUser: 'chat-msg-user chat-message',
  chatColumn: 'chat-column',
  chatComposer:
    'chat-composer flex items-center gap-2 rounded-2xl border border-border glass-input px-2 py-1 overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 transition-all duration-200',
  chatComposerInput:
    'chat-composer-input min-w-0 flex-1 bg-transparent border-0 text-sm resize-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
  chatComposerStop:
    'chat-composer-stop shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
  sendButton:
    'chat-composer-send shrink-0 h-8 w-8 flex items-center justify-center btn-gradient rounded-full disabled:opacity-40',
} as const;
