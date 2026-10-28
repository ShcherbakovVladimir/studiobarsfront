# Каталог стилей studioxlam (полный)

## 1. CSS-переменные `:root` (светлая)

- `--background` = `#fafafa`
- `--foreground` = `#191919`
- `--card` = `#ffffff`
- `--card-foreground` = `#191919`
- `--popover` = `#ffffff`
- `--popover-foreground` = `#191919`
- `--primary` = `#0d9488`
- `--primary-foreground` = `#ffffff`
- `--primary-hover` = `#0f766e`
- `--primary-active` = `#115e59`
- `--secondary` = `#f1f1f1`
- `--secondary-foreground` = `#191919`
- `--muted` = `#f1f1f1`
- `--muted-foreground` = `#676767`
- `--accent` = `#e6f7f5`
- `--accent-foreground` = `#134e4a`
- `--destructive` = `#dc2626`
- `--border` = `#e0e0e0`
- `--input` = `#eaeaea`
- `--ring` = `#0d9488`
- `--chart-1` = `#0d9488`
- `--chart-2` = `#0f766e`
- `--chart-3` = `#a4a4a4`
- `--chart-4` = `#f59e0b`
- `--chart-5` = `#676767`
- `--sidebar` = `#ffffff`
- `--sidebar-foreground` = `#191919`
- `--sidebar-primary` = `#0d9488`
- `--sidebar-primary-foreground` = `#ffffff`
- `--sidebar-accent` = `#e6f7f5`
- `--sidebar-accent-foreground` = `#134e4a`
- `--sidebar-border` = `#eaeaea`
- `--sidebar-ring` = `#0d9488`
- `--canvas-dot` = `#d6d6d6`
- `--radius` = `0.5rem`

## 2. CSS-переменные `.dark`

- `--background` = `#191919`
- `--foreground` = `#fafafa`
- `--card` = `#242424`
- `--card-foreground` = `#fafafa`
- `--popover` = `#242424`
- `--popover-foreground` = `#fafafa`
- `--primary` = `#2dd4bf`
- `--primary-foreground` = `#042f2e`
- `--primary-hover` = `#14b8a6`
- `--primary-active` = `#0d9488`
- `--secondary` = `#353535`
- `--secondary-foreground` = `#fafafa`
- `--muted` = `#2e2e2e`
- `--muted-foreground` = `#a4a4a4`
- `--accent` = `#134e4a`
- `--accent-foreground` = `#ccfbf1`
- `--destructive` = `#f87171`
- `--border` = `rgb(255 255 255 / 12%)`
- `--input` = `rgb(255 255 255 / 14%)`
- `--ring` = `#2dd4bf`
- `--chart-1` = `#2dd4bf`
- `--chart-2` = `#14b8a6`
- `--chart-3` = `#a4a4a4`
- `--chart-4` = `#fbbf24`
- `--chart-5` = `#bfbfbf`
- `--sidebar` = `#1f1f1f`
- `--sidebar-foreground` = `#fafafa`
- `--sidebar-primary` = `#2dd4bf`
- `--sidebar-primary-foreground` = `#042f2e`
- `--sidebar-accent` = `#134e4a`
- `--sidebar-accent-foreground` = `#ccfbf1`
- `--sidebar-border` = `rgb(255 255 255 / 10%)`
- `--sidebar-ring` = `#2dd4bf`
- `--canvas-dot` = `#353535`

## 3. Именованные CSS-классы (`src/index.css`)


### `.dark`
- **color-scheme**: `dark`
- **--background**: `#191919`
- **--foreground**: `#fafafa`
- **--card**: `#242424`
- **--card-foreground**: `#fafafa`
- **--popover**: `#242424`
- **--popover-foreground**: `#fafafa`
- **--primary**: `#2dd4bf`
- **--primary-foreground**: `#042f2e`
- **--primary-hover**: `#14b8a6`
- **--primary-active**: `#0d9488`
- **--secondary**: `#353535`
- **--secondary-foreground**: `#fafafa`
- **--muted**: `#2e2e2e`
- **--muted-foreground**: `#a4a4a4`
- **--accent**: `#134e4a`
- **--accent-foreground**: `#ccfbf1`
- **--destructive**: `#f87171`
- **--border**: `rgb(255 255 255 / 12%)`
- **--input**: `rgb(255 255 255 / 14%)`
- **--ring**: `#2dd4bf`
- **--chart-1**: `#2dd4bf`
- **--chart-2**: `#14b8a6`
- **--chart-3**: `#a4a4a4`
- **--chart-4**: `#fbbf24`
- **--chart-5**: `#bfbfbf`
- **--sidebar**: `#1f1f1f`
- **--sidebar-foreground**: `#fafafa`
- **--sidebar-primary**: `#2dd4bf`
- **--sidebar-primary-foreground**: `#042f2e`
- **--sidebar-accent**: `#134e4a`
- **--sidebar-accent-foreground**: `#ccfbf1`
- **--sidebar-border**: `rgb(255 255 255 / 10%)`
- **--sidebar-ring**: `#2dd4bf`
- **--canvas-dot**: `#353535`

### `html`
- **scroll-behavior**: `smooth`

### `body`
- **margin**: `0`
- **padding**: `0`
- **width**: `100%`
- **height**: `100%`

### `body`
- **min-height**: `100vh`
- **overflow-x**: `hidden`
- **font-family**: `var(--font-sans)`
- **font-weight**: `400`
- **line-height**: `1.5`
- **letter-spacing**: `0.01em`
- **color**: `var(--foreground)`
- **background**: `var(--background)`
- **font-feature-settings**: `"kern" 1`
- **text-rendering**: `optimizeLegibility`
- **-webkit-font-smoothing**: `antialiased`
- **-moz-osx-font-smoothing**: `grayscale`

### `#root`
- **width**: `100%`
- **min-height**: `100vh`

### `.logo-plate`
- **fill**: `var(--foreground)`

### `.logo-ink`
- **fill**: `var(--background)`

### `.page-title`
- **font-family**: `var(--font-sans)`
- **font-weight**: `500`
- **letter-spacing**: `-0.02em`
- **line-height**: `1.2`

### `.bg-celestia-gradient`
- **background-color**: `var(--background)`
- **background-image**: `radial-gradient(var(--canvas-dot) 1px, transparent 1px)`
- **background-size**: `16px 16px`

### `.bg-celestia-gradient`
- **background-color**: `var(--background)`
- **background-image**: `radial-gradient(var(--canvas-dot) 1px, transparent 1px)`
- **background-size**: `16px 16px`

### `.glass-modal`
- **background**: `var(--card)`
- **border**: `1px solid var(--border)`
- **box-shadow**: `0 4px 16px rgb(0 0 0 / 8%),
    0 12px 40px rgb(0 0 0 / 6%)`

### `.glass-modal`
- **background**: `var(--card)`
- **border-color**: `var(--border)`
- **box-shadow**: `0 4px 16px rgb(0 0 0 / 35%),
    0 12px 40px rgb(0 0 0 / 25%)`

### `.modal-scrim`
- **background**: `rgb(25 25 25 / 0.45)`

### `.modal-scrim`
- **background**: `rgb(0 0 0 / 0.6)`

### `.glass-panel`
- **background**: `var(--card)`
- **border**: `1px solid var(--border)`
- **box-shadow**: `0 1px 2px rgb(0 0 0 / 4%)`

### `.glass-panel`
- **background**: `var(--card)`
- **border-color**: `var(--border)`
- **box-shadow**: `0 1px 2px rgb(0 0 0 / 25%)`

### `.glass-input`
- **background**: `var(--background)`
- **border**: `1px solid var(--input)`
- **border-radius**: `var(--radius)`
- **transition**: `border-color 0.15s ease, box-shadow 0.15s ease`
- **color**: `var(--foreground)`

### `.glass-input:focus`
- **background**: `var(--card)`
- **border-color**: `var(--primary)`
- **box-shadow**: `0 0 0 3px color-mix(in srgb, var(--primary) 28%, transparent)`
- **outline**: `none`

### `.glass-input`
- **background**: `var(--muted)`
- **border-color**: `var(--border)`

### `.glass-input:focus`
- **background**: `var(--card)`

### `.surface-elevated`
- **background**: `var(--card)`
- **border**: `1px solid var(--border)`
- **box-shadow**: `0 2px 8px rgb(0 0 0 / 6%)`

### `.surface-elevated`
- **background**: `var(--card)`
- **border-color**: `var(--border)`
- **box-shadow**: `0 2px 8px rgb(0 0 0 / 30%)`

### `.surface-muted`
- **background**: `var(--muted)`

### `.surface-muted`
- **background**: `var(--muted)`

### `.chat-column`
- **width**: `100%`
- **max-width**: `min(52rem, 100%)`
- **min-width**: `0`
- **margin-inline**: `auto`

### `.chat-msg-user,
.chat-msg-ai`
- **min-width**: `0`
- **overflow-wrap**: `anywhere`
- **word-break**: `break-word`

### `.chat-msg-user`
- **max-width**: `min(85%, 40rem)`
- **padding**: `0.5rem 0.875rem`
- **border-radius**: `0.5rem`
- **background**: `var(--accent)`
- **color**: `var(--accent-foreground)`
- **font-size**: `0.875rem`
- **line-height**: `1.5`
- **box-shadow**: `none`
- **border**: `1px solid color-mix(in srgb, var(--primary) 28%, transparent)`

### `.chat-msg-user`
- **background**: `var(--accent)`
- **border-color**: `color-mix(in srgb, var(--primary) 35%, transparent)`
- **color**: `var(--accent-foreground)`

### `.chat-msg-ai`
- **width**: `100%`
- **max-width**: `100%`
- **padding**: `0.125rem 0.125rem`
- **background**: `transparent`
- **border**: `none`
- **box-shadow**: `none`
- **backdrop-filter**: `none`
- **color**: `var(--foreground)`
- **font-size**: `0.875rem`
- **line-height**: `1.55`

### `.chat-msg-ai`
- **background**: `transparent`
- **border**: `none`

### `.katex-display`
- **max-width**: `100%`

### `.katex-display`
- **overflow-wrap**: `normal`
- **word-break**: `normal`

### `.katex-display`
- **overflow-x**: `auto`
- **overflow-y**: `hidden`

### `.overflow-x-auto`
- **min-width**: `0`

### `.workspace-file-sheet`
- **border-radius**: `0.5rem`
- **border**: `1px solid var(--border)`
- **background**: `var(--card)`
- **box-shadow**: `0 1px 2px rgb(0 0 0 / 4%)`
- **padding**: `1.35rem 1.35rem 1.75rem`

### `.chat-msg-ai`
- **padding**: `1.5rem 1.45rem 2rem`
- **line-height**: `1.7`

### `.chat-composer`
- **overflow**: `hidden`
- **isolation**: `isolate`
- **min-height**: `2.5rem`

### `.chat-composer-input`
- **min-height**: `2rem`
- **max-height**: `12.5rem`
- **padding**: `0.375rem 0.5rem`
- **line-height**: `1.25rem`
- **overflow-y**: `auto`
- **overscroll-behavior**: `contain`
- **scrollbar-width**: `thin`
- **scrollbar-gutter**: `stable`
- **border**: `0`
- **box-shadow**: `none`

### `.chat-composer-input:focus,
.chat-composer-input:focus-visible`
- **outline**: `none`
- **box-shadow**: `none`
- **border**: `0`

### `.chat-composer-send,
.chat-composer-stop`
- **align-self**: `center`
- **flex-shrink**: `0`

### `.btn-gradient`
- **display**: `inline-flex`
- **align-items**: `center`
- **justify-content**: `center`
- **background**: `var(--primary)`
- **border**: `1px solid var(--primary-hover)`
- **color**: `var(--primary-foreground)`
- **border-radius**: `var(--radius)`
- **font-weight**: `500`
- **transition**: `background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease`

### `.text-gradient`
- **color**: `var(--primary)`
- **background**: `none`
- **-webkit-text-fill-color**: `unset`

### `.text-gradient`
- **color**: `var(--primary)`
- **background**: `none`
- **-webkit-text-fill-color**: `unset`

### `.card-hover`
- **transition**: `border-color 0.15s ease, box-shadow 0.15s ease`

### `.card-hover:hover`
- **border-color**: `color-mix(in srgb, var(--primary) 45%, var(--border))`
- **box-shadow**: `0 2px 8px rgb(0 0 0 / 6%)`

### `.floating-orb`
- **display**: `none`

### `.page-enter`
- **animation**: `celestia-page-in 0.4s ease-out`

### `.chat-message`
- **animation**: `celestia-message-in 0.3s ease-out`

### `.workspace-list-item`
- **animation**: `workspace-item-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both`

### `.page-enter,
  .chat-message,
  .workspace-list-item`
- **animation**: `none`

### `.no-scrollbar`
- **-ms-overflow-style**: `none`
- **scrollbar-width**: `none`

### `*`
- **scrollbar-width**: `thin`
- **scrollbar-color**: `color-mix(in oklch, var(--muted-foreground) 32%, transparent) transparent`
- **border-color**: `var(--border)`
- **outline-color**: `color-mix(in oklch, var(--ring) 50%, transparent)`

### `::selection`
- **background**: `color-mix(in oklch, var(--primary) 28%, transparent)`
- **color**: `var(--foreground)`

### `:focus-visible`
- **outline**: `2px solid color-mix(in oklch, var(--primary) 70%, transparent)`
- **outline-offset**: `2px`

### `a`
- **color**: `inherit`
- **text-decoration**: `inherit`

### `textarea`
- **border-radius**: `var(--radius)`

### `.line-clamp-2`
- **display**: `-webkit-box`
- **-webkit-line-clamp**: `2`
- **-webkit-box-orient**: `vertical`
- **overflow**: `hidden`

### `.line-clamp-3`
- **display**: `-webkit-box`
- **-webkit-line-clamp**: `3`
- **-webkit-box-orient**: `vertical`
- **overflow**: `hidden`

### `.ui-native-select`
- **appearance**: `none`
- **-webkit-appearance**: `none`
- **background-image**: `url("data:image/svg+xml`
- **utf8,<svg xmlns='http**: `//www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m4 6 4 4 4-4'/></svg>")`
- **background-repeat**: `no-repeat`
- **background-position**: `right 0.9rem center`
- **background-size**: `1rem`
- **padding-right**: `2.5rem`
- **cursor**: `pointer`

### `.prose-sm`
- **font-size**: `0.875rem`
- **line-height**: `1.7`

### `.page-enter,
  .chat-message,
  .workspace-list-item`
- **animation**: `none`

## 4. Shared style-константы и className по файлам


### `src/App.tsx`
- **className**: `flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground`

### `src/components/AdvancedSettings.tsx`
- **className**: `glass-panel border border-border rounded-lg p-5 mb-6`
- **className**: `text-lg font-bold text-foreground mb-4`
- **className**: `grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6`
- **className**: `flex justify-between mb-2`
- **className**: `text-sm font-medium text-foreground/80`
- **className**: `text-xs font-mono bg-accent px-2 py-0.5 rounded`
- **className**: `w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-primary`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `text-xs font-mono bg-accent px-2 py-0.5 rounded w-16 text-right border-none focus:ring-1 focus:ring-ring/40`
- **className`…`**: ``

### `src/components/AgentLab.tsx`
- **className**: `mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`
- **className**: `w-2.5 h-2.5`
- **className**: `mt-2 text-[11px] text-muted-foreground`
- **className**: `mb-2 flex flex-wrap gap-2`
- **className**: `max-h-40 max-w-[220px] rounded-lg object-cover border border-white/20`
- **className**: `whitespace-pre-wrap break-words leading-relaxed`
- **className**: `text-muted-foreground italic`
- **className**: `inline-block ml-1 animate-pulse`
- **className**: `text-sm`
- **className**: `cursor-pointer list-none flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium`
- **className**: `text-xs text-purple-500 animate-pulse`
- **className**: `mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg text-purple-900 dark:text-purple-100 text-sm italic whitespace-pre-wrap break-words`
- **className**: `inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse align-middle`
- **className**: `text-xs text-muted-foreground italic`
- **className**: `inline-block ml-1 animate-pulse text-primary`
- **className**: `text-[11px] text-center mt-1.5 text-muted-foreground`
- **className**: `w-4 h-4`
- **className**: `w-3.5 h-3.5`
- **className**: `w-5 h-5 flex items-center justify-center`
- **className**: `absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg z-50`
- **className**: `w-14 flex-shrink-0 border-r border-border bg-background/40 flex flex-col`
- **className**: `flex flex-col items-center gap-1 py-2 px-1 flex-1`
- **className**: `flex flex-col items-center gap-1 w-full`
- **className**: `w-6 h-px bg-border dark:bg-muted my-2`
- **className**: `flex flex-col items-center gap-1 w-full mt-auto`
- **className**: `@container/agentchat flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full items-center justify-between gap-1.5`
- **className**: `flex min-w-0 flex-1 items-center gap-1 overflow-hidden`
- **className**: `min-w-0 truncate text-sm font-semibold text-foreground`
- **className**: `hidden @[28rem]/agentchat:block h-4 w-px bg-border shrink-0`
- **className**: `hidden @[22rem]/agentchat:block min-w-0 flex-1 truncate font-mono text-xs sm:text-sm text-muted-foreground`
- **className**: `flex h-full shrink-0 items-center gap-0.5 sm:gap-1`
- **className**: `inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0`
- **className**: `hidden @[32rem]/agentchat:inline`
- **className**: `flex`
- **className**: `hidden @[28rem]/agentchat:flex items-center gap-1.5 min-w-0`
- **className**: `flex items-center bg-accent rounded-lg p-0.5`
- **className**: `hidden @[36rem]/agentchat:inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 active:scale-95 disabled:opacity-40`
- **className**: `hidden sm:inline`
- **className**: `hidden @[42rem]/agentchat:inline-flex items-center gap-0.5`
- **className**: `rounded`
- **className**: `flex min-h-0 flex-1 overflow-hidden`
- **className**: `flex-1 min-w-0 overflow-hidden relative`
- **className**: `flex flex-col h-full min-w-0`
- **className**: `flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3`
- **className**: `rounded-lg border border-border bg-card p-2 text-sm`
- **className**: `mb-1 px-1 text-xs font-medium text-muted-foreground`
- **className**: `max-h-40 space-y-1 overflow-y-auto`
- **className**: `block w-full truncate rounded-lg px-2 py-1 text-left text-xs hover:bg-accent`
- **className**: `flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground`
- **className**: `w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3`
- **className**: `text-base font-medium text-foreground`
- **className**: `text-sm mt-2 text-muted-foreground text-center max-w-md`
- **className**: `mt-4 px-4 py-2 btn-gradient rounded-lg text-sm font-medium`
- **className**: `mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium`
- **className**: `flex justify-start py-1`
- **className**: `flex space-x-1.5`
- **className**: `w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce`
- **className**: `w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-75`
- **className**: `w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-150`
- **className**: `mb-2 flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs`
- **className**: `truncate`
- **className**: `mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5`
- **className**: `text-sm text-foreground`
- **className**: `mt-1 font-mono text-[11px] text-muted-foreground`
- **className**: `mt-2 inline-flex h-8 items-center rounded-lg bg-foreground px-3 text-xs font-medium text-background`
- **className**: `relative`
- **className**: `h-16 w-16 rounded-lg object-cover border border-border`
- **className**: `absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background text-xs leading-none`
- **className**: `mb-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-card p-1`
- **className**: `block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-accent`
- **className**: `px-3 py-2 text-xs text-muted-foreground`
- **className**: `hidden`
- **className**: `shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40`
- **className**: `p-3 sm:p-4 h-full`
- **className**: `p-6 h-full`
- **cn(...)**: `group relative w-full flex items-center justify-center rounded-lg transition-all duration-200`
- **cn(...)**: `bg-accent text-primary shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-accent/70 hover:text-foreground dark:hover:text-foreground`
- **cn(...)**: `flex items-center`
- **cn(...)**: `shrink-0`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `text-amber-600 dark:text-amber-400`
- **cn(...)**: `animate-pulse`
- **cn(...)**: `w-1.5 h-1.5 rounded-full`
- **cn(...)**: `online`
- **cn(...)**: `bg-green-500`
- **cn(...)**: `checking`
- **cn(...)**: `bg-green-500/50 animate-pulse`
- **cn(...)**: `error`
- **cn(...)**: `offline`
- **cn(...)**: `bg-destructive`
- **cn(...)**: `px-2 h-7 rounded-lg text-xs transition-all duration-200 active:scale-95`
- **cn(...)**: `auto`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-border/80`
- **cn(...)**: `thinking`
- **cn(...)**: `instruct`
- **cn(...)**: `coding`
- **cn(...)**: `hidden @[36rem]/agentchat:inline-flex`
- **cn(...)**: `inline-flex items-center justify-center rounded-lg hover:bg-accent/70 text-foreground/80`
- **cn(...)**: `cursor-pointer`
- **cn(...)**: `text-red-500`
- **cn(...)**: `space-y-4 min-w-0`
- **cn(...)**: `flex w-full min-w-0 max-w-full flex-col`
- **cn(...)**: `user`
- **cn(...)**: `items-end`
- **cn(...)**: `items-start`
- **cn(...)**: `min-w-0`
- **cn(...)**: `shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40`
- **cn(...)**: `bg-red-500/15 text-red-600`
- **style={{}}**: `aspectRatio: '1 / 1'`

### `src/components/ApiKeysPanel.tsx`
- **className**: `space-y-4`
- **className**: `text-sm text-muted-foreground`
- **className**: `font-mono`
- **className**: `rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100`
- **className**: `font-medium`
- **className**: `mt-2 flex gap-2`
- **className**: `min-w-0 flex-1 rounded-lg border border-amber-300 bg-background px-3 py-2 font-mono text-xs`
- **className**: `shrink-0 rounded-lg border border-border px-3 py-2 text-sm`
- **className**: `space-y-3`
- **className**: `block space-y-1`
- **className**: `text-sm font-medium`
- **className**: `w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm`
- **className**: `px-4 py-2 rounded-lg btn-gradient text-sm disabled:opacity-50`
- **className**: `space-y-2`
- **className**: `rounded-lg border border-border px-3 py-2 text-sm`
- **className**: `flex items-start justify-between gap-3`
- **className**: `min-w-0`
- **className**: `font-mono text-xs text-muted-foreground`
- **className**: `mt-1 text-xs text-muted-foreground`
- **className**: `shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-red-600 disabled:opacity-50`

### `src/components/AssistantToolsMenu.tsx`
- **className**: `relative flex items-center gap-1`
- **className**: `hidden @[48rem]/agentchat:inline`
- **className**: `hidden @[36rem]/agentchat:inline`
- **className**: `min-w-[1.25rem] text-center font-medium tabular-nums`
- **className**: `w-3 h-3 opacity-70`
- **className**: `px-3 py-2 text-xs font-medium text-foreground`
- **className**: `px-3 pb-2 text-[11px] text-muted-foreground leading-snug`
- **className**: `rounded`
- **className**: `max-h-56 overflow-y-auto py-1`
- **className**: `px-3 py-2 text-xs text-muted-foreground`
- **className**: `rounded mt-0.5`
- **className**: `min-w-0`
- **className**: `block truncate`
- **className**: `block text-[11px] text-muted-foreground truncate`
- **cn(...)**: `inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs transition-all duration-150 active:scale-95 disabled:opacity-40`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `text-muted-foreground hover:bg-accent hover:text-foreground`
- **cn(...)**: `inline-flex items-center gap-1 h-8 px-2 rounded-lg border text-xs transition-all duration-150 active:scale-95 disabled:opacity-40`
- **cn(...)**: `border-border bg-accent text-foreground`
- **cn(...)**: `border-border/70 bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border`
- **cn(...)**: `cursor-pointer`
- **cn(...)**: `cursor-pointer items-start`

### `src/components/AuthFormCard.tsx`
- **className**: `relative h-44 sm:h-52 overflow-hidden`
- **className**: `h-full w-full object-cover object-[center_22%]`
- **className**: `absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent`
- **className**: `flex items-center gap-2 min-w-0 px-1`
- **className**: `h-7 w-7`
- **className**: `min-w-0 text-left`
- **className**: `block text-sm font-semibold text-foreground leading-tight truncate`
- **className**: `p-4 sm:p-5 space-y-4 min-w-0`
- **className**: `text-sm text-muted-foreground`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `block truncate`

### `src/components/AuthGuard.tsx`
- **className**: `flex items-center gap-2 min-w-0 px-1`
- **className**: `h-7 w-7`
- **className**: `min-w-0`
- **className**: `block text-sm font-semibold leading-tight`
- **className**: `p-4 sm:p-5 space-y-4`
- **className**: `flex justify-center gap-4`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `block`

### `src/components/BenchmarkingView.tsx`
- **className**: `text-xs text-muted-foreground mr-1`
- **className**: `h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40`
- **className**: `h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`
- **className**: `space-y-2 max-w-3xl`
- **className**: `text-sm font-medium text-primary hover:underline`
- **className**: `flex items-center justify-between gap-3`
- **className**: `grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`
- **className**: `glass-panel border border-border rounded-lg p-4`
- **className**: `text-sm text-muted-foreground mb-2`
- **className**: `text-2xl font-bold text-foreground`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `text-lg font-bold text-foreground truncate`
- **className**: `grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6`
- **className**: `glass-panel border border-border rounded-lg p-6 shadow-sm dark:shadow-none`
- **className**: `flex items-center justify-between mb-6`
- **className**: `text-lg font-bold text-foreground`
- **className**: `text-sm text-muted-foreground`
- **className**: `text-lg font-bold text-foreground mb-6`
- **className**: `glass-panel border border-border rounded-lg overflow-hidden shadow-sm dark:shadow-none`
- **className**: `px-6 py-4 border-b border-border`
- **className**: `overflow-x-auto`
- **className**: `w-full text-left text-sm`
- **className**: `bg-background dark:bg-muted/50 text-muted-foreground font-medium`
- **className**: `px-6 py-4`
- **className**: `divide-y divide-zinc-100 dark:divide-border`
- **className**: `hover:bg-background dark:hover:bg-muted/30 bg-accent/50 dark:bg-accent/40`
- **className**: `px-6 py-4 font-medium text-foreground`
- **className**: `flex items-center gap-2`
- **className**: `w-3 h-3 rounded-full bg-primary`
- **className**: `px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full`
- **className**: `flex-1 bg-border dark:bg-muted rounded-full h-2`
- **className**: `h-full bg-primary rounded-full`
- **className**: `text-purple-600 dark:text-purple-400 font-medium text-sm`
- **className**: `text-muted-foreground text-sm`
- **className**: `px-6 py-4 font-medium`
- **className**: `px-6 py-4 text-xs text-muted-foreground`
- **className**: `px-6 py-4 border-t border-border surface-muted`
- **className**: `flex items-center justify-between text-sm text-muted-foreground`
- **className**: `w-full min-w-0 space-y-6 sm:space-y-8 animate-in fade-in duration-500`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate text-xs sm:text-sm text-muted-foreground`
- **className**: `flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6 sm:space-y-8 animate-in fade-in duration-500`
- **cn(...)**: `flex flex-wrap items-center gap-1.5`
- **cn(...)**: `ml-auto`
- **cn(...)**: `h-8 px-2.5 rounded-lg text-xs transition-colors`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `text-muted-foreground hover:bg-accent`
- **cn(...)**: `flex items-center`

### `src/components/ChatList.tsx`
- **className**: `xl:hidden flex justify-center pt-2.5 pb-1 shrink-0`
- **className**: `h-1 w-11 rounded-full bg-muted-foreground/35`
- **className**: `flex items-center gap-2 min-w-0`
- **className**: `flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0`
- **className**: `w-3.5 h-3.5`
- **className**: `min-w-0`
- **className**: `text-sm font-semibold truncate leading-tight`
- **className**: `text-[11px] text-muted-foreground leading-tight`
- **className**: `flex items-center gap-0.5`
- **className**: `p-2 rounded-lg hover:bg-accent text-muted-foreground disabled:pointer-events-none disabled:opacity-50`
- **className**: `hidden`
- **className**: `p-2 rounded-lg hover:bg-accent text-muted-foreground`
- **className**: `w-4 h-4`
- **className**: `hidden xl:inline-flex p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95`
- **className**: `p-2 rounded-lg hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95`
- **className**: `px-2 pt-2 space-y-2`
- **className**: `flex gap-1 text-[11px]`
- **className**: `relative block`
- **className**: `pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground`
- **className**: `h-9 w-full rounded-lg border border-border bg-background/40 pl-8 pr-3 text-sm`
- **className**: `flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pt-2 pb-2 space-y-1`
- **className**: `text-xs text-muted-foreground text-center py-8`
- **className**: `flex flex-col items-center text-center py-10 px-4`
- **className**: `flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-muted-foreground mb-3`
- **className**: `w-5 h-5`
- **className**: `text-sm font-medium text-foreground`
- **className**: `text-xs text-muted-foreground mt-1 max-w-[16rem]`
- **className**: `p-2.5`
- **className**: `w-full h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 glass-input`
- **className**: `w-full text-left px-3.5 py-3 pr-28 min-h-14`
- **className**: `text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5`
- **className**: `h-3 w-3 fill-current`
- **className**: `text-[11px] text-muted-foreground mt-1 line-clamp-2`
- **className**: `mt-1 flex flex-wrap gap-1`
- **className**: `rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground`
- **className**: `xl:hidden shrink-0 border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`
- **className**: `w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-medium btn-gradient active:scale-[0.99]`
- **cn(...)**: `left-0`
- **cn(...)**: `max-md:!inset-x-0 max-md:!top-auto max-md:!bottom-0 max-md:!h-[min(72dvh,36rem)] max-md:!max-h-[72dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-lg max-md:rounded-b-none max-md:border-x-0 max-md:border-t max-md:pt-0 max-md:bg-card max-md:backdrop-blur-none`
- **cn(...)**: `md:top-0 md:max-xl:left-[calc(var(--spacing)*55)] md:h-full md:rounded-none`
- **cn(...)**: `md:max-xl:bg-card md:max-xl:backdrop-blur-none`
- **cn(...)**: `xl:bg-transparent xl:backdrop-blur-none`
- **cn(...)**: `translate-x-0 translate-y-0 border-border shadow-[0_-8px_32px_rgba(15,23,42,0.12)]`
- **cn(...)**: `md:shadow-xl xl:shadow-none xl:w-72 xl:max-w-none xl:border-r xl:border-border`
- **cn(...)**: `pointer-events-none opacity-0`
- **cn(...)**: `max-md:translate-y-full max-md:translate-x-0`
- **cn(...)**: `md:max-xl:-translate-x-full`
- **cn(...)**: `xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0 xl:translate-y-0`
- **cn(...)**: `border-transparent`
- **cn(...)**: `w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] md:max-xl:w-80 md:max-xl:max-w-[min(20rem,calc(100vw-var(--spacing)*55))]`
- **cn(...)**: `justify-between gap-2 max-md:h-11 max-md:border-b-0`
- **cn(...)**: `rounded-lg px-2 py-1`
- **cn(...)**: `bg-primary text-primary-foreground`
- **cn(...)**: `bg-accent text-muted-foreground`
- **cn(...)**: `workspace-list-item group relative rounded-lg transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.99]`
- **cn(...)**: `bg-primary/10 shadow-sm`
- **cn(...)**: `hover:bg-accent/80`
- **cn(...)**: `text-sm truncate`
- **cn(...)**: `font-semibold text-foreground`
- **cn(...)**: `font-medium`
- **cn(...)**: `absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center`
- **cn(...)**: `opacity-100`
- **cn(...)**: `opacity-100 xl:opacity-0 xl:group-hover:opacity-100`
- **cn(...)**: `w-3.5 h-3.5`
- **cn(...)**: `fill-current text-primary`
- **cn(...)**: `fixed inset-0 z-40 xl:hidden transition-opacity duration-300 ease-out motion-reduce:transition-none`
- **cn(...)**: `bg-black/20 dark:bg-black/35`
- **cn(...)**: `md:left-[calc(var(--spacing)*55)]`
- **cn(...)**: `opacity-0 pointer-events-none`
- **className`…`**: `w-4 h-4 …`

### `src/components/ChatWrapperManager.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `flex items-start justify-between gap-2 min-w-0`
- **className**: `min-w-0`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0`
- **className**: `flex justify-between items-start gap-2 mb-2 min-w-0`
- **className**: `text-sm font-medium truncate`
- **className**: `flex gap-1 flex-wrap justify-end`
- **className**: `text-xs text-muted-foreground line-clamp-2 break-words`
- **className**: `text-sm font-medium mb-1`
- **className**: `text-xs text-muted-foreground mb-3 break-words`
- **className**: `flex flex-wrap gap-1.5`
- **className**: `rounded-lg p-3`
- **className**: `text-xs overflow-auto max-h-60 mt-2 break-all scroll-clip`
- **cn(...)**: `text-left cursor-pointer transition-colors`
- **cn(...)**: `border-primary/30 bg-primary/5`
- **cn(...)**: `hover:bg-accent/40`

### `src/components/ContextUsageRing.tsx`
- **className**: `bg-primary/60`
- **className**: `bg-primary`
- **className**: `bg-emerald-500`
- **className**: `transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none`
- **className**: `p-0`
- **className**: `p-3.5 space-y-3 text-foreground`
- **className**: `flex items-center justify-between gap-2`
- **className**: `flex items-center gap-2`
- **className**: `text-sm font-medium`
- **className**: `text-xs text-muted-foreground leading-relaxed`
- **className**: `text-xs text-muted-foreground tabular-nums`
- **className**: `text-foreground font-medium`
- **className**: `flex h-2 w-full overflow-hidden rounded-full bg-muted`
- **className**: `space-y-1.5 text-xs`
- **className**: `flex items-center justify-between gap-3`
- **className**: `flex items-center gap-2 text-muted-foreground`
- **className**: `tabular-nums`
- **className**: `h-2 w-2 rounded-full bg-muted-foreground/30`
- **className**: `space-y-1.5 border-t border-border/60 pt-2.5 text-xs`
- **className**: `flex justify-between gap-3`
- **className**: `text-muted-foreground`
- **className**: `rounded-lg bg-destructive/10 px-2.5 py-2 text-xs text-destructive leading-relaxed`
- **className**: `text-[11px] text-muted-foreground leading-relaxed`
- **cn(...)**: `-rotate-90`
- **cn(...)**: `shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors`
- **cn(...)**: `text-sm font-semibold tabular-nums`
- **cn(...)**: `h-full`
- **cn(...)**: `h-2 w-2 rounded-full`

### `src/components/EmbeddingTools.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `flex flex-wrap items-center justify-between gap-2`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit`
- **className**: `grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0`
- **className**: `flex items-center justify-between gap-2`
- **className**: `text-xs text-muted-foreground`
- **className**: `grid grid-cols-2 gap-2`
- **className**: `text-xs text-muted-foreground line-clamp-4 break-words`
- **className**: `space-y-2`
- **className**: `text-2xl font-semibold`
- **className**: `h-1.5 w-full rounded-full bg-border overflow-hidden`
- **className**: `h-full bg-foreground/40`
- **cn(...)**: `space-y-2`
- **cn(...)**: `h-36`
- **cn(...)**: `max-h-24 text-[11px] text-muted-foreground`
- **cn(...)**: `space-y-3`

### `src/components/FinetuneView.tsx`
- **className**: `lg:hidden fixed top-4 right-4 z-50 p-3 surface-elevated text-foreground/80 rounded-lg shadow-lg border border-border hover:bg-background dark:hover:bg-muted transition-all active:scale-95`
- **className**: `w-5 h-5`
- **className**: `lg:hidden fixed inset-0 bg-black/50 z-40 transition-all duration-300`
- **className**: `relative w-full h-full bg-background/40 overflow-hidden`
- **className**: `flex h-full w-full p-2 md:p-3 lg:p-4 gap-3 md:gap-4`
- **className**: `flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6`
- **className**: `flex items-center justify-between mb-4 pb-4 border-b border-border`
- **className**: `text-xl font-bold text-foreground`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `p-2 text-muted-foreground hover:text-foreground/80 dark:text-muted-foreground dark:hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors active:scale-95`
- **className**: `animate-in fade-in duration-500`
- **className**: `text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2`
- **className**: `text-xs md:text-sm text-muted-foreground mb-3 md:mb-4`
- **className**: `animate-in fade-in duration-500 slide-in-from-bottom-2`
- **className**: `animate-in fade-in duration-500 slide-in-from-bottom-4`
- **className**: `animate-in fade-in duration-500 slide-in-from-bottom-6`
- **className**: `animate-in fade-in duration-500 slide-in-from-bottom-8`
- **className**: `animate-in fade-in duration-300`
- **className**: `bg-accent dark:bg-accent border border-primary/25 dark:border-primary/30 rounded-lg p-3 md:p-4`
- **className**: `flex items-center gap-3`
- **className**: `w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin`
- **className**: `text-xs md:text-sm text-primary`
- **className**: `border-t border-border glass-panel p-4 md:p-6 space-y-2 md:space-y-3`
- **className**: `w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin`
- **className**: `text-sm md:text-base`
- **className**: `w-3.5 h-3.5 md:w-4 md:h-4`
- **className**: `flex-1 flex flex-col gap-3 md:gap-4 h-full overflow-hidden`
- **className**: `flex-1 bg-card rounded-lg shadow-sm border border-border overflow-hidden relative`
- **className**: `h-40 md:h-48 lg:h-56 glass-panel border border-border rounded-lg shadow-sm p-3 md:p-4 shrink-0 overflow-hidden`
- **className**: `grid grid-cols-2 gap-3 md:gap-4 h-full`
- **className`…`**: `w-full py-2.5 md:py-3 rounded-lg font-medium text-sm md:text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] …`
- **style={{}}**: `zIndex: 60`
- **style={{}}**: `zIndex: 40`
- **style={{}}**: `maxHeight: isMobile ? 'calc(100vh - 24px)' : '100%',
            zIndex: 50`

### `src/components/FunctionDocumentationTool.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0`
- **className**: `flex flex-wrap items-center justify-between gap-2`
- **className**: `text-xs text-muted-foreground`
- **className**: `flex items-center gap-1.5`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `h-full w-full resize-none overflow-auto scroll-clip bg-transparent px-3.5 py-2.5 font-mono text-xs outline-none border-0 rounded-none`
- **className**: `text-xs text-muted-foreground mb-1.5`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit`
- **className**: `flex items-center gap-2 text-xs text-muted-foreground`
- **className**: `rounded border-border`
- **className**: `flex items-center justify-between gap-2`
- **className**: `text-sm text-muted-foreground py-10 text-center`
- **className**: `p-3`
- **className**: `grid grid-cols-2 gap-2 text-[11px] text-muted-foreground`
- **className**: `rounded-lg border border-border px-2.5 py-2`
- **className**: `font-medium text-foreground`
- **className**: `truncate`
- **className**: `rounded-lg border border-border px-2.5 py-2 min-w-0`
- **cn(...)**: `space-y-3`
- **cn(...)**: `h-72`
- **cn(...)**: `space-y-3 min-w-0`
- **cn(...)**: `max-h-none h-full whitespace-pre-wrap`

### `src/components/GlobalDialog.tsx`
- **className**: `whitespace-pre-wrap`
- **className**: `w-full rounded-lg border border-border bg-card px-3 py-2 text-sm`

### `src/components/GlobalToast.tsx`
- **className**: `fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none max-w-sm sm:max-w-md`
- **className`…`**: `px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top-2 duration-300 …`

### `src/components/GrammarBuilder.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `font-mono`
- **className**: `min-w-0`
- **className**: `text-sm font-medium`
- **className**: `text-xs text-muted-foreground mt-0.5`
- **className**: `grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0`
- **className**: `text-xs text-muted-foreground`
- **className**: `flex flex-wrap gap-1.5`
- **className**: `block text-xs text-muted-foreground`
- **className**: `flex items-center justify-between gap-2`
- **className**: `text-xs text-muted-foreground truncate`
- **className**: `flex gap-1.5 shrink-0`
- **className**: `text-sm text-muted-foreground py-8 text-center`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `text-[11px] text-muted-foreground break-all`
- **cn(...)**: `flex items-start justify-between gap-2`
- **cn(...)**: `space-y-3`
- **cn(...)**: `template`
- **cn(...)**: `bg-primary/10 border border-primary/20`
- **cn(...)**: `h-48 font-mono text-xs`
- **cn(...)**: `space-y-3 min-w-0`

### `src/components/HardwareMonitor.tsx`
- **border**: `1px solid var(--border)`
- **className**: `w-full min-w-0`
- **className**: `min-w-0`
- **className**: `pt-6`
- **className**: `mb-4`
- **className**: `mr-2 h-4 w-4`
- **className**: `w-full min-w-0 space-y-4`
- **className**: `flex items-center justify-between gap-3`
- **className**: `text-sm font-semibold`
- **className**: `h-4 w-4 animate-spin text-muted-foreground shrink-0`
- **className**: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4`
- **className**: `pb-2`
- **className**: `h-4 w-24 rounded bg-border dark:bg-muted animate-pulse`
- **className**: `h-8 w-16 rounded bg-border dark:bg-muted animate-pulse mb-2`
- **className**: `h-2 w-full rounded bg-border dark:bg-muted animate-pulse`
- **className**: `w-full min-w-0 space-y-4 sm:space-y-6`
- **className**: `text-sm font-semibold tracking-tight`
- **className**: `flex flex-wrap items-center gap-1.5 ml-auto`
- **className**: `text-xs text-muted-foreground mr-1`
- **className**: `h-8 w-8`
- **className**: `flex items-center justify-between`
- **className**: `flex items-center text-sm font-medium`
- **className**: `text-xs`
- **className**: `space-y-2`
- **className**: `h-2`
- **className**: `text-xs text-muted-foreground`
- **className**: `text-xs text-muted-foreground flex justify-between`
- **className**: `text-2xl font-bold`
- **className**: `text-sm space-y-1`
- **className**: `flex justify-between`
- **className**: `text-muted-foreground`
- **className**: `grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit max-w-full overflow-x-auto`
- **className**: `space-y-4 mt-0`
- **className**: `text-center py-8 text-muted-foreground`
- **className**: `h-12 w-12 mx-auto mb-4 opacity-50`
- **className**: `text-sm mt-2`
- **className**: `space-y-3`
- **className**: `flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg`
- **className**: `flex-1 min-w-0`
- **className**: `flex flex-wrap items-center gap-2 mb-1`
- **className**: `w-2 h-2 rounded-full bg-green-500 shrink-0`
- **className**: `font-medium truncate max-w-full`
- **className**: `shrink-0`
- **className**: `text-xs sm:text-sm text-muted-foreground`
- **className**: `text-left sm:text-right shrink-0`
- **className**: `text-xs sm:text-sm font-medium`
- **className**: `flex items-center gap-2`
- **className**: `h-5 w-5`
- **cn(...)**: `flex items-center justify-between gap-3`
- **cn(...)**: `flex-col xl:flex-row xl:items-start`
- **cn(...)**: `h-8 px-2.5 rounded-lg text-xs transition-colors`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `text-muted-foreground hover:bg-accent`
- **cn(...)**: `h-4 w-4`
- **cn(...)**: `animate-spin`
- **cn(...)**: `px-2.5 h-7 rounded-lg text-xs transition-colors shrink-0`
- **cn(...)**: `cpu`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-border/80`
- **cn(...)**: `memory`
- **className`…`**: `text-2xl font-bold …`

### `src/components/InferenceLab.tsx`
- **className**: `flex h-full flex-col glass-panel text-foreground overflow-hidden`
- **className**: `text-sm font-semibold`
- **className**: `flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground`
- **className**: `flex-1 flex items-center justify-center p-6`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate font-mono text-xs text-muted-foreground`
- **className**: `hidden md:inline text-xs text-muted-foreground truncate max-w-[10rem]`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit`
- **className**: `flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `flex items-center bg-accent rounded-lg p-0.5`
- **className**: `flex items-center gap-1.5 text-xs text-muted-foreground`
- **className**: `w-[11.5rem]`
- **className**: `block`
- **className**: `text-xs text-muted-foreground`
- **className**: `rounded-lg border border-border/60 p-3 space-y-2`
- **className**: `flex items-center justify-between`
- **className**: `text-sm font-medium`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `flex justify-end gap-2`
- **className**: `h-8 px-3 rounded-lg text-xs btn-gradient disabled:opacity-40`
- **className**: `text-[11px] text-muted-foreground ml-auto`
- **className**: `whitespace-pre-wrap break-words text-sm min-h-[8rem] font-mono`
- **className**: `text-xs text-destructive`
- **className**: `text-[11px] font-mono text-muted-foreground`
- **className**: `flex-1 min-h-0 overflow-y-auto p-3 sm:p-4`
- **className**: `text-sm font-medium text-muted-foreground`
- **className**: `h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent`
- **className**: `text-sm text-muted-foreground`
- **className**: `space-y-2`
- **className**: `p-3 rounded-lg border border-border flex justify-between items-center`
- **className**: `min-w-0`
- **className**: `font-medium text-sm truncate`
- **className**: `text-xs text-muted-foreground truncate`
- **className**: `ml-2 h-8 px-2.5 rounded-lg text-xs hover:bg-accent`
- **cn(...)**: `flex items-center`
- **cn(...)**: `px-2.5 h-7 rounded-lg text-xs transition-colors`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-border/80`
- **cn(...)**: `px-2.5 h-7 rounded-lg text-xs`
- **cn(...)**: `bg-background shadow-sm`
- **cn(...)**: `text-muted-foreground`
- **cn(...)**: `w-44`
- **cn(...)**: `mt-1 text-xs font-mono min-h-[4.5rem]`
- **cn(...)**: `mt-1 min-h-[3rem]`
- **cn(...)**: `min-h-[8rem]`

### `src/components/LiveRuntimePanel.tsx`
- **className**: `hidden xl:flex w-80 shrink-0 border-l border-border p-3 text-xs text-muted-foreground`
- **className**: `flex justify-between gap-2 py-0.5 text-xs`
- **className**: `text-muted-foreground shrink-0`
- **className**: `font-mono text-right min-w-0 break-all`
- **className**: `xl:hidden flex justify-center pt-2.5 pb-1 shrink-0`
- **className**: `h-1 w-11 rounded-full bg-muted-foreground/35`
- **className**: `min-w-0`
- **className**: `text-sm font-semibold truncate leading-tight`
- **className**: `text-[11px] text-muted-foreground leading-tight`
- **className**: `flex items-center gap-0.5`
- **className**: `p-2 rounded-lg hover:bg-accent text-muted-foreground text-xs`
- **className**: `p-2 rounded-lg hover:bg-accent text-muted-foreground`
- **className**: `w-4 h-4`
- **className**: `flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3`
- **className**: `text-xs text-destructive`
- **className**: `rounded-lg border border-border p-3 space-y-2`
- **className**: `flex items-center justify-between gap-2`
- **className**: `flex items-center gap-1.5 text-xs font-semibold`
- **className**: `w-3.5 h-3.5`
- **className**: `text-sm font-medium truncate`
- **className**: `grid grid-cols-2 gap-2`
- **className**: `rounded-lg bg-accent/50 px-2 py-1.5`
- **className**: `text-[10px] text-muted-foreground`
- **className**: `text-sm font-semibold font-mono`
- **className**: `text-[10px] font-mono text-muted-foreground`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `rounded-lg border border-border p-3 space-y-1.5`
- **className**: `h-1`
- **className**: `text-xs text-muted-foreground`
- **className**: `flex items-center gap-1.5 text-xs font-semibold min-w-0`
- **className**: `w-3.5 h-3.5 shrink-0`
- **className**: `truncate`
- **className**: `grid grid-cols-3 gap-1.5 text-center`
- **className**: `rounded-lg bg-accent/50 px-1 py-1`
- **className**: `w-3 h-3 mx-auto mb-0.5`
- **className**: `text-[11px] font-mono`
- **className**: `text-[10px]`
- **className**: `cursor-pointer`
- **className**: `mt-1 space-y-0.5`
- **className**: `text-[11px]`
- **cn(...)**: `right-0`
- **cn(...)**: `max-md:!inset-x-0 max-md:!top-auto max-md:!bottom-0 max-md:!h-[min(78dvh,40rem)] max-md:!max-h-[78dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-lg max-md:rounded-b-none max-md:border-x-0 max-md:border-t max-md:pt-0 max-md:bg-card max-md:backdrop-blur-none`
- **cn(...)**: `md:top-0 md:h-full md:rounded-none`
- **cn(...)**: `md:max-xl:bg-card md:max-xl:backdrop-blur-none`
- **cn(...)**: `xl:bg-transparent xl:backdrop-blur-none`
- **cn(...)**: `translate-x-0 translate-y-0 border-border shadow-[0_-8px_32px_rgba(15,23,42,0.12)]`
- **cn(...)**: `md:shadow-xl xl:shadow-none xl:w-80 xl:max-w-none xl:border-l xl:border-border`
- **cn(...)**: `pointer-events-none opacity-0`
- **cn(...)**: `max-md:translate-y-full max-md:translate-x-0`
- **cn(...)**: `md:max-xl:translate-x-full`
- **cn(...)**: `xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0 xl:translate-y-0`
- **cn(...)**: `border-transparent`
- **cn(...)**: `w-[min(22rem,calc(100vw-2.5rem))] max-w-[90vw] md:max-xl:w-80`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `fixed inset-0 z-40 xl:hidden transition-opacity duration-300 ease-out`
- **cn(...)**: `bg-black/20 dark:bg-black/35`
- **cn(...)**: `opacity-100`
- **cn(...)**: `opacity-0 pointer-events-none`

### `src/components/MainApp.tsx`
- **className**: `w-4 h-4 animate-spin`
- **className**: `w-4 h-4`
- **className**: `flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground`
- **cn(...)**: `min-w-0`
- **cn(...)**: `h-full flex flex-col overflow-hidden`
- **cn(...)**: `flex-1 min-h-0 overflow-hidden`

### `src/components/MaintenanceScreen.tsx`
- **className**: `flex items-center gap-2 min-w-0 px-1`
- **className**: `h-7 w-7`
- **className**: `min-w-0`
- **className**: `block text-sm font-semibold leading-tight`
- **className**: `p-4 sm:p-5 text-center space-y-3`
- **className**: `text-sm text-foreground`
- **className**: `text-xs text-destructive`
- **className**: `flex flex-wrap justify-center items-center gap-4 pt-1`
- **className**: `text-[11px] text-muted-foreground`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `block`

### `src/components/MarkdownContent.tsx`
- **className**: `relative group my-4`
- **className**: `rounded-lg text-sm overflow-x-auto`
- **className**: `overflow-x-auto my-4`
- **className**: `text-primary hover:underline hover:text-primary dark:hover:text-primary transition-colors`
- **className**: `inline-block w-3 h-3 ml-0.5`
- **className**: `overflow-x-auto my-4 shadow-sm rounded-lg border border-border`
- **className**: `min-w-full border-collapse`
- **className**: `bg-background dark:bg-muted/50`
- **className**: `border border-border px-4 py-2.5 text-left font-semibold text-foreground`
- **className**: `border border-border px-4 py-2.5 text-foreground/80`
- **className**: `border-l-4 border-primary bg-accent/50 dark:bg-accent pl-4 py-2 my-3 rounded-r-lg`
- **className**: `text-foreground/80 italic`
- **className**: `my-1 leading-relaxed`
- **className**: `my-4 border-t border-border`
- **className**: `my-3`
- **className**: `max-w-full h-auto rounded-lg shadow-md mx-auto`
- **className**: `text-center text-xs text-muted-foreground mt-1.5`
- **className**: `font-bold text-primary dark:text-primary`
- **className**: `italic text-muted-foreground`
- **className**: `line-through text-muted-foreground`
- **className**: `underline text-green-600 dark:text-green-400`
- **className**: `inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse align-middle`
- **className`…`**: `break-words leading-relaxed …`
- **className`…`**: `… px-1.5 py-0.5 rounded-md text-sm font-mono`

### `src/components/ModelCard.tsx`
- **color**: `bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800`
- **badgeColor**: `bg-green-500`
- **color**: `bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800`
- **badgeColor**: `bg-emerald-500`
- **color**: `bg-accent dark:bg-accent text-primary dark:text-primary border-primary/25 dark:border-primary/30`
- **badgeColor**: `bg-primary`
- **color**: `bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800`
- **badgeColor**: `bg-red-500`
- **color**: `bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300`
- **color**: `bg-accent dark:bg-accent text-foreground dark:text-muted-foreground`
- **color**: `bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300`
- **color**: `bg-accent dark:bg-accent text-primary dark:text-primary`
- **className**: `flex items-center gap-1.5 text-purple-600 dark:text-purple-400`
- **className**: `w-4 h-4`
- **className**: `text-xs font-bold`
- **className**: `flex items-center gap-1.5 text-teal-600 dark:text-teal-400`
- **className**: `flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400`
- **className**: `flex items-center gap-1.5 text-primary`
- **className**: `flex items-center gap-1.5 text-orange-600 dark:text-orange-400`
- **className**: `flex items-start justify-between gap-2 mb-3 min-w-0`
- **className**: `flex flex-wrap gap-1.5 min-w-0`
- **className**: `max-w-full`
- **className**: `flex-1 min-w-0`
- **className**: `flex flex-wrap items-center gap-1.5 mb-2`
- **className**: `text-[11px] font-mono bg-accent text-muted-foreground px-2 py-0.5 rounded-lg`
- **className**: `text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg`
- **className**: `text-[11px] bg-accent text-muted-foreground px-2 py-0.5 rounded-lg`
- **className**: `text-base sm:text-lg font-semibold text-foreground mb-1 break-words`
- **className**: `flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2 text-[11px] text-muted-foreground`
- **className**: `min-w-0 truncate max-w-full`
- **className**: `text-sm text-muted-foreground mb-3 line-clamp-3 break-words`
- **className**: `text-xs text-muted-foreground mb-3 break-words`
- **className**: `mb-3 space-y-2`
- **className**: `p-2.5 rounded-lg bg-accent/60 text-xs text-muted-foreground break-words`
- **className**: `p-2.5 rounded-lg bg-destructive/10 text-xs text-destructive break-words`
- **className**: `flex flex-wrap gap-1.5 mb-3`
- **className**: `text-[11px] bg-accent text-muted-foreground px-2 py-0.5 rounded-lg max-w-full truncate`
- **className**: `pt-3 mt-auto border-t border-border/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0`
- **className**: `flex flex-wrap items-center gap-1.5 min-w-0 text-xs text-muted-foreground`
- **className**: `font-medium`
- **className**: `font-mono bg-accent px-1.5 py-0.5 rounded-md truncate max-w-[9rem]`
- **className**: `flex items-center gap-1.5 shrink-0`
- **className**: `inline-flex items-center h-8 px-2.5 rounded-lg text-xs font-medium border border-border hover:bg-accent disabled:opacity-50`
- **className**: `text-xs text-muted-foreground`
- **cn(...)**: `group relative bg-background border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-colors duration-200 cursor-pointer flex flex-col min-w-0 overflow-hidden`
- **cn(...)**: `border-green-200 dark:border-green-800`
- **cn(...)**: `border-border hover:border-border`
- **cn(...)**: `inline-flex items-center px-2 h-6 rounded-lg text-[11px]`
- **cn(...)**: `p-1.5 rounded-lg shrink-0 transition-colors`
- **cn(...)**: `text-amber-500 bg-amber-400/10`
- **cn(...)**: `text-muted-foreground hover:bg-accent hover:text-foreground`
- **cn(...)**: `inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium shrink-0 w-full min-w-0 sm:w-auto`
- **cn(...)**: `bg-accent text-muted-foreground cursor-not-allowed`
- **cn(...)**: `bg-emerald-600 hover:bg-emerald-500 text-white`

### `src/components/ModelCatalog.tsx`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate text-xs sm:text-sm text-muted-foreground`
- **className**: `flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4`
- **className**: `flex flex-col items-center justify-center py-20 px-4`
- **className**: `w-10 h-10 border-2 border-border border-t-foreground rounded-full animate-spin mb-4`
- **className**: `text-sm text-muted-foreground`
- **className**: `flex flex-col items-center justify-center py-16 text-center px-4`
- **className**: `text-sm font-semibold text-foreground mb-1`
- **className**: `text-sm text-muted-foreground mb-4 max-w-md break-words`
- **className**: `h-8 px-3 rounded-lg text-xs font-medium bg-accent hover:bg-border`
- **className**: `text-sm text-muted-foreground mb-4 max-w-md`
- **className**: `space-y-4 min-w-0`
- **className**: `flex flex-col gap-2 min-w-0`
- **className**: `text-sm text-muted-foreground break-words`
- **className**: `flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground`
- **className**: `sm:ml-auto`
- **className**: `p-3 rounded-lg bg-destructive/10 text-sm text-destructive break-words`
- **className**: `flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg px-4 min-w-0`
- **className**: `text-sm text-muted-foreground max-w-md mb-4 break-words`
- **className**: `grid gap-3 sm:gap-4 min-w-0 [&>*]:min-w-0`
- **className**: `text-center py-10 text-sm text-muted-foreground`
- **cn(...)**: `flex items-center`
- **cn(...)**: `inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium shrink-0`
- **cn(...)**: `bg-accent hover:bg-border text-foreground disabled:opacity-60`
- **style={{}}**: `gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))'`

### `src/components/ModelInsightsPanel.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `flex justify-between items-center gap-2`
- **className**: `mb-4`
- **className**: `space-y-4`
- **className**: `space-y-2`
- **className**: `grid grid-cols-2 md:grid-cols-3 gap-3`
- **className**: `grid grid-cols-2 md:grid-cols-4 gap-2`
- **className**: `flex flex-wrap gap-2`
- **className**: `p-3`
- **className**: `font-medium mb-2`
- **className**: `space-y-1`
- **className**: `grid grid-cols-1 md:grid-cols-2 gap-6`
- **className**: `font-medium text-foreground/80`
- **className**: `block text-sm text-muted-foreground mb-1`
- **className**: `w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground`
- **className**: `flex justify-between text-xs text-muted-foreground mt-1`
- **className**: `flex items-center space-x-2`
- **className**: `rounded border-border`
- **className**: `text-sm text-muted-foreground`
- **className**: `p-4`
- **className**: `flex justify-end mb-2`
- **className**: `grid grid-cols-2 gap-3 mb-3`
- **className**: `p-2`
- **className**: `mt-3`
- **cn(...)**: `space-y-3`

### `src/components/ModelLaunchDialog.tsx`
- **const selectClass**: `mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm`
- **const sectionClass**: `sm:col-span-2 rounded-lg border border-border p-3 space-y-2`
- **className**: `max-w-3xl max-h-[min(90vh,52rem)] overflow-y-auto`
- **className**: `rounded-lg border border-border p-3 space-y-2`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `text-xs font-medium mr-auto`
- **className**: `text-xs text-muted-foreground`
- **className**: `space-y-1 text-xs`
- **className**: `text-muted-foreground`
- **className**: `text-amber-600 dark:text-amber-400`
- **className**: `text-destructive`
- **className**: `grid gap-3 sm:grid-cols-2`
- **className**: `sm:col-span-2 text-xs text-muted-foreground`
- **className**: `flex items-center justify-between gap-2`
- **className**: `text-xs font-medium`
- **className**: `text-xs text-muted-foreground space-y-0.5`
- **className**: `flex items-center gap-2 text-sm`
- **className**: `flex w-full items-center justify-between text-xs font-medium`
- **className**: `flex items-center gap-2 text-sm sm:col-span-2`
- **className**: `mt-1 w-full min-h-[4.5rem] rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono`
- **className**: `grid gap-3 sm:grid-cols-3`
- **className**: `grid gap-2 sm:grid-cols-[1fr_2fr_2fr_5rem_5rem_auto] items-end`
- **className**: `flex flex-wrap gap-2`
- **className**: `grid gap-2 sm:grid-cols-[2fr_1fr_auto] items-end`
- **className**: `block text-xs text-muted-foreground`
- **className**: `text-xs text-destructive`
- **className**: `sm:col-span-2 flex flex-wrap gap-2 items-end`
- **className**: `text-xs text-muted-foreground flex-1`
- **className**: `max-h-64 overflow-auto rounded-lg bg-muted/50 p-2 text-[11px] leading-snug whitespace-pre-wrap break-all`
- **className**: `max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] whitespace-pre-wrap`
- **className**: `text-sm text-emerald-600 dark:text-emerald-400`
- **className**: `text-sm text-destructive`
- **className**: `h-1.5 w-full overflow-hidden rounded-full bg-muted`
- **className**: `h-full bg-primary transition-all`

### `src/components/PalettePicker.tsx`
- **className**: `text-sm font-medium text-foreground`
- **className**: `text-xs text-muted-foreground`
- **className**: `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2`
- **className**: `h-6 w-full rounded-md`
- **className**: `text-xs font-medium text-foreground`
- **cn(...)**: `flex flex-wrap gap-1.5`
- **cn(...)**: `h-5 w-5 rounded-full border transition-transform`
- **cn(...)**: `scale-110 border-foreground ring-2 ring-foreground/25`
- **cn(...)**: `border-border hover:scale-105`
- **cn(...)**: `space-y-2`
- **cn(...)**: `flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-colors`
- **cn(...)**: `border-primary bg-accent`
- **cn(...)**: `border-border hover:bg-muted`
- **style={{}}**: `backgroundColor: PALETTE_SWATCH[id]`

### `src/components/RAGChat.tsx`
- **className**: `w-4 h-4`
- **className**: `w-3.5 h-3.5`
- **className**: `mt-4 p-4 bg-background dark:bg-muted/50 rounded-lg overflow-x-auto`
- **className**: `text-sm font-medium mb-2`
- **className**: `flex items-end gap-2 h-40 min-w-[200px]`
- **className**: `flex-1 flex flex-col items-center min-w-[30px]`
- **className**: `w-full bg-primary rounded-t-lg transition-all duration-500`
- **className**: `text-[10px] text-muted-foreground mt-1 truncate max-w-full`
- **className**: `text-[9px] font-mono text-muted-foreground`
- **className**: `flex justify-between mt-2 text-[10px] text-muted-foreground`
- **className**: `mt-4 p-4 bg-background dark:bg-muted/50 rounded-lg`
- **className**: `space-y-2`
- **className**: `flex justify-between text-xs flex-wrap gap-1`
- **className**: `truncate`
- **className**: `h-2 bg-border dark:bg-muted rounded-full overflow-hidden mt-1`
- **className**: `h-full bg-primary rounded-full`
- **className**: `mt-3 pt-2 border-t border-border`
- **className**: `text-xs font-semibold mb-2`
- **className**: `flex flex-wrap gap-2`
- **className**: `text-xs px-2 py-1 rounded-full bg-accent dark:bg-accent text-foreground dark:text-muted-foreground hover:underline`
- **className**: `text-xs`
- **className**: `text-primary hover:underline`
- **className**: `mt-1 max-h-24 overflow-auto whitespace-pre-wrap bg-accent p-2 rounded`
- **className**: `mt-2 mb-3`
- **className**: `text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors`
- **className**: `mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-500`
- **className**: `text-xs font-medium text-purple-700 dark:text-purple-400 mb-2`
- **className**: `text-xs text-muted-foreground whitespace-pre-wrap`
- **className**: `whitespace-pre-wrap break-words leading-relaxed`
- **className**: `text-muted-foreground italic`
- **className**: `inline-block ml-1 animate-pulse`
- **className**: `mb-2 text-[10px] text-muted-foreground flex items-center gap-1`
- **className**: `inline-block ml-1 animate-pulse text-primary`
- **className**: `relative group my-3 rounded-lg overflow-hidden`
- **className**: `text-xs text-muted-foreground px-3 pt-1.5 pb-0 bg-muted/50 dark:bg-card/50`
- **className**: `!m-0 !rounded-none text-sm overflow-x-auto`
- **className**: `overflow-x-auto max-w-full`
- **className**: `text-primary hover:underline hover:text-primary dark:hover:text-primary transition-colors break-words`
- **className**: `inline-block w-3 h-3 ml-0.5`
- **className**: `overflow-x-auto my-4 shadow-sm rounded-lg border border-border`
- **className**: `min-w-full border-collapse`
- **className**: `bg-background dark:bg-muted/50`
- **className**: `border border-border px-3 py-2 text-left font-semibold text-foreground`
- **className**: `border border-border px-3 py-2 text-foreground/80`
- **className**: `border-l-4 border-primary bg-accent/50 dark:bg-accent pl-4 py-2 my-3 rounded-r-lg`
- **className**: `text-foreground/80 italic`
- **className**: `list-disc pl-5 my-3 space-y-1.5`
- **className**: `list-decimal pl-5 my-3 space-y-1.5`
- **className**: `my-1 leading-relaxed`
- **className**: `text-2xl font-bold my-4 pb-2 border-b-2 border-border break-words`
- **className**: `text-xl font-bold my-3 pb-1.5 border-b border-border break-words`
- **className**: `text-lg font-bold my-2.5 text-primary dark:text-primary break-words`
- **className**: `text-base font-bold my-2 break-words`
- **className**: `my-2.5 leading-relaxed break-words`
- **className**: `my-4 border-t border-border`
- **className**: `font-bold text-primary dark:text-primary break-words`
- **className**: `italic text-muted-foreground break-words`
- **className**: `break-words`
- **className**: `max-w-full h-auto rounded-lg my-2`
- **className**: `flex h-full w-full overflow-hidden glass-panel text-foreground`
- **className**: `@container/ragchat flex flex-col flex-1 min-w-0 h-full overflow-hidden`
- **className**: `fixed top-20 right-4 left-4 sm:left-auto z-50 animate-in slide-in-from-top-2 duration-300 max-w-sm`
- **className**: `flex h-full w-full items-center justify-between gap-1.5`
- **className**: `flex min-w-0 flex-1 items-center gap-1 overflow-hidden`
- **className**: `min-w-0 truncate text-sm font-semibold text-foreground`
- **className**: `hidden @[30rem]/ragchat:block h-4 w-px bg-border shrink-0`
- **className**: `hidden @[24rem]/ragchat:inline-flex shrink-0`
- **className**: `hidden @[48rem]/ragchat:flex min-w-0 items-center gap-2 text-xs text-muted-foreground truncate`
- **className**: `shrink-0`
- **className**: `shrink-0 truncate max-w-[14rem]`
- **className**: `flex h-full shrink-0 items-center gap-0.5 sm:gap-1`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 shrink-0`
- **className**: `hidden @[40rem]/ragchat:inline`
- **className**: `absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-muted text-[9px] leading-none flex items-center justify-center text-foreground`
- **className**: `fixed inset-0 modal-scrim flex items-center justify-center z-50 p-4`
- **className**: `max-w-md w-full rounded-lg`
- **className**: `glass-modal rounded-lg`
- **className**: `flex justify-between items-center p-4 border-b border-border`
- **className**: `text-base sm:text-lg font-semibold flex items-center gap-2`
- **className**: `p-1 hover:bg-accent/70 rounded-lg transition-colors`
- **className**: `p-4 space-y-4`
- **className**: `flex items-center justify-between cursor-pointer`
- **className**: `text-sm font-medium`
- **className**: `w-4 h-4 rounded border-border`
- **className**: `text-xs text-muted-foreground`
- **className**: `block text-sm font-medium mb-1`
- **className**: `pt-2 flex gap-2`
- **className**: `flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors`
- **className**: `flex-1 py-2 bg-border dark:bg-muted hover:bg-accent dark:hover:bg-accent rounded-lg font-medium transition-colors`
- **className**: `text-base font-semibold`
- **className**: `p-1 hover:bg-accent/70 rounded-lg`
- **className**: `w-full`
- **className**: `text-xs text-primary hover:underline`
- **className**: `flex-1 overflow-y-auto px-3 sm:px-4 py-3`
- **className**: `flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground px-4`
- **className**: `w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3`
- **className**: `text-base font-medium text-foreground text-center`
- **className**: `text-sm mt-2 text-muted-foreground text-center max-w-md`
- **className**: `mt-4 flex gap-2`
- **className**: `text-xs mt-3 text-purple-500 text-center max-w-md`
- **className**: `mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm`
- **className**: `mb-1 flex flex-wrap gap-1`
- **className**: `text-[10px] px-1.5 py-0.5 rounded bg-accent text-primary`
- **className**: `text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15`
- **className**: `mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`
- **className**: `w-2.5 h-2.5`
- **className**: `text-xs bg-accent dark:bg-muted px-2 py-1 rounded`
- **className**: `text-xs list-disc pl-4 space-y-1`
- **className**: `mt-3`
- **className**: `text-xs text-muted-foreground cursor-pointer hover:text-foreground/80 dark:hover:text-foreground`
- **className**: `mt-2 text-[10px] font-mono bg-accent p-2 rounded overflow-x-auto`
- **className**: `text-[10px] text-muted-foreground mt-1`
- **className**: `text-[9px] text-muted-foreground mt-1`
- **className**: `flex justify-start py-1`
- **className**: `flex space-x-1.5`
- **className**: `w-1.5 h-1.5 bg-primary rounded-full animate-bounce`
- **className**: `w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75`
- **className**: `w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150`
- **className**: `flex justify-center`
- **className**: `mb-2 flex flex-wrap items-center gap-2`
- **className**: `flex items-center gap-1.5 text-[11px] text-muted-foreground`
- **className**: `text-[11px] text-emerald-600 dark:text-emerald-400`
- **className**: `mb-2 flex flex-wrap gap-1.5`
- **className**: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent dark:bg-accent text-foreground dark:text-muted-foreground`
- **className**: `hover:text-indigo-900`
- **className**: `text-[11px] text-muted-foreground hover:underline`
- **className**: `text-[10px] sm:text-xs text-center mt-2 text-muted-foreground flex items-center justify-center gap-2 flex-wrap`
- **className**: `text-indigo-500`
- **className**: `text-emerald-500`
- **className**: `text-purple-500`
- **className**: `max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0`
- **className**: `px-6 pt-6 pb-4 pr-12 border-b border-border/60 text-left`
- **className**: `flex items-center gap-2 text-base sm:text-lg`
- **className**: `p-6 space-y-5`
- **className**: `flex items-center gap-3 text-sm cursor-pointer`
- **className**: `h-4 w-4 rounded-md border-border accent-foreground`
- **className**: `hidden`
- **className**: `cursor-pointer block`
- **className**: `inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-foreground`
- **className**: `text-sm mt-3 break-words font-medium`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `rounded-lg border border-border/70 p-3 text-xs bg-muted/40`
- **className**: `font-medium mb-1`
- **className**: `text-muted-foreground`
- **className**: `mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-muted-foreground`
- **className**: `text-muted-foreground mt-1`
- **className**: `grid grid-cols-1 sm:grid-cols-2 gap-2`
- **className**: `block text-sm font-medium`
- **className**: `block text-xs text-muted-foreground mt-0.5`
- **className**: `rounded-lg`
- **className**: `text-xs text-muted-foreground mt-1.5`
- **className**: `text-xs text-destructive mt-1.5`
- **className**: `space-y-1.5`
- **className**: `flex justify-between gap-3 text-sm`
- **className**: `text-muted-foreground truncate`
- **className**: `shrink-0 tabular-nums`
- **className**: `w-full bg-border/80 rounded-full h-2 overflow-hidden`
- **className**: `bg-foreground/70 h-full transition-all duration-300`
- **className**: `rounded-lg border border-border/70 overflow-hidden`
- **className**: `w-full px-4 py-3 flex justify-between items-center hover:bg-accent/50 transition-colors`
- **className**: `font-medium flex items-center gap-2 text-sm`
- **className**: `text-xs text-muted-foreground font-normal`
- **className**: `border-t border-border/60 p-3 space-y-2 max-h-64 overflow-y-auto`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `text-center py-4 text-muted-foreground text-sm`
- **className**: `text-sm text-muted-foreground text-center py-4`
- **className**: `rounded-lg bg-muted/40`
- **className**: `flex justify-between items-center p-2 gap-2 flex-wrap`
- **className**: `h-4 w-4 shrink-0 rounded-md border-border accent-foreground`
- **className**: `flex-1 flex items-center gap-2 text-left min-w-0`
- **className**: `min-w-0`
- **className**: `font-mono text-xs sm:text-sm font-medium break-words`
- **className**: `ml-2 text-xs text-muted-foreground`
- **className**: `flex gap-1 shrink-0`
- **className**: `p-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground transition-colors`
- **className**: `border-t border-border/50 px-3 py-2`
- **className**: `text-xs font-semibold text-muted-foreground mb-1`
- **className**: `flex flex-wrap gap-1`
- **className**: `text-xs px-1.5 py-0.5 bg-accent rounded-lg break-words`
- **cn(...)**: `opacity-100`
- **cn(...)**: `opacity-0 pointer-events-none`
- **cn(...)**: `flex items-center`
- **cn(...)**: `shrink-0`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `px-1.5 @[34rem]/ragchat:px-2 h-8 sm:h-7 rounded-lg text-xs transition-all duration-200 flex items-center gap-1 active:scale-95`
- **cn(...)**: `llm`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-border/80`
- **cn(...)**: `direct`
- **cn(...)**: `relative`
- **cn(...)**: `hidden @[28rem]/ragchat:inline-flex`
- **cn(...)**: `hidden @[42rem]/ragchat:inline-flex`
- **cn(...)**: `inline-flex items-center justify-center rounded-lg hover:bg-accent/70 text-foreground/80`
- **cn(...)**: `@[42rem]/ragchat:hidden`
- **cn(...)**: `text-red-500`
- **cn(...)**: `space-y-4`
- **cn(...)**: `flex w-full`
- **cn(...)**: `user`
- **cn(...)**: `justify-end`
- **cn(...)**: `justify-start`
- **cn(...)**: `placeholder:text-muted-foreground`
- **cn(...)**: `rounded-lg border-2 border-dashed p-5 sm:p-6 text-center transition-colors cursor-pointer glass-input`
- **cn(...)**: `border-foreground/40 bg-accent/50`
- **cn(...)**: `border-border`
- **cn(...)**: `flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors`
- **cn(...)**: `vector`
- **cn(...)**: `border-foreground/25 bg-accent shadow-sm`
- **cn(...)**: `border-border hover:bg-accent/50`
- **cn(...)**: `sql`
- **className`…`**: `w-3 h-3 transition-transform …`
- **className`…`**: `… bg-accent px-1.5 py-0.5 rounded-md text-sm font-mono text-red-600 dark:text-red-400 break-words`
- **className`…`**: `px-4 py-3 rounded-lg shadow-lg …`
- **className`…`**: `text-xs px-2 py-1 rounded-full …`
- **className`…`**: `text-[10px] px-1.5 py-0.5 rounded …`
- **className`…`**: `w-4 h-4 text-muted-foreground transition-transform …`
- **className`…`**: `w-4 h-4 transition-transform shrink-0 …`

### `src/components/RAGDataUpload.tsx`
- **className**: `space-y-4`
- **className**: `text-md font-semibold mb-3 flex items-center gap-2`
- **className**: `space-y-3`
- **className**: `block text-sm font-medium mb-1`
- **className**: `w-full`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `space-y-1`
- **className**: `flex justify-between text-sm`
- **className**: `w-full bg-border dark:bg-muted rounded-full h-2 overflow-hidden`
- **className**: `bg-primary h-full transition-all duration-300`
- **className**: `flex gap-2`
- **className**: `flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`
- **className**: `px-4 py-2 glass-input hover:bg-accent text-foreground rounded-lg font-medium transition-colors`
- **className**: `w-full p-4 flex justify-between items-center hover:bg-accent dark:hover:bg-muted/50 transition-colors rounded-lg`
- **className**: `font-semibold flex items-center gap-2`
- **className**: `text-xs text-muted-foreground`
- **className**: `border-t p-3 space-y-2 max-h-96 overflow-y-auto`
- **className**: `text-sm text-muted-foreground text-center py-4`
- **className**: `rounded-lg transition-colors bg-muted/40 dark:bg-muted/50`
- **className**: `flex justify-between items-center p-3`
- **className**: `flex-1 flex items-center gap-2 text-left`
- **className**: `font-mono text-sm font-medium`
- **className**: `px-3 py-1 text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors`
- **className**: `px-3 py-1 text-xs bg-red-500/20 text-red-700 dark:text-red-400 rounded hover:bg-red-500/30 transition-colors`
- **className**: `border-t px-3 py-2 space-y-1`
- **className**: `text-xs font-semibold text-muted-foreground mb-1`
- **className**: `flex flex-wrap gap-1`
- **className**: `inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground dark:text-foreground/80`
- **className**: `ml-1 text-muted-foreground text-[10px]`
- **className`…`**: `rounded-lg border p-4 border-border glass-panel`
- **className`…`**: `w-full px-3 py-2 rounded-lg border border-border glass-input focus:outline-none focus:ring-2 focus:ring-ring/40`
- **className`…`**: `rounded-lg border border-border glass-panel`
- **className`…`**: `w-5 h-5 transition-transform …`
- **className`…`**: `w-4 h-4 transition-transform …`

### `src/components/RAGDocumentsPanel.tsx`
- **className**: `mb-2 text-xs`
- **className**: `flex items-center justify-between gap-2 mb-3 mt-1`
- **className**: `flex items-center gap-2 min-w-0 flex-1 text-left text-sm font-medium rounded-lg px-1 py-1 -mx-1 hover:bg-accent/70`
- **className**: `w-4 h-4 shrink-0 text-muted-foreground`
- **className**: `w-4 h-4 text-primary shrink-0`
- **className**: `truncate`
- **className**: `flex items-center gap-1`
- **className**: `text-xs px-2 py-1 rounded hover:bg-accent/70`
- **className**: `p-1.5 rounded hover:bg-accent/70`
- **className**: `text-[11px] text-muted-foreground mb-2`
- **className**: `text-xs text-amber-600 dark:text-amber-400 mb-2`
- **className**: `text-xs text-primary mb-2`
- **className**: `py-6`
- **className**: `py-6 text-sm`
- **className**: `flex items-start gap-2`
- **className**: `mt-0.5 shrink-0 text-primary`
- **className**: `w-4 h-4`
- **className**: `flex-1 min-w-0`
- **className**: `text-sm font-medium truncate`
- **className**: `flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1`
- **className**: `text-primary`
- **className**: `mt-2 h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden`
- **className**: `h-full bg-primary transition-all`
- **className**: `flex flex-wrap items-center justify-end gap-0.5 shrink-0`
- **className**: `p-1.5 rounded hover:bg-accent dark:hover:bg-muted disabled:opacity-40 text-xs`
- **className**: `p-1.5 rounded hover:bg-accent dark:hover:bg-muted disabled:opacity-40`
- **className**: `w-3.5 h-3.5`
- **className**: `space-y-4`
- **className**: `surface-elevated rounded-lg p-4`
- **className**: `mb-2 text-[11px] text-muted-foreground`
- **className**: `text-sm text-muted-foreground`
- **className`…`**: `w-4 h-4 …`
- **className`…`**: `rounded-lg border p-3 transition-colors …`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/components/RAGExcelPanel.tsx`
- **className**: `mb-3`
- **className**: `flex items-center justify-between gap-2 mb-2`
- **className**: `flex items-center gap-2 min-w-0 flex-1 text-left text-sm font-medium rounded-lg px-1 py-1 -mx-1 hover:bg-accent/70`
- **className**: `w-4 h-4 shrink-0 text-muted-foreground`
- **className**: `w-4 h-4 text-emerald-600 shrink-0`
- **className**: `truncate`
- **className**: `text-xs px-2 py-1 rounded hover:bg-accent/70`
- **className**: `mb-2 text-xs`
- **className**: `text-[11px] text-muted-foreground mb-2`
- **className**: `py-4`
- **className**: `py-4 text-sm`
- **className**: `space-y-2`
- **className**: `rounded-lg border border-border/70 p-2.5`
- **className**: `text-sm font-medium break-words`
- **className**: `mt-1 space-y-0.5 text-[11px] text-muted-foreground`
- **className**: `break-all`
- **className**: `break-all font-mono`
- **className**: `mt-2 flex flex-wrap gap-1.5`
- **className**: `inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs hover:bg-accent/70`
- **className**: `h-3.5 w-3.5`
- **className**: `rounded-lg px-2 py-1 text-xs hover:bg-accent/70`
- **className**: `grid items-start gap-4 lg:grid-cols-2`
- **className**: `min-w-0 rounded-lg border border-border/70`
- **className**: `border-b border-border/60 px-3 py-2 text-sm font-medium`
- **className**: `max-h-[65vh] overflow-auto p-3`
- **className**: `whitespace-pre-wrap break-words text-xs leading-relaxed`
- **className**: `text-sm text-muted-foreground`
- **className**: `mb-2 text-[11px] text-muted-foreground`
- **className**: `w-full border-collapse text-xs`
- **className**: `sticky top-0 bg-background border-b border-border px-2 py-1 text-left font-medium whitespace-nowrap`
- **className**: `odd:bg-muted/40`
- **className**: `border-b border-border/50 px-2 py-1 align-top break-words`

### `src/components/RAGFilesSidebar.tsx`
- **className**: `flex items-center gap-2 min-w-0`
- **className**: `w-4 h-4 text-primary shrink-0`
- **className**: `text-sm font-semibold truncate`
- **className**: `flex items-center gap-1`
- **className**: `p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95`
- **className**: `w-4 h-4`
- **className**: `p-1.5 rounded-lg hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95`
- **className**: `flex-1 min-h-0 overflow-y-auto p-2`
- **cn(...)**: `right-0`
- **cn(...)**: `w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-0 border-l border-border shadow-2xl xl:shadow-none xl:w-80`
- **cn(...)**: `w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-full pointer-events-none border-l border-transparent opacity-0 xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0`
- **cn(...)**: `justify-between gap-2`

### `src/components/RAGSessionSidebar.tsx`
- **className**: `flex items-center gap-2 min-w-0`
- **className**: `w-4 h-4 text-primary shrink-0`
- **className**: `text-sm font-semibold truncate`
- **className**: `flex items-center gap-1`
- **className**: `p-1.5 rounded-lg hover:bg-border dark:hover:bg-muted text-muted-foreground disabled:pointer-events-none disabled:opacity-50`
- **className**: `p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95`
- **className**: `w-4 h-4`
- **className**: `p-1.5 rounded-lg hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95`
- **className**: `flex-1 overflow-y-auto p-2 space-y-1`
- **className**: `text-xs text-muted-foreground text-center py-6`
- **className**: `text-center py-8 px-3`
- **className**: `text-sm text-muted-foreground mb-3`
- **className**: `text-sm px-3 py-1.5 rounded-lg btn-gradient`
- **className**: `p-2`
- **className**: `w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40 surface-elevated`
- **className**: `w-full text-left p-3 pr-16`
- **className**: `text-[11px] text-muted-foreground mt-1 flex items-center gap-2`
- **className**: `p-1.5 rounded-md hover:bg-border dark:hover:bg-muted text-muted-foreground`
- **className**: `w-3.5 h-3.5`
- **cn(...)**: `left-0`
- **cn(...)**: `w-[min(18.5rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-0 border-r border-border shadow-2xl xl:shadow-none xl:w-72`
- **cn(...)**: `w-[min(18.5rem,calc(100vw-2.5rem))] max-w-[85vw] -translate-x-full pointer-events-none border-r border-transparent opacity-0 xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0`
- **cn(...)**: `justify-between gap-2`
- **className`…`**: `w-4 h-4 …`
- **className`…`**: `workspace-list-item group relative rounded-lg border transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] …`
- **className`…`**: `text-sm truncate …`
- **className`…`**: `absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity …`

### `src/components/RagPreviewDialog.tsx`
- **className**: `flex h-[min(92vh,56rem)] w-[min(96vw,72rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg`
- **className**: `shrink-0 border-b border-border/60 px-6 py-4 pr-12 text-left`
- **className**: `truncate text-base sm:text-lg`
- **className**: `min-h-0 flex-1 overflow-y-auto px-6 py-5`

### `src/components/RankingTool.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0`
- **className**: `text-xs text-muted-foreground`
- **className**: `flex items-center justify-between gap-2`
- **className**: `space-y-2`
- **className**: `group rounded-lg border border-border bg-background/60 p-2.5`
- **className**: `flex items-start gap-2`
- **className**: `flex flex-col gap-0.5 shrink-0`
- **className**: `min-w-0 flex-1`
- **className**: `flex flex-wrap items-center gap-1.5 mb-1`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `text-xs line-clamp-3 break-words`
- **className**: `flex gap-1.5 min-w-0`
- **className**: `sr-only`
- **className**: `text-sm text-muted-foreground py-10 text-center`
- **className**: `p-3`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `rounded-lg border border-border bg-background/60 p-2.5`
- **className**: `flex flex-wrap items-center gap-2 mb-1`
- **className**: `text-xs font-semibold w-5`
- **className**: `text-xs`
- **className**: `text-xs text-muted-foreground line-clamp-3 break-words`
- **className**: `grid grid-cols-2 gap-2 text-xs`
- **className**: `rounded-lg border border-border p-2`
- **className**: `text-muted-foreground block`
- **className**: `font-medium`
- **cn(...)**: `space-y-3`
- **cn(...)**: `h-28`
- **cn(...)**: `h-6 w-6 px-0`
- **cn(...)**: `opacity-0 group-hover:opacity-100`
- **cn(...)**: `flex-1`

### `src/components/ResendVerificationBlock.tsx`
- **className**: `space-y-3`
- **className**: `block space-y-1`

### `src/components/SettingsPanel.tsx`
- **className**: `bg-background dark:bg-muted/50 rounded-lg p-3 border border-border/50`
- **className**: `text-xs font-bold uppercase text-muted-foreground mb-2`
- **className**: `space-y-3`
- **className**: `flex justify-between items-center mb-1`
- **className**: `text-xs text-foreground/80`
- **className**: `text-xs font-mono bg-border dark:bg-muted px-1.5 py-0.5 rounded text-muted-foreground`
- **className**: `w-full h-1.5 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-primary`
- **className**: `bg-background dark:bg-muted/50 rounded-lg p-4 border border-border/50`
- **className**: `text-xs font-bold uppercase text-muted-foreground mb-3`
- **className**: `space-y-4`
- **className**: `flex justify-between items-center mb-2`
- **className**: `text-sm text-foreground/80`
- **className**: `text-xs font-mono bg-border dark:bg-muted px-2 py-0.5 rounded text-muted-foreground`
- **className**: `w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-primary`
- **className**: `text-[10px] text-muted-foreground mt-1`

### `src/components/Sidebar.tsx`
- **const footerCardClass**: `rounded-lg border border-border/60 bg-accent/25 dark:bg-accent/15 px-2.5 py-2`
- **ok**: `bg-green-500`
- **warn**: `bg-amber-500`
- **bad**: `bg-destructive`
- **idle**: `bg-muted-foreground/40`
- **pending**: `bg-amber-500 animate-pulse`
- **className**: `inline-flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground`
- **className**: `w-3.5 h-3.5 shrink-0`
- **className**: `truncate tracking-tight`
- **className**: `min-w-0`
- **className**: `flex items-center justify-between gap-2 text-[10px] mb-1`
- **className**: `text-muted-foreground truncate`
- **className**: `font-mono tabular-nums text-foreground/70 shrink-0`
- **className**: `h-1 w-full rounded-full bg-border/80 overflow-hidden`
- **className**: `flex items-center gap-2 min-w-0 rounded-lg px-1 hover:bg-accent/50 transition-colors duration-200`
- **className**: `h-7 w-7`
- **className**: `min-w-0 text-left`
- **className**: `block text-sm font-semibold text-foreground leading-tight truncate`
- **className**: `block text-[10px] text-muted-foreground leading-tight`
- **className**: `flex items-center shrink-0`
- **className**: `w-4 h-4 transition-transform duration-500 ease-out rotate-0`
- **className**: `w-4 h-4`
- **className**: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-4`
- **className**: `px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **className**: `space-y-0.5`
- **className**: `shrink-0 border-t border-border/60 p-2.5 space-y-2`
- **className**: `flex items-center gap-1 min-w-0`
- **className**: `min-w-0 flex-1 flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-accent/70 transition-colors`
- **className**: `h-3 w-px bg-border shrink-0`
- **className**: `truncate font-mono text-[11px] text-muted-foreground`
- **className**: `inline-flex items-center gap-1`
- **className**: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **className**: `flex items-center gap-2 min-w-0`
- **className**: `flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold shrink-0`
- **className**: `min-w-0 flex-1`
- **className**: `truncate text-sm font-medium text-foreground`
- **className**: `text-[10px] text-muted-foreground`
- **className**: `grid grid-cols-2 gap-1`
- **className**: `w-3.5 h-3.5`
- **cn(...)**: `w-1.5 h-1.5 rounded-full`
- **cn(...)**: `h-full rounded-full transition-all duration-700`
- **cn(...)**: `fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-500 ease-out`
- **cn(...)**: `opacity-100`
- **cn(...)**: `opacity-0 pointer-events-none`
- **cn(...)**: `fixed top-0 left-0 z-50 flex h-screen w-[calc(var(--spacing)*55)] flex-col`
- **cn(...)**: `text-foreground`
- **cn(...)**: `[&_a]:text-inherit [&_a:hover]:text-inherit`
- **cn(...)**: `transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0`
- **cn(...)**: `translate-x-0 shadow-2xl md:shadow-none`
- **cn(...)**: `-translate-x-full`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `md:hidden`
- **cn(...)**: `space-y-2`
- **cn(...)**: `p-1.5 disabled:opacity-50`
- **cn(...)**: `w-3.5 h-3.5`
- **cn(...)**: `animate-spin`
- **cn(...)**: `grid grid-cols-2 gap-x-3 gap-y-2`
- **cn(...)**: `opacity-60`
- **cn(...)**: `w-1.5 h-1.5 rounded-full opacity-70`
- **cn(...)**: `flex items-center gap-2 min-w-0`
- **cn(...)**: `space-y-1.5`
- **cn(...)**: `/admin`
- **cn(...)**: `col-span-2`

### `src/components/SystemInfoPanel.tsx`
- **className**: `w-4 h-4`
- **className**: `flex justify-between py-2 border-b border-border/60 last:border-0`
- **className**: `text-sm text-muted-foreground`
- **className**: `text-sm font-medium text-foreground font-mono text-right truncate ml-4`
- **className**: `h-8 w-8`
- **className**: `flex h-full min-h-0 flex-col`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate`
- **className**: `hidden md:inline min-w-0 truncate font-mono text-xs text-muted-foreground`
- **className**: `flex items-center justify-end mb-3`
- **className**: `mb-4`
- **className**: `grid grid-cols-1 md:grid-cols-2 gap-4`
- **className**: `p-4`
- **className**: `text-xs font-medium text-muted-foreground mb-3`
- **className**: `space-y-1`
- **className**: `p-8 text-center text-sm text-muted-foreground`
- **cn(...)**: `flex items-center`
- **cn(...)**: `w-1.5 h-1.5 rounded-full`
- **cn(...)**: `bg-destructive`
- **cn(...)**: `bg-green-500/50 animate-pulse`
- **cn(...)**: `bg-green-500`
- **cn(...)**: `bg-foreground/20`
- **cn(...)**: `flex-1 min-h-0 overflow-y-auto`
- **cn(...)**: `p-0`
- **cn(...)**: `p-4 md:p-6`

### `src/components/UserFilesPanel.tsx`
- **className**: `space-y-3 mb-4 pb-4 border-b border-border`
- **className**: `flex items-center justify-between gap-2`
- **className**: `flex items-center gap-2 min-w-0 flex-1 text-left text-sm font-medium rounded-lg px-1 py-1 -mx-1 hover:bg-accent/70`
- **className**: `w-4 h-4 shrink-0 text-muted-foreground`
- **className**: `w-4 h-4 text-primary shrink-0`
- **className**: `truncate`
- **className**: `p-1.5 rounded hover:bg-accent/70`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `text-xs`
- **className**: `py-4`
- **className**: `py-4 text-sm`
- **className**: `flex items-start gap-2`
- **className**: `mt-0.5 shrink-0 text-primary disabled:opacity-30`
- **className**: `w-4 h-4`
- **className**: `flex-1 min-w-0`
- **className**: `text-sm font-medium truncate`
- **className**: `text-[11px] text-muted-foreground truncate`
- **className**: `flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1`
- **className**: `text-[11px] text-muted-foreground mt-1`
- **className**: `text-[11px] text-red-500 mt-1`
- **className**: `mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden`
- **className**: `h-full bg-primary transition-all`
- **className**: `flex items-center gap-0.5 shrink-0`
- **className**: `p-1.5 rounded hover:bg-accent/70 disabled:opacity-40`
- **className**: `w-3.5 h-3.5`
- **className**: `h-[min(75vh,44rem)] w-full rounded-lg border border-border bg-background`
- **className**: `max-w-none`
- **className`…`**: `w-4 h-4 …`
- **className`…`**: `rounded-lg border p-3 …`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/components/WorkspaceSourcesSection.tsx`
- **className**: `mb-3`
- **className**: `flex items-center justify-between gap-2`
- **className**: `-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-sm font-medium hover:bg-accent/70`
- **className**: `h-4 w-4 shrink-0 text-muted-foreground`
- **className**: `h-4 w-4 shrink-0 text-primary`
- **className**: `truncate`
- **className**: `flex items-center gap-1`
- **className**: `rounded px-2 py-1 text-xs hover:bg-accent/70`
- **className**: `rounded p-1.5 hover:bg-accent/70`
- **className**: `mt-1.5`
- **className**: `mb-2 text-xs text-destructive`
- **className**: `px-1 py-2 text-xs leading-relaxed text-muted-foreground`
- **className**: `text-primary underline-offset-2 hover:underline`
- **className**: `space-y-1`
- **className**: `mt-0.5 shrink-0 text-primary`
- **className**: `h-4 w-4 animate-spin text-amber-500`
- **className**: `h-4 w-4`
- **className**: `min-w-0 flex-1`
- **className**: `mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-border`
- **className**: `block h-full bg-primary`
- **className**: `mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground`
- **cn(...)**: `h-4 w-4`
- **cn(...)**: `animate-spin`
- **cn(...)**: `flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed`
- **cn(...)**: `border-primary bg-accent dark:bg-accent`
- **cn(...)**: `border-primary/50 bg-primary/10 dark:bg-primary/15`
- **cn(...)**: `border-transparent hover:bg-accent disabled:hover:bg-transparent`
- **cn(...)**: `error`
- **cn(...)**: `text-destructive`
- **cn(...)**: `text-amber-500`
- **cn(...)**: `block truncate text-sm font-medium`
- **cn(...)**: `opacity-60`
- **cn(...)**: `mt-0.5 block text-[11px]`
- **cn(...)**: `ready`
- **cn(...)**: `text-green-600 dark:text-green-400`
- **cn(...)**: `indexing`
- **cn(...)**: `pending`
- **cn(...)**: `missing`
- **cn(...)**: `text-amber-600 dark:text-amber-400`

### `src/components/account/AccountDeskPanel.tsx`
- **className**: `space-y-3`
- **className**: `space-y-1 text-sm`
- **className**: `flex justify-between gap-2`
- **className**: `font-mono text-xs`
- **className**: `text-muted-foreground`
- **className**: `space-y-2`
- **className**: `w-full rounded-lg border border-border bg-background px-3 py-2 text-sm`
- **className**: `rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground`
- **className**: `space-y-3 text-sm`
- **className**: `space-y-1`
- **className**: `truncate`
- **className**: `text-xs text-red-600`
- **className**: `w-full rounded-lg border border-border bg-background px-3 py-2`
- **className**: `flex items-center gap-2`
- **className**: `rounded-lg bg-primary px-3 py-2 text-primary-foreground`
- **className**: `space-y-4 text-sm`
- **className**: `rounded-lg border border-border px-3 py-2`
- **className**: `space-y-2 rounded-lg border border-amber-400/50 bg-amber-500/10 p-3`
- **className**: `font-mono text-xs break-all`
- **className**: `text-xs break-all text-muted-foreground`
- **className**: `flex gap-2`
- **className**: `min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1`
- **className**: `rounded-lg bg-primary px-3 py-1 text-primary-foreground`

### `src/components/auth/AuthThemeToggle.tsx`
- **className**: `h-4 w-4`
- **cn(...)**: `inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors`
- **cn(...)**: `fixed top-3 right-3 z-50 glass-panel shadow-sm`

### `src/components/auth/authUi.ts`
- **const authPageClass**: `relative min-h-dvh flex items-center justify-center text-foreground p-4`
- **const authCardClass**: `relative w-full max-w-sm min-w-0 overflow-hidden glass-panel rounded-lg`
- **const authTitleClass**: `text-sm font-semibold text-foreground`
- **const authSubtitleClass**: `text-[10px] text-muted-foreground leading-tight`
- **const authLabelClass**: `text-xs text-muted-foreground`
- **const authHintClass**: `text-xs text-muted-foreground`
- **const authMutedClass**: `text-xs text-muted-foreground`
- **const authInputClass**: `w-full min-w-0 h-10 px-3 rounded-lg text-sm glass-input placeholder:text-muted-foreground`
- **const authLinkClass**: `text-xs text-muted-foreground hover:text-foreground transition-colors`
- **const authButtonClass**: `w-full inline-flex items-center justify-center h-10 px-3 rounded-lg text-sm font-medium btn-gradient disabled:opacity-50`
- **const authSecondaryButtonClass**: `w-full inline-flex items-center justify-center h-10 px-3 rounded-lg text-sm font-medium bg-accent hover:bg-border text-foreground disabled:opacity-50 transition-colors`

### `src/components/brand/StudioLogo.tsx`
- **cn(...)**: `studio-logo shrink-0 rounded-lg object-cover`

### `src/components/chat/ChatBanners.tsx`
- **className**: `shrink-0 space-y-1 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2`
- **className**: `text-sm text-amber-950 dark:text-amber-100`

### `src/components/chat/ChatMessageToolbar.tsx`
- **className**: `mt-1 flex flex-wrap gap-1 opacity-80`
- **className**: `rounded-lg px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40`

### `src/components/chat/ChatSessionTools.tsx`
- **className**: `mb-2 rounded-lg border border-border bg-card p-3 text-sm space-y-2`
- **className**: `flex items-center justify-between gap-2`
- **className**: `font-medium`
- **className**: `text-xs text-muted-foreground`
- **className**: `space-y-1`
- **className**: `truncate`
- **className**: `text-xs text-red-600`
- **className**: `flex gap-2`
- **className**: `min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1`
- **className**: `rounded-lg border border-border px-2 py-1`
- **className**: `space-y-2`
- **className**: `w-full rounded-lg border border-border bg-background px-2 py-1`
- **className**: `rounded-lg bg-primary px-3 py-1 text-primary-foreground`
- **className**: `block w-full text-xs`
- **className**: `flex flex-wrap gap-1`
- **className**: `max-h-40 overflow-auto whitespace-pre-wrap text-xs`
- **className**: `text-xs underline`

### `src/components/chat/ReasoningEffortMenu.tsx`
- **className**: `max-w-[5.5rem] truncate`
- **className**: `rounded-lg border border-border bg-popover p-1.5 shadow-xl`
- **className**: `px-2.5 pt-1.5 pb-2 border-b border-border mb-1`
- **className**: `text-[11px] font-medium text-foreground`
- **className**: `text-[10px] text-muted-foreground leading-snug mt-0.5`
- **className**: `flex flex-col gap-0.5`
- **className**: `min-w-0 flex-1`
- **className**: `block text-xs font-medium leading-tight`
- **className**: `block text-[10px] text-muted-foreground leading-tight mt-0.5`
- **className**: `h-3.5 w-3.5 shrink-0 text-primary`
- **cn(...)**: `inline-flex items-end gap-0.5 h-3.5 shrink-0`
- **cn(...)**: `w-[3px] rounded-[1px] transition-colors`
- **cn(...)**: `h-1.5`
- **cn(...)**: `h-2`
- **cn(...)**: `h-2.5`
- **cn(...)**: `h-3.5`
- **cn(...)**: `bg-muted-foreground/25`
- **cn(...)**: `bg-primary`
- **cn(...)**: `bg-muted-foreground/20`
- **cn(...)**: `relative shrink-0`
- **cn(...)**: `inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors`
- **cn(...)**: `border-border bg-card text-foreground hover:bg-accent hover:border-primary/30`
- **cn(...)**: `disabled:opacity-40 disabled:cursor-not-allowed`
- **cn(...)**: `border-primary/40 bg-accent ring-2 ring-primary/20`
- **cn(...)**: `h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150`
- **cn(...)**: `rotate-180 text-foreground`
- **cn(...)**: `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors`
- **cn(...)**: `bg-accent text-accent-foreground`
- **cn(...)**: `text-foreground hover:bg-muted`
- **cn(...)**: `flex h-8 w-8 shrink-0 items-center justify-center rounded-md border`
- **cn(...)**: `border-primary/35 bg-primary/10`
- **cn(...)**: `border-border bg-card`

### `src/components/finetune/ConfigurationPanel.tsx`
- **className**: `glass-panel border border-border rounded-lg p-4 md:p-5 shadow-sm`
- **className**: `flex items-center justify-between mb-4`
- **className**: `font-bold text-foreground flex items-center gap-2`
- **className**: `w-5 h-5 text-primary`
- **className**: `text-xs text-primary hover:underline`
- **className**: `space-y-4`
- **className**: `grid grid-cols-1 gap-4`
- **className**: `block text-xs font-medium text-foreground/80 mb-1.5`
- **className**: `w-full px-3 py-2 bg-background dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50`
- **className**: `grid grid-cols-2 gap-4`
- **className**: `w-full px-3 py-2 bg-background dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 font-mono`
- **className**: `pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300`
- **className**: `text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3`
- **className**: `grid grid-cols-2 gap-4 mb-4`
- **className**: `space-y-3`
- **className**: `flex items-center justify-between`
- **className**: `text-xs text-foreground/80`
- **className**: `w-4 h-4 text-primary rounded focus:ring-ring/40 border-gray-300 dark:border-border dark:bg-muted`
- **className**: `flex flex-wrap gap-2`
- **className**: `flex items-center gap-1.5 text-xs text-muted-foreground bg-background dark:bg-muted px-2 py-1 rounded border border-border cursor-pointer`
- **className**: `w-3 h-3 text-primary rounded focus:ring-ring/40 border-gray-300 dark:border-border dark:bg-muted`

### `src/components/finetune/ConnectionTest.tsx`
- **className**: `flex items-center gap-2`
- **className**: `px-2 py-0.5 surface-elevated rounded shadow-sm text-[10px]`
- **className`…`**: `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border mb-3 …`
- **className`…`**: `w-2 h-2 rounded-full …`

### `src/components/finetune/DatasetDropzone.tsx`
- **className**: `glass-panel border border-border rounded-lg p-4 md:p-5 shadow-sm h-full flex flex-col`
- **className**: `font-bold text-foreground flex items-center gap-2 mb-4`
- **className**: `w-5 h-5 text-purple-500`
- **className**: `flex-1 flex flex-col`
- **className**: `bg-background dark:bg-muted/50 rounded-lg p-3 border border-border mb-3`
- **className**: `flex items-center justify-between mb-2`
- **className**: `font-medium text-sm text-foreground truncate pr-2`
- **className**: `text-xs text-muted-foreground surface-elevated px-2 py-0.5 rounded border border-border whitespace-nowrap`
- **className**: `flex items-center justify-between`
- **className**: `text-xs text-muted-foreground`
- **className**: `text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400`
- **className**: `grid grid-cols-2 gap-2 mt-auto`
- **className**: `bg-background dark:bg-muted/30 p-2 rounded border border-border`
- **className**: `block text-[10px] text-muted-foreground uppercase`
- **className**: `text-sm font-bold text-foreground`
- **className**: `hidden`
- **className**: `w-8 h-8 text-muted-foreground mb-2`
- **className**: `text-sm font-medium text-muted-foreground text-center`
- **className**: `text-xs text-muted-foreground mt-1`
- **className`…`**: `flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer …`

### `src/components/finetune/GpuStats.tsx`
- **className**: `flex flex-col gap-2 p-3 bg-background dark:bg-muted/50 rounded-lg`
- **className**: `flex items-center justify-between`
- **className**: `text-xs font-medium text-foreground/80 flex items-center gap-1.5`
- **className**: `w-3.5 h-3.5 text-muted-foreground`
- **className**: `text-[10px] text-muted-foreground font-normal truncate max-w-[100px]`
- **className**: `text-xs font-mono text-muted-foreground`
- **className**: `w-full h-12 mt-1`
- **className**: `w-full h-full`
- **className**: `space-y-2 mt-1`
- **className**: `space-y-1`
- **className**: `flex justify-between text-[10px] text-muted-foreground`
- **className**: `font-mono`
- **className**: `h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden`
- **className**: `flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border`
- **className**: `flex items-center gap-1`
- **className**: `w-3 h-3`
- **className**: `h-full flex flex-col overflow-y-auto`
- **className**: `flex items-center justify-between mb-3`
- **className**: `text-xs font-bold text-muted-foreground uppercase tracking-wider`
- **className**: `text-[10px] text-muted-foreground`
- **className**: `flex-1 space-y-3`
- **className**: `text-xs text-muted-foreground text-center py-4`
- **className**: `mt-3 pt-3 border-t border-border`
- **className**: `flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground`
- **className**: `flex items-center gap-1.5`
- **className**: `w-2 h-2 rounded-full`
- **className`…`**: `w-2 h-2 rounded-full …`
- **className`…`**: `h-full rounded-full transition-all duration-500 …`
- **style={{}}**: `minWidth: 0, minHeight: 0`
- **style={{}}**: `display: 'block'`
- **style={{}}**: `backgroundColor: CHART_COLORS[i % CHART_COLORS.length]`

### `src/components/finetune/SystemStats.tsx`
- **className**: `h-full flex flex-col`
- **className**: `text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3`
- **className**: `flex-1 space-y-4`
- **className**: `flex flex-col gap-1`
- **className**: `flex justify-between items-center text-xs`
- **className**: `font-medium text-foreground/80 flex items-center gap-1.5`
- **className**: `w-3.5 h-3.5 text-muted-foreground`
- **className**: `font-mono text-muted-foreground`
- **className**: `h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden`
- **className**: `h-full rounded-full transition-all duration-500 bg-violet-500`
- **className`…`**: `h-full rounded-full transition-all duration-500 …`

### `src/components/finetune/Terminal.tsx`
- **className**: `h-full flex flex-col glass-panel rounded-lg border border-gray-200 dark:border-border shadow-inner overflow-hidden font-mono text-sm relative group`
- **className**: `flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-background border-b border-gray-200 dark:border-border`
- **className**: `flex items-center gap-2`
- **className**: `flex gap-1.5`
- **className**: `w-2.5 h-2.5 rounded-full bg-red-500/80`
- **className**: `w-2.5 h-2.5 rounded-full bg-amber-500/80`
- **className**: `w-2.5 h-2.5 rounded-full bg-emerald-500/80`
- **className**: `text-xs text-gray-500 dark:text-muted-foreground ml-2`
- **className**: `flex-1 overflow-y-auto p-3 md:p-4 space-y-1 custom-scrollbar bg-gray-50/50 dark:bg-transparent`
- **className**: `h-full flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground gap-2`
- **className**: `w-8 h-8`
- **className**: `text-xs`
- **className**: `text-gray-400 dark:text-muted-foreground select-none mr-2`
- **className**: `absolute bottom-4 right-4 bg-primary hover:bg-primary text-white text-xs px-2 py-1 rounded-full shadow-lg cursor-pointer transition-colors`
- **className`…`**: `break-words whitespace-pre-wrap leading-relaxed … text-xs md:text-sm`

### `src/components/finetune/TrainingProgress.tsx`
- **className**: `glass-panel border border-border rounded-lg p-4 shadow-sm`
- **className**: `flex items-center justify-between mb-3`
- **className**: `font-bold text-foreground flex items-center gap-2`
- **className**: `text-xs font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded`
- **className**: `h-2 w-full bg-accent rounded-full overflow-hidden mb-4`
- **className**: `grid grid-cols-2 gap-3 mb-4`
- **className**: `p-2 bg-background dark:bg-muted/50 rounded-lg border border-border/50`
- **className**: `text-[10px] text-muted-foreground uppercase tracking-wider mb-1`
- **className**: `text-sm font-bold text-foreground`
- **className**: `text-muted-foreground font-normal`
- **className**: `grid grid-cols-3 gap-2`
- **className**: `text-center p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30`
- **className**: `text-[9px] text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5`
- **className**: `text-xs font-mono font-bold text-purple-700 dark:text-purple-300`
- **className**: `text-center p-2 bg-accent dark:bg-accent/40 rounded-lg border border-primary/20 dark:border-primary/30`
- **className**: `text-[9px] text-primary uppercase tracking-wider mb-0.5`
- **className**: `text-xs font-mono font-bold text-primary dark:text-primary`
- **className**: `text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30`
- **className**: `text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5`
- **className**: `text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300`
- **className**: `mt-3 pt-3 border-t border-border text-xs text-muted-foreground`
- **className`…`**: `w-2.5 h-2.5 rounded-full … …`
- **className`…`**: `h-full rounded-full transition-all duration-300 …`

### `src/components/inference-lab/InferenceAnalyticsPanel.tsx`
- **className**: `space-y-4`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `w-[8.5rem]`
- **className**: `flex items-center gap-1.5`
- **className**: `h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-accent`
- **className**: `text-sm text-destructive`
- **className**: `grid grid-cols-2 lg:grid-cols-4 gap-3`
- **className**: `rounded-lg border border-border/60 p-3`
- **className**: `text-sm font-medium mb-2`
- **className**: `grid grid-cols-1 lg:grid-cols-2 gap-3`
- **className**: `rounded-lg border border-border/60 overflow-hidden`
- **className**: `text-sm font-medium px-3 py-2 border-b border-border`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground`
- **className**: `px-3 py-2`
- **className**: `border-t border-border/60`
- **className**: `px-3 py-2 font-mono text-xs`
- **cn(...)**: `w-44`

### `src/components/inference-lab/InferenceHistoryPanel.tsx`
- **className**: `space-y-3`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `w-[9.5rem]`
- **className**: `w-[9rem]`
- **className**: `h-8 px-3 rounded-lg text-xs hover:bg-accent`
- **className**: `text-sm text-destructive`
- **className**: `space-y-2`
- **className**: `w-full text-left`
- **className**: `flex flex-wrap items-center gap-2 mb-1`
- **className**: `text-[11px] font-mono text-muted-foreground`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `text-[11px] text-muted-foreground ml-auto`
- **className**: `text-sm line-clamp-2`
- **className**: `text-xs text-muted-foreground font-mono line-clamp-2 mt-1`
- **className**: `flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-2`
- **className**: `flex justify-end mt-1`
- **className**: `h-7 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10`
- **className**: `flex items-center justify-between text-xs text-muted-foreground`
- **className**: `flex gap-1`
- **className**: `h-7 px-2 rounded-lg hover:bg-accent disabled:opacity-40`
- **cn(...)**: `min-w-[12rem] flex-1`
- **className`…`**: `rounded-lg border p-3 …`

### `src/components/layout/AppPageLayout.tsx`
- **className**: `flex items-center gap-2 w-full min-w-0`
- **className**: `p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors`
- **className**: `w-6 h-6`
- **className**: `h-7 w-7`
- **className**: `text-sm font-semibold truncate text-foreground`
- **className**: `shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200`
- **className**: `font-medium`
- **className**: `min-w-0 flex-1 truncate`
- **className**: `underline underline-offset-2 hover:no-underline`
- **cn(...)**: `relative transition-colors duration-300`
- **cn(...)**: `min-w-0 md:pl-[calc(var(--spacing)*55)] relative page-enter`
- **cn(...)**: `h-dvh overflow-hidden flex flex-col`
- **cn(...)**: `min-h-dvh`
- **cn(...)**: `md:hidden sticky top-0 z-30`
- **cn(...)**: `min-w-0`
- **cn(...)**: `flex-1 min-h-0 overflow-hidden p-0`
- **cn(...)**: `overflow-x-hidden p-4 sm:p-6 lg:p-8`

### `src/components/layout/CelestiaBackground.tsx`
- **className**: `pointer-events-none fixed inset-0 -z-10 overflow-hidden`
- **className**: `absolute inset-0 bg-celestia-gradient`

### `src/components/markdown/ChatMarkdown.tsx`
- **className**: `my-2 text-center text-xs text-muted-foreground`
- **className**: `my-3 text-center text-xs text-muted-foreground`
- **className**: `my-3`
- **className**: `max-w-full h-auto rounded-lg shadow-md mx-auto`
- **className**: `text-center text-xs text-muted-foreground mt-1.5`
- **className**: `relative group my-4 min-w-0 max-w-full`
- **className**: `rounded-lg text-sm overflow-x-auto`
- **className**: `overflow-x-auto my-4`
- **className**: `text-primary hover:underline hover:text-primary dark:hover:text-primary transition-colors`
- **className**: `inline-block w-3 h-3 ml-0.5`
- **className**: `overflow-x-auto my-4 shadow-sm rounded-lg border border-border`
- **className**: `min-w-full border-collapse`
- **className**: `bg-background dark:bg-muted/50`
- **className**: `border border-border px-4 py-2.5 text-left font-semibold text-foreground`
- **className**: `border border-border px-4 py-2.5 text-foreground/80`
- **className**: `border-l-4 border-primary bg-accent/50 dark:bg-accent pl-4 py-2 my-3 rounded-r-lg`
- **className**: `text-foreground/80 italic`
- **className**: `list-disc pl-5 my-3 space-y-1.5`
- **className**: `list-decimal pl-5 my-3 space-y-1.5`
- **className**: `my-1 leading-relaxed`
- **className**: `text-2xl font-bold my-4 pb-2 border-b-2 border-border`
- **className**: `text-xl font-bold my-3 pb-1.5 border-b border-border`
- **className**: `text-lg font-bold my-2.5 text-primary dark:text-primary`
- **className**: `text-base font-semibold my-2 text-foreground`
- **className**: `my-2.5 leading-relaxed`
- **className**: `my-4 border-t border-border`
- **className**: `font-bold text-primary dark:text-primary`
- **className**: `italic text-muted-foreground`
- **className**: `line-through text-muted-foreground`
- **className**: `underline text-green-600 dark:text-green-400`
- **className**: `my-3 p-3 bg-background dark:bg-muted/50 rounded-lg border border-border`
- **className**: `font-semibold cursor-pointer text-primary hover:text-primary dark:hover:text-primary`
- **className**: `whitespace-pre-wrap break-words`
- **className`…`**: `… px-1.5 py-0.5 rounded-md text-sm font-mono`

### `src/components/markdown/CodeCopyButton.tsx`
- **className**: `absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-muted/90 text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent`
- **className**: `h-3.5 w-3.5`

### `src/components/markdown/PlainCodeBlock.tsx`
- **className**: `relative group my-3 min-w-0 max-w-full`
- **className**: `overflow-x-auto rounded-lg border px-3 py-2.5 text-[13px] leading-snug font-mono whitespace-pre`
- **style={{}}**: `backgroundColor: isDarkMode ? '#1e1e1e' : '#f6f8fa',
          color: isDarkMode ? '#d4d4d4' : '#24292e',
          borderColor: isDarkMode ? '#3e3e3e' : '#e1e4e8',`

### `src/components/ui/alert-banner.tsx`
- **error**: `bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200`
- **success**: `bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200`
- **warning**: `bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200`
- **info**: `bg-accent dark:bg-accent border-primary/25 dark:border-primary/30 text-primary dark:text-primary`
- **error**: `text-red-500 hover:text-red-700 dark:hover:text-red-300`
- **success**: `text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300`
- **warning**: `text-amber-500 hover:text-amber-700 dark:hover:text-amber-300`
- **info**: `text-primary hover:text-primary dark:hover:text-primary`
- **className**: `flex-1 min-w-0`
- **cn(...)**: `rounded-lg border px-3 py-2 text-sm flex items-start justify-between gap-2`
- **cn(...)**: `shrink-0 leading-none`

### `src/components/ui/badge.tsx`
- **default**: `border-transparent bg-primary text-primary-foreground hover:bg-primary/80`
- **secondary**: `border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80`
- **destructive**: `border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80`
- **warning**: `border-transparent bg-yellow-500 text-yellow-foreground hover:bg-yellow-500/80`
- **outline**: `text-foreground`
- **className`…`**: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 … …`

### `src/components/ui/button.tsx`
- **default**: `btn-gradient shadow-sm`
- **destructive**: `bg-destructive text-white hover:bg-destructive/90`
- **outline**: `glass-input hover:bg-accent hover:text-accent-foreground`
- **secondary**: `bg-secondary text-secondary-foreground hover:brightness-110`
- **ghost**: `hover:bg-accent/70 hover:text-accent-foreground`
- **link**: `text-primary underline-offset-4 hover:underline`
- **default**: `h-11 px-5`
- **sm**: `h-9 px-4 text-sm`
- **lg**: `h-12 px-8 text-base`
- **cn(...)**: `inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all`
- **cn(...)**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **cn(...)**: `disabled:pointer-events-none disabled:opacity-50`

### `src/components/ui/card.tsx`
- **className`…`**: `glass-panel rounded-lg text-card-foreground shadow-sm …`
- **className`…`**: `flex flex-col space-y-1.5 p-6 …`
- **className`…`**: `text-2xl font-semibold leading-none tracking-tight font-display …`
- **className`…`**: `text-sm text-muted-foreground …`
- **className`…`**: `p-6 pt-0 …`
- **className`…`**: `flex items-center p-6 pt-0 …`

### `src/components/ui/chart-container.tsx`
- **className`…`**: `w-full min-w-0 …`
- **style={{}}**: `height, minHeight: height`

### `src/components/ui/date-picker.tsx`
- **className**: `w-3.5 h-3.5 shrink-0 text-muted-foreground`
- **className**: `p-2`
- **className**: `flex items-center justify-between gap-2 px-1 pb-2`
- **className**: `p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground`
- **className**: `w-4 h-4`
- **className**: `text-xs font-medium capitalize`
- **className**: `grid grid-cols-7 gap-0.5 px-0.5 mb-1`
- **className**: `text-[10px] text-center text-muted-foreground py-1`
- **className**: `grid grid-cols-7 gap-0.5 px-0.5`
- **className**: `h-8`
- **className**: `flex items-center justify-between gap-2 pt-2 px-0.5`
- **className**: `h-7 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground`
- **className**: `h-7 px-2.5 rounded-lg text-xs hover:bg-accent`
- **cn(...)**: `relative min-w-0`
- **cn(...)**: `w-full justify-between`
- **cn(...)**: `truncate`
- **cn(...)**: `text-muted-foreground`
- **cn(...)**: `h-8 rounded-lg text-xs transition-colors`
- **cn(...)**: `bg-primary/15 text-foreground font-medium`
- **cn(...)**: `border border-border text-foreground`
- **cn(...)**: `text-foreground/80 hover:bg-accent`

### `src/components/ui/dialog.tsx`
- **className**: `absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none`
- **className**: `h-4 w-4`
- **className**: `sr-only`
- **cn(...)**: `fixed inset-0 z-[110] modal-scrim data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`
- **cn(...)**: `fixed left-1/2 top-1/2 z-[120] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 glass-modal p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg`
- **cn(...)**: `flex flex-col space-y-1.5 text-center sm:text-left`
- **cn(...)**: `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2`
- **cn(...)**: `text-lg font-semibold leading-none tracking-tight text-foreground`
- **cn(...)**: `text-sm text-muted-foreground`

### `src/components/ui/form-field.tsx`
- **const inputBaseClass**: `w-full glass-input rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed`
- **const inputErrorClass**: `border-red-500 dark:border-red-500 focus:ring-red-500/30`
- **const selectBaseClass**: `w-full glass-input rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none appearance-none bg-no-repeat bg-[length:1rem] bg-[right_0.9rem_center] cursor-pointer`
- **className**: `text-red-500 ml-0.5`
- **cn(...)**: `block text-sm font-medium text-foreground/80 mb-1`
- **cn(...)**: `mt-1 text-xs text-red-600 dark:text-red-400`
- **cn(...)**: `mt-1 text-xs text-muted-foreground`

### `src/components/ui/gpu-monitor-card.tsx`
- **className**: `p-2 bg-gray-100 dark:bg-gray-800 rounded`
- **className**: `flex items-baseline justify-between gap-2`
- **className**: `text-xs text-muted-foreground`
- **className**: `text-[10px] text-muted-foreground`
- **className**: `font-semibold text-sm`
- **className**: `font-normal text-muted-foreground`
- **className**: `h-1 mt-1`
- **className**: `flex justify-between gap-3 py-0.5`
- **className**: `text-muted-foreground shrink-0`
- **className**: `font-mono text-right break-all`
- **className**: `w-full min-w-0`
- **className**: `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
- **className**: `flex items-center min-w-0`
- **className**: `truncate`
- **className**: `flex items-center gap-1.5 shrink-0 ml-2`
- **className**: `space-y-4`
- **className**: `flex justify-between text-sm mb-1`
- **className**: `h-2`
- **className**: `text-xs text-muted-foreground mt-1`
- **className**: `grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3`
- **className**: `flex flex-col items-center text-center`
- **className**: `h-5 w-5 mb-1`
- **className**: `text-sm`
- **className**: `p-3 rounded-lg bg-accent dark:bg-accent`
- **className**: `h-5 w-5 mb-1 text-primary`
- **className**: `text-lg font-bold text-primary`
- **className**: `p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30`
- **className**: `h-5 w-5 mb-1 text-purple-600 dark:text-purple-400`
- **className**: `text-lg font-bold text-purple-600 dark:text-purple-400`
- **className**: `text-[11px] text-muted-foreground`
- **className**: `p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30`
- **className**: `h-5 w-5 mb-1 text-cyan-600 dark:text-cyan-400`
- **className**: `text-lg font-bold text-cyan-600 dark:text-cyan-400`
- **className**: `space-y-0.5 text-xs text-muted-foreground`
- **className**: `pt-2 border-t`
- **className**: `flex flex-wrap items-center justify-between gap-2 mb-2`
- **className**: `text-sm text-muted-foreground`
- **className**: `flex flex-wrap gap-1`
- **className**: `grid grid-cols-2 gap-2`
- **className**: `text-sm text-muted-foreground mb-1.5`
- **className**: `space-y-1 text-xs`
- **className**: `flex items-center justify-between gap-3`
- **className**: `min-w-0 truncate font-mono`
- **className**: `text-muted-foreground`
- **className**: `shrink-0 font-mono`
- **className**: `pt-2 border-t text-xs`
- **className**: `cursor-pointer text-sm text-muted-foreground`
- **className**: `mt-1.5`
- **className**: `text-muted-foreground pt-0.5`
- **className`…`**: `w-3 h-3 rounded-full … mr-2 shrink-0`
- **className`…`**: `p-3 rounded-lg …`
- **className`…`**: `text-lg font-bold …`

### `src/components/ui/icon-button.tsx`
- **ghost**: `hover:bg-accent/70 text-foreground/80`
- **danger**: `hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500`
- **primary**: `hover:bg-primary/10 text-primary`
- **sm**: `p-1 rounded-lg`
- **md**: `p-1.5 rounded-lg`
- **cn(...)**: `inline-flex items-center justify-center transition-colors disabled:opacity-40 shrink-0`

### `src/components/ui/menu-popover.tsx`
- **const fieldControlClass**: `inline-flex items-center gap-2 h-10 min-w-0 px-3.5 rounded-lg text-sm glass-input text-left transition-colors hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed`
- **const fieldInputClass**: `h-8 min-w-0 w-full px-3 rounded-lg text-xs glass-input`
- **const fieldTextareaClass**: `w-full min-w-0 text-sm glass-input rounded-lg px-3.5 py-2.5 resize-y scroll-clip`
- **cn(...)**: `glass-panel rounded-lg border border-border/70 shadow-xl p-1 overflow-hidden origin-top-right animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none`

### `src/components/ui/metric-card.tsx`
- **container**: `glass-panel border border-border/60`
- **title**: `text-foreground/80`
- **label**: `text-muted-foreground`
- **container**: `bg-accent border border-primary/25`
- **title**: `text-foreground`
- **label**: `text-primary`
- **container**: `bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700`
- **title**: `text-emerald-700 dark:text-emerald-300`
- **label**: `text-emerald-600 dark:text-emerald-400`
- **container**: `bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700`
- **title**: `text-amber-800 dark:text-amber-300`
- **label**: `text-amber-700 dark:text-amber-400`
- **className**: `text-xs text-muted-foreground block mb-1 truncate`
- **className**: `text-lg sm:text-xl font-bold text-foreground break-words`
- **className**: `flex justify-between`
- **cn(...)**: `min-w-0 overflow-hidden p-3 glass-panel rounded-lg`
- **cn(...)**: `p-4 rounded-lg overflow-hidden`
- **cn(...)**: `font-medium mb-2`
- **cn(...)**: `text-sm`
- **cn(...)**: `font-bold`

### `src/components/ui/page-header.tsx`
- **className**: `flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0`
- **className**: `min-w-0`
- **className**: `text-xl sm:text-3xl font-bold text-gradient font-display break-words`
- **className**: `text-sm text-muted-foreground mt-1 max-w-prose`
- **className**: `flex flex-wrap items-center gap-2 w-full sm:w-auto`

### `src/components/ui/page-states.tsx`
- **className**: `mt-3`
- **cn(...)**: `text-sm text-muted-foreground py-8 text-center`
- **cn(...)**: `text-center text-muted-foreground py-8 px-3`

### `src/components/ui/panel-card.tsx`
- **className**: `text-sm font-semibold mb-3 text-foreground font-display`
- **cn(...)**: `p-5`

### `src/components/ui/panel-scroll-area.tsx`
- **cn(...)**: `min-h-0 overflow-y-auto overflow-x-hidden scroll-clip`

### `src/components/ui/progress.tsx`
- **className**: `h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300`
- **cn(...)**: `relative h-4 w-full overflow-hidden rounded-full bg-border dark:bg-muted`

### `src/components/ui/result-panel.tsx`
- **className**: `text-sm mt-1 text-red-600 dark:text-red-400`
- **cn(...)**: `rounded-lg border p-4 overflow-hidden`
- **cn(...)**: `bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700`
- **cn(...)**: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700`
- **cn(...)**: `font-medium`
- **cn(...)**: `text-emerald-700 dark:text-emerald-300`
- **cn(...)**: `text-red-700 dark:text-red-300`

### `src/components/ui/select-menu.tsx`
- **className**: `rounded-lg border-border/80 bg-popover p-1.5 shadow-2xl`
- **className**: `max-h-64 overflow-y-auto overflow-x-hidden scroll-clip py-0.5`
- **className**: `min-w-0 flex-1 truncate`
- **className**: `flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10`
- **className**: `w-3 h-3`
- **cn(...)**: `relative min-w-0`
- **cn(...)**: `w-full justify-between`
- **cn(...)**: `h-8 rounded-lg px-3 text-xs`
- **cn(...)**: `ring-2 ring-ring/30`
- **cn(...)**: `truncate`
- **cn(...)**: `text-muted-foreground`
- **cn(...)**: `w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200`
- **cn(...)**: `w-3.5 h-3.5`
- **cn(...)**: `rotate-180`
- **cn(...)**: `flex w-full items-center gap-2 rounded-lg px-3 text-left transition-colors`
- **cn(...)**: `h-8 text-xs`
- **cn(...)**: `h-9 text-sm`
- **cn(...)**: `bg-accent text-foreground font-medium shadow-sm`
- **cn(...)**: `text-foreground/80 hover:bg-accent/70 hover:text-foreground`

### `src/components/ui/status-pill.tsx`
- **success**: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
- **error**: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
- **warning**: `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
- **info**: `bg-accent text-foreground`
- **neutral**: `bg-muted text-muted-foreground`
- **purple**: `bg-accent text-foreground`
- **teal**: `bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400`
- **indigo**: `bg-accent text-foreground`
- **amber**: `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
- **green**: `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
- **blue**: `bg-accent text-foreground`
- **success**: `bg-emerald-500`
- **error**: `bg-red-500`
- **warning**: `bg-amber-500`
- **info**: `bg-primary`
- **neutral**: `bg-muted-foreground`
- **purple**: `bg-primary`
- **teal**: `bg-teal-500`
- **indigo**: `bg-primary`
- **amber**: `bg-amber-500`
- **green**: `bg-green-500`
- **blue**: `bg-primary`
- **success**: `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800`
- **error**: `bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`
- **warning**: `bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800`
- **cn(...)**: `inline-flex items-center gap-1.5 text-xs font-medium rounded-full whitespace-nowrap`
- **cn(...)**: `px-2.5 py-1 border`
- **cn(...)**: `px-2 py-0.5`
- **cn(...)**: `w-1.5 h-1.5 rounded-full shrink-0`
- **cn(...)**: `animate-pulse`

### `src/components/ui/status-row.tsx`
- **container**: `bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`
- **dot**: `bg-green-500`
- **container**: `bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`
- **dot**: `bg-amber-500`
- **container**: `bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`
- **dot**: `bg-red-500`
- **className**: `flex-1 min-w-0`
- **className**: `font-medium`
- **className**: `text-sm text-muted-foreground`
- **cn(...)**: `flex items-center gap-3 p-3 rounded-lg`
- **cn(...)**: `w-2 h-2 rounded-full shrink-0`

### `src/components/ui/tabs.tsx`
- **cn(...)**: `inline-flex h-11 items-center justify-center rounded-lg border border-border/60 glass-panel p-1 text-muted-foreground`
- **cn(...)**: `inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/12 data-[state=active]:text-foreground data-[state=active]:shadow-sm`
- **cn(...)**: `mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### `src/components/ui/tool-surface.ts`
- **const toolCard**: `min-w-0 overflow-hidden rounded-lg border border-border bg-background p-3 sm:p-4`
- **const toolPreShell**: `min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background/60`
- **const toolPreBody**: `overflow-auto max-h-80 p-3 text-xs font-mono break-all scroll-clip`
- **const toolTitle**: `text-sm font-semibold text-foreground`
- **const toolBtn**: `inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none`

### `src/components/ui/toolbar-button.tsx`
- **primary**: `btn-gradient`
- **success**: `bg-emerald-600 hover:bg-emerald-500 text-white`
- **danger**: `bg-destructive hover:brightness-110 text-white`
- **warning**: `bg-amber-600 hover:bg-amber-500 text-white`
- **emerald**: `bg-emerald-600 hover:bg-emerald-500 text-white`
- **purple**: `btn-gradient`
- **indigo**: `btn-gradient`
- **orange**: `bg-orange-600 hover:bg-orange-500 text-white`
- **neutral**: `glass-input hover:bg-accent text-foreground`
- **cn(...)**: `inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-center shadow-sm`

### `src/components/ui/top-banner.tsx`
- **container**: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`
- **text**: `text-red-600 dark:text-red-400`
- **action**: `bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50`
- **container**: `bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800`
- **text**: `text-emerald-600 dark:text-emerald-400`
- **action**: `bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50`
- **container**: `bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800`
- **text**: `text-amber-600 dark:text-amber-400`
- **action**: `bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50`
- **container**: `bg-accent dark:bg-accent border-primary/25 dark:border-primary/30`
- **text**: `text-primary`
- **action**: `bg-accent dark:bg-accent text-primary dark:text-primary hover:bg-accent dark:hover:bg-accent`
- **className**: `flex items-center justify-between w-full gap-3`
- **cn(...)**: `border-b px-4 py-2 shrink-0`
- **cn(...)**: `flex items-center gap-2 text-sm`
- **cn(...)**: `text-xs px-2 py-1 rounded transition-colors shrink-0`

### `src/components/workspace/WorkspaceFilePanel.tsx`
- **const iconButton**: `inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40`
- **className**: `flex h-full min-h-0 flex-col`
- **className**: `flex items-center gap-1 border-b border-border/60 px-3 py-2`
- **className**: `min-w-0 flex-1`
- **className**: `truncate text-sm font-medium`
- **className**: `truncate text-[11px] text-muted-foreground`
- **className**: `h-4 w-4`
- **className**: `flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent`
- **className**: `h-3 w-3 animate-spin`
- **className**: `min-w-0 flex-1 truncate`
- **className**: `inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10`
- **className**: `h-3 w-3`
- **className**: `min-h-0 flex-1 overflow-auto bg-muted/25 p-3 sm:p-4`
- **className**: `flex h-full items-center justify-center text-sm text-muted-foreground`
- **className**: `mr-2 h-4 w-4 animate-spin`
- **className**: `workspace-file-sheet text-sm text-destructive`
- **className**: `workspace-file-sheet h-full min-h-full w-full resize-none font-mono text-[13px] leading-relaxed focus:outline-none`
- **className**: `workspace-file-sheet chat-msg-ai text-sm`
- **className**: `mb-3 text-xs text-muted-foreground`
- **className**: `workspace-file-sheet`
- **className**: `whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed`
- **className**: `workspace-file-sheet text-sm text-muted-foreground`
- **className**: `workspace-file-sheet text-sm leading-relaxed text-muted-foreground`
- **className**: `flex items-center justify-end gap-2 border-t border-border/60 px-3 py-2`
- **className**: `mr-auto text-[11px] text-muted-foreground`
- **className**: `h-8 rounded-lg px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground`
- **className**: `inline-flex h-8 items-center gap-1.5 rounded-lg btn-gradient px-3 text-xs font-medium disabled:opacity-40`
- **className**: `h-3.5 w-3.5 animate-spin`
- **className**: `h-3.5 w-3.5`
- **cn(...)**: `hover:text-destructive`
- **cn(...)**: `flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-[11px]`
- **cn(...)**: `error`
- **cn(...)**: `text-destructive`
- **cn(...)**: `text-muted-foreground`

### `src/components/workspace/WorkspaceFileTree.tsx`
- **const className**: `h-4 w-4 shrink-0 text-muted-foreground`
- **created**: `bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`
- **edited**: `bg-primary/15 text-primary dark:text-primary`
- **overwritten**: `bg-amber-500/15 text-amber-700 dark:text-amber-300`
- **className**: `h-3.5 w-3.5 shrink-0 text-destructive`
- **className**: `h-3.5 w-3.5 shrink-0 animate-spin text-amber-500`
- **className**: `h-4 w-4 shrink-0 text-primary`
- **className**: `min-w-0 flex-1 truncate`
- **className**: `text-[10px] text-muted-foreground`
- **className**: `shrink-0 text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100`
- **className**: `flex items-center gap-1 border-b border-border/60 px-2 py-2`
- **className**: `inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg btn-gradient px-3 text-xs font-medium`
- **className**: `h-3.5 w-3.5`
- **className**: `inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground`
- **className**: `h-4 w-4`
- **className**: `hidden`
- **className**: `flex items-center gap-1 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground`
- **className**: `font-medium text-foreground`
- **className**: `shrink-0 hover:text-foreground`
- **className**: `space-y-1.5 border-b border-border/60 px-3 py-2`
- **className**: `text-[11px]`
- **className**: `flex justify-between gap-2 text-muted-foreground`
- **className**: `truncate`
- **className**: `tabular-nums`
- **className**: `mt-1 h-1 overflow-hidden rounded-full bg-border`
- **className**: `h-full rounded-full bg-primary transition-all`
- **className**: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-2`
- **className**: `mx-1 mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300`
- **className**: `shrink-0 underline underline-offset-2`
- **className**: `space-y-2 px-2 py-4 text-center text-xs text-destructive`
- **className**: `underline underline-offset-2`
- **className**: `px-3 py-8 text-center text-xs leading-relaxed text-muted-foreground`
- **className**: `mb-1 font-medium text-foreground`
- **className**: `border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground`
- **className**: `block opacity-80`
- **className**: `pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-background text-sm font-medium text-primary`
- **cn(...)**: `flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm transition-colors hover:bg-accent/60`
- **cn(...)**: `bg-accent/50`
- **cn(...)**: `h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform`
- **cn(...)**: `rotate-90`
- **cn(...)**: `group flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm transition-colors`
- **cn(...)**: `bg-primary/10 text-foreground`
- **cn(...)**: `hover:bg-accent/60`
- **cn(...)**: `shrink-0 rounded-md px-1.5 py-px text-[10px] font-medium`
- **cn(...)**: `relative flex h-full min-h-0 flex-col`
- **cn(...)**: `ring-2 ring-inset ring-primary/50`
- **cn(...)**: `h-4 w-4`
- **cn(...)**: `animate-spin`

### `src/components/workspace/WorkspacePdfPages.tsx`
- **className**: `workspace-file-sheet mb-3 space-y-4`
- **className**: `text-sm font-semibold text-foreground`
- **className**: `text-xs leading-relaxed text-muted-foreground`
- **className**: `flex items-center gap-2 text-xs text-muted-foreground`
- **className**: `h-3.5 w-3.5 animate-spin`
- **className**: `space-y-1.5`
- **className**: `mx-auto h-auto max-w-full rounded-lg shadow-md`
- **className**: `text-center text-[11px] text-muted-foreground`

### `src/components/workspace/WorkspaceTaskFeed.tsx`
- **className**: `h-3.5 w-3.5 animate-spin text-muted-foreground`
- **className**: `h-3.5 w-3.5 text-amber-500`
- **className**: `h-3.5 w-3.5 text-destructive`
- **className**: `h-3.5 w-3.5 text-emerald-500`
- **className**: `mb-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2`
- **className**: `mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground`
- **className**: `h-3 w-3`
- **className**: `space-y-1`
- **className**: `flex items-start gap-2 text-xs leading-relaxed`
- **className**: `mt-0.5 shrink-0`
- **className**: `mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2`
- **className**: `mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300`
- **className**: `space-y-0.5`
- **className**: `flex items-center gap-2 text-sm`
- **className**: `min-w-0 truncate line-through opacity-70`
- **className**: `min-w-0 truncate text-left font-medium text-primary hover:underline`
- **className**: `shrink-0 text-xs text-muted-foreground`
- **className**: `flex items-start gap-2`
- **className**: `mt-0.5 h-4 w-4 shrink-0 text-emerald-500`
- **className**: `mt-0.5 h-4 w-4 shrink-0 text-muted-foreground`
- **className**: `min-w-0 flex-1`
- **className**: `text-sm`
- **className**: `mt-0.5 truncate font-mono text-[11px] text-muted-foreground`
- **className**: `mt-1 text-xs text-muted-foreground`
- **className**: `mt-2.5 flex flex-wrap justify-end gap-2`
- **className**: `h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50`
- **className**: `h-3.5 w-3.5 animate-spin`
- **className**: `flex items-center gap-2 text-sm text-muted-foreground`
- **className**: `mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive`
- **className**: `mt-2 text-xs text-muted-foreground`
- **className**: `space-y-5`
- **className**: `flex justify-end`
- **cn(...)**: `min-w-0 break-words`
- **cn(...)**: `text-destructive`
- **cn(...)**: `text-foreground/80`
- **cn(...)**: `h-3.5 w-3.5 shrink-0`
- **cn(...)**: `text-emerald-600 dark:text-emerald-400`
- **cn(...)**: `mt-3 rounded-lg border px-3 py-2.5`
- **cn(...)**: `border-border/60 bg-muted/30`
- **cn(...)**: `border-destructive/40 bg-destructive/5`
- **cn(...)**: `border-amber-500/40 bg-amber-500/5`
- **cn(...)**: `mt-0.5 h-4 w-4 shrink-0`
- **cn(...)**: `text-amber-500`
- **cn(...)**: `inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:opacity-50`
- **cn(...)**: `bg-destructive text-white hover:bg-destructive/90`
- **cn(...)**: `btn-gradient`
- **cn(...)**: `whitespace-pre-wrap`

### `src/lib/celestia.ts`
- **page**: `min-h-dvh text-foreground font-sans`
- **glassPanel**: `glass-panel rounded-lg`
- **glassInput**: `glass-input rounded-lg`
- **card**: `glass-panel rounded-lg card-hover`
- **cardHover**: `glass-panel rounded-lg card-hover`
- **btnGradient**: `btn-gradient rounded-lg`
- **textGradient**: `text-gradient font-display`
- **sidebar**: `glass-panel border-r border-border`
- **mobileHeader**: `glass-panel border-b border-border`
- **appHeader**: `app-header shrink-0 h-12 min-h-12 max-h-12 overflow-hidden border-b border-border px-2.5 sm:px-4 py-0`
- **appHeaderBar**: `app-header-bar shrink-0 h-12 border-b border-border px-3 flex items-center`
- **workspaceScrim**: `fixed inset-0 z-40 xl:hidden bg-black/45 transition-opacity duration-200 ease-out motion-reduce:transition-none`
- **workspaceDrawer**: `flex flex-col h-full bg-card xl:bg-card shrink-0 overflow-hidden fixed z-50 xl:relative xl:z-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] xl:pt-0 xl:pb-0 transition-[transform,width,box-shadow,border-color,opacity] duration-200 ease-out motion-reduce:transition-none border-r border-border`
- **headerIcon**: `h-8 w-8 transition-colors duration-150 active:bg-accent motion-reduce:transform-none rounded-md`
- **headerMenuItem**: `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors`
- **composerDock**: `px-3 sm:px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0`
- **surfaceElevated**: `surface-elevated rounded-lg shadow-sm`
- **chatComposer**: `chat-composer flex items-center gap-2 rounded-lg border border-border glass-input px-2 py-1 overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 transition-shadow duration-150`
- **chatComposerInput**: `chat-composer-input min-w-0 flex-1 bg-transparent border-0 text-sm resize-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0`
- **chatComposerStop**: `chat-composer-stop shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`
- **sendButton**: `chat-composer-send shrink-0 h-8 w-8 flex items-center justify-center btn-gradient rounded-md disabled:opacity-40`

### `src/pages/APITesterPage.tsx`
- **className**: `inline-flex items-center justify-center min-w-[3.5rem] px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-accent text-muted-foreground`
- **className**: `rounded-lg border border-border glass-panel shadow-sm overflow-hidden min-w-0`
- **className**: `grid grid-cols-1 min-[480px]:grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 sm:p-4`
- **className**: `flex items-start gap-2 min-w-0 text-left`
- **className**: `min-w-0 space-y-1.5`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `text-[11px] sm:text-sm font-mono break-all text-foreground`
- **className**: `flex flex-wrap items-center gap-1.5`
- **className**: `text-xs text-muted-foreground line-clamp-2`
- **className**: `inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 w-full min-[480px]:w-auto self-start`
- **className**: `w-4 h-4 animate-spin`
- **className**: `w-4 h-4`
- **className**: `border-t border-border p-3 sm:p-4 space-y-3 bg-background/80 dark:bg-background/40`
- **className**: `grid grid-cols-1 sm:grid-cols-2 gap-3`
- **className**: `block min-w-0`
- **className**: `block text-xs font-medium text-muted-foreground mb-1`
- **className**: `block`
- **className**: `w-full min-h-[8rem] rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40`
- **className**: `mt-2 max-h-64 overflow-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all surface-elevated p-2 rounded-lg`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate font-mono text-xs text-muted-foreground`
- **className**: `flex items-center gap-1.5 shrink-0`
- **className**: `text-xs text-muted-foreground`
- **className**: `h-8 w-8`
- **className**: `inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40`
- **className**: `flex-1 min-h-0 overflow-y-auto p-4 md:p-6`
- **className**: `grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4`
- **className**: `mb-4 space-y-3 min-w-0`
- **className**: `relative min-w-0`
- **className**: `sr-only`
- **className**: `absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none`
- **className**: `pl-9`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 max-w-full overflow-x-auto`
- **className**: `w-3.5 h-3.5`
- **className**: `flex flex-wrap items-center bg-accent rounded-lg p-0.5 w-fit max-w-full`
- **className**: `mb-4`
- **className**: `space-y-6`
- **className**: `min-w-0`
- **className**: `flex items-center justify-between gap-2 mb-3`
- **className**: `text-sm font-medium text-muted-foreground`
- **className**: `grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3`
- **cn(...)**: `w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform`
- **cn(...)**: `rotate-180`
- **cn(...)**: `flex items-center`
- **cn(...)**: `h-8 px-2.5 rounded-lg text-xs inline-flex items-center gap-1 transition-colors`
- **cn(...)**: `bg-accent text-foreground`
- **cn(...)**: `text-muted-foreground hover:bg-accent`

### `src/pages/ForgotPasswordPage.tsx`
- **className**: `space-y-4`
- **className**: `block space-y-1`
- **className`…`**: `text-center …`

### `src/pages/HardwareinfoPage.tsx`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate text-xs sm:text-sm text-muted-foreground`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit`
- **className**: `flex-1 min-h-0 overflow-y-auto p-4 md:p-6`
- **cn(...)**: `flex items-center`
- **cn(...)**: `px-2.5 h-7 rounded-lg text-xs transition-colors`
- **cn(...)**: `monitoring`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground hover:bg-border/80`
- **cn(...)**: `benchmark`

### `src/pages/LoginPage.tsx`
- **className**: `space-y-3`
- **className**: `block space-y-1.5 min-w-0`
- **className**: `relative`
- **className**: `absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/70`
- **className**: `w-4 h-4`
- **className**: `flex justify-end`
- **className**: `space-y-2`
- **className**: `block space-y-1.5`
- **cn(...)**: `pr-10`
- **cn(...)**: `text-center no-underline`
- **className`…`**: `text-center …`

### `src/pages/OidcCallbackPage.tsx`
- **className`…`**: `text-center …`
- **className`…`**: `text-center py-4 …`

### `src/pages/ProfilePage.tsx`
- **className**: `max-w-2xl mx-auto`
- **className**: `mb-6 flex items-center justify-between gap-4`
- **className**: `text-2xl font-bold`
- **className**: `text-sm text-muted-foreground mt-1`
- **className**: `text-sm text-primary hover:underline shrink-0`
- **className**: `p-4 mb-6`
- **className**: `flex gap-2 mb-6 border-b border-border pb-2 flex-wrap`
- **className**: `mb-4`
- **className**: `p-6`
- **className**: `space-y-4`
- **className**: `block space-y-1`
- **className**: `text-sm text-muted-foreground`
- **className**: `w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm opacity-70`
- **className**: `text-sm font-medium`
- **className**: `w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm`
- **className**: `text-xs text-muted-foreground`
- **className**: `px-4 py-2 rounded-lg btn-gradient text-sm disabled:opacity-50`
- **className**: `block text-sm font-medium`
- **className**: `w-full font-mono text-xs rounded-lg border border-border bg-background/40 px-3 py-2`
- **className**: `flex gap-2`
- **className**: `px-4 py-2 rounded-lg border border-border text-sm`
- **className`…`**: `px-3 py-1.5 rounded-lg text-sm transition-colors …`

### `src/pages/RegisterPage.tsx`
- **className**: `space-y-4`
- **className**: `space-y-3`
- **className**: `block space-y-1`
- **className`…`**: `text-center …`

### `src/pages/ResetPasswordPage.tsx`
- **className**: `space-y-4`
- **className**: `block space-y-1`
- **className`…`**: `text-center …`

### `src/pages/SystemInfoPage.tsx`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`

### `src/pages/VerifyEmailPage.tsx`
- **className`…`**: `text-center …`
- **className`…`**: `text-center py-4 …`

### `src/pages/WorkspacePage.tsx`
- **className**: `h-3.5 w-3.5`
- **className**: `h-4 w-4`
- **className**: `flex h-full min-h-0 overflow-hidden glass-panel text-foreground`
- **className**: `hidden w-72 shrink-0 flex-col border-r border-border/60 lg:flex`
- **className**: `h-4 w-4 text-primary`
- **className**: `text-sm font-semibold`
- **className**: `fixed inset-0 z-40 bg-black/40 lg:hidden`
- **className**: `fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-background shadow-2xl lg:hidden`
- **className**: `rounded-lg p-1.5 text-muted-foreground hover:bg-accent`
- **className**: `flex min-w-0 flex-1 flex-col`
- **className**: `inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden`
- **className**: `min-w-0 flex-1`
- **className**: `truncate text-sm font-semibold`
- **className**: `hidden truncate text-[11px] text-muted-foreground sm:block`
- **className**: `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground`
- **className**: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6`
- **className**: `mx-auto max-w-xl py-10 text-center`
- **className**: `mx-auto mb-3 h-10 w-10 text-primary/70`
- **className**: `mb-1 text-lg font-semibold`
- **className**: `mb-5 text-sm leading-relaxed text-muted-foreground`
- **className**: `flex flex-col gap-2`
- **className**: `rounded-lg border border-border/70 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/60`
- **className**: `mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive`
- **className**: `shrink-0 font-medium underline underline-offset-2`
- **className**: `mb-1.5 px-1 text-[11px] text-amber-700 dark:text-amber-300`
- **className**: `fixed inset-0 z-40 bg-black/40 xl:hidden`
- **className**: `fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-border/60 bg-background shadow-2xl sm:w-[var(--workspace-file-panel)] xl:relative xl:z-auto xl:shrink-0 xl:bg-transparent xl:shadow-none`
- **className**: `absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none hover:bg-primary/30 focus-visible:bg-primary/40 focus-visible:outline-none sm:block`
- **cn(...)**: `gap-2`
- **cn(...)**: `justify-between`
- **cn(...)**: `items-end py-1.5`
- **cn(...)**: `max-h-[200px] px-2 py-1.5 leading-relaxed`

### `src/pages/admin/AdminAuditPage.tsx`
- **className**: `overflow-x-auto min-w-0`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground border-b border-border`
- **className**: `pb-2 pr-3 font-medium`
- **className**: `pb-2 font-medium`
- **className**: `border-b border-border/60 last:border-0 align-top`
- **className**: `py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap`
- **className**: `py-2.5 pr-3 font-medium break-words min-w-0`
- **className**: `py-2.5 pr-3 text-xs max-w-[12rem] truncate`
- **className**: `py-2.5 text-xs text-muted-foreground break-all max-w-[16rem]`
- **className**: `py-6`
- **className**: `flex justify-between items-center gap-2 mt-3 pt-3 border-t border-border min-w-0`
- **className**: `text-xs text-muted-foreground truncate`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminBackupsPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `overflow-x-auto min-w-0`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground border-b border-border`
- **className**: `pb-2 pr-3 font-medium`
- **className**: `pb-2 font-medium`
- **className**: `border-b border-border/60 last:border-0`
- **className**: `py-2.5 pr-3 font-medium`
- **className**: `py-2.5 pr-3`
- **className**: `py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap`
- **className**: `py-2.5`
- **className**: `p-1.5 rounded-lg hover:bg-accent/70 text-muted-foreground hover:text-foreground`
- **className**: `w-4 h-4`
- **className**: `py-6`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminChatDeskPage.tsx`
- **className**: `space-y-4 p-4`
- **className**: `text-xl font-semibold`
- **className**: `flex gap-2`
- **className**: `min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm`
- **className**: `rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground`
- **className**: `rounded-lg border border-border bg-background px-3 py-2 text-sm`
- **className**: `mt-2 max-h-48 overflow-auto text-xs`
- **className**: `max-h-48 overflow-auto text-xs`
- **className**: `mb-2 space-y-1 text-sm`
- **className**: `text-muted-foreground`
- **className**: `rounded-lg border border-border px-3 py-2 text-sm`
- **className**: `mb-2 space-y-2 text-sm`
- **className**: `flex flex-wrap items-center gap-2`
- **className**: `text-xs underline`

### `src/pages/admin/AdminChatsPage.tsx`
- **className**: `w-40`
- **className**: `sr-only`
- **className**: `grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]`
- **className**: `overflow-x-auto min-w-0`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground border-b border-border`
- **className**: `pb-2 pr-3 font-medium`
- **className**: `pb-2 pr-3 font-medium hidden md:table-cell`
- **className**: `pb-2 font-medium`
- **className**: `border-b border-border/60 last:border-0`
- **className**: `py-2 pr-3`
- **className**: `text-left`
- **className**: `block text-xs font-medium truncate max-w-[12rem]`
- **className**: `block text-[10px] text-muted-foreground`
- **className**: `py-2 pr-3 max-w-[14rem] truncate`
- **className**: `text-left truncate w-full`
- **className**: `py-2 pr-3 text-xs text-muted-foreground`
- **className**: `py-2 pr-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap`
- **className**: `py-2`
- **className**: `flex justify-end gap-0.5`
- **className**: `w-4 h-4`
- **className**: `py-6`
- **className**: `flex justify-end gap-2 pt-3`
- **className**: `text-xs text-muted-foreground`
- **className**: `space-y-2 max-h-[70vh] overflow-y-auto scroll-clip`
- **className**: `rounded-lg border border-border/60 p-2`
- **className**: `text-[10px] uppercase text-muted-foreground`
- **className**: `text-xs whitespace-pre-wrap break-words`
- **cn(...)**: `sm:w-44`
- **cn(...)**: `cursor-pointer`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminDashboardPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `text-sm text-muted-foreground`
- **className**: `space-y-4 min-w-0`
- **className**: `grid grid-cols-2 xl:grid-cols-4 gap-3`
- **className**: `space-y-1`
- **className**: `flex justify-between gap-3 text-sm py-2 border-b border-border/60 last:border-0 min-w-0`
- **className**: `min-w-0 break-words`
- **className**: `text-xs text-muted-foreground shrink-0`
- **className**: `flex justify-between gap-3 text-sm py-1.5 border-b border-border/60 last:border-0 min-w-0`
- **className**: `text-muted-foreground truncate`
- **className**: `font-mono text-xs text-right break-all`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminHelpPage.tsx`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate text-xs sm:text-sm text-muted-foreground`
- **className**: `flex items-center gap-1.5 shrink-0`
- **className**: `w-3.5 h-3.5`
- **className**: `flex min-h-0 flex-1 overflow-hidden`
- **className**: `px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **className**: `space-y-0.5`
- **className**: `block truncate`
- **className**: `mb-3`
- **className**: `max-w-3xl`
- **className**: `text-[11px] uppercase tracking-wider text-muted-foreground mb-1`
- **className**: `prose-help`
- **cn(...)**: `flex items-center`
- **cn(...)**: `lg:hidden`
- **cn(...)**: `w-full shrink-0 border-border overflow-y-auto p-3 space-y-4`
- **cn(...)**: `lg:w-64 lg:border-r`
- **cn(...)**: `block`
- **cn(...)**: `hidden lg:block`
- **cn(...)**: `block rounded-lg px-2.5 py-1.5 text-[13px] no-underline transition-colors`
- **cn(...)**: `bg-primary/10 text-foreground border border-primary/20`
- **cn(...)**: `text-foreground/80 hover:bg-accent/70 border border-transparent`
- **cn(...)**: `opacity-90`
- **cn(...)**: `min-w-0 flex-1 overflow-y-auto p-4 sm:p-6`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminInferenceLabPage.tsx`
- **className**: `flex items-center bg-accent rounded-lg p-0.5 w-fit`
- **className**: `space-y-3 min-w-0`
- **className**: `flex flex-wrap items-center gap-2`
- **cn(...)**: `px-2.5 h-7 rounded-lg text-xs transition-colors`
- **cn(...)**: `analytics`
- **cn(...)**: `bg-background text-foreground shadow-sm`
- **cn(...)**: `text-muted-foreground`
- **cn(...)**: `history`
- **cn(...)**: `w-full sm:w-56`

### `src/pages/admin/AdminIntegrationsPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `mb-3`
- **className**: `space-y-3`
- **className**: `text-xs text-muted-foreground`

### `src/pages/admin/AdminLayout.tsx`
- **const footerCardClass**: `rounded-lg border border-border/60 bg-accent/25 dark:bg-accent/15 px-2.5 py-2`
- **className**: `flex items-center gap-2 min-w-0 px-1`
- **className**: `h-7 w-7 shrink-0`
- **className**: `min-w-0 text-left`
- **className**: `block text-sm font-semibold text-foreground leading-tight truncate`
- **className**: `block text-[10px] text-muted-foreground leading-tight truncate`
- **className**: `flex items-center shrink-0`
- **className**: `w-4 h-4`
- **className**: `min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-4`
- **className**: `px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- **className**: `space-y-0.5`
- **className**: `w-3.5 h-3.5 shrink-0`
- **className**: `truncate tracking-tight`
- **className**: `shrink-0 border-t border-border/60 p-2.5`
- **className**: `w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`
- **className**: `w-3.5 h-3.5`
- **className**: `min-w-0 md:pl-[calc(var(--spacing)*55)] h-dvh overflow-hidden flex flex-col relative page-enter`
- **className**: `flex items-center gap-2 w-full min-w-0`
- **className**: `p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors`
- **className**: `w-5 h-5`
- **className**: `h-7 w-7`
- **className**: `text-sm font-semibold truncate text-foreground`
- **className**: `flex-1 min-h-0 overflow-hidden p-0`
- **cn(...)**: `relative h-dvh overflow-hidden`
- **cn(...)**: `fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-500 ease-out`
- **cn(...)**: `opacity-100`
- **cn(...)**: `opacity-0 pointer-events-none`
- **cn(...)**: `fixed top-0 left-0 z-50 flex h-dvh w-[calc(var(--spacing)*55)] flex-col`
- **cn(...)**: `text-foreground`
- **cn(...)**: `[&_a]:text-inherit [&_a:hover]:text-inherit`
- **cn(...)**: `transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0`
- **cn(...)**: `translate-x-0 shadow-2xl md:shadow-none`
- **cn(...)**: `-translate-x-full`
- **cn(...)**: `justify-between gap-2`
- **cn(...)**: `md:hidden`
- **cn(...)**: `md:hidden sticky top-0 z-30`

### `src/pages/admin/AdminMailPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `space-y-3 min-w-0`
- **className**: `grid gap-3 sm:grid-cols-2`
- **className**: `sm:col-span-2`
- **className**: `flex flex-wrap gap-2 min-w-0`
- **className**: `sr-only`
- **className`…`**: `… mt-4`
- **className`…`**: `… flex-1 min-w-[12rem]`

### `src/pages/admin/AdminMaintenancePage.tsx`
- **className**: `space-y-3 min-w-0`
- **className**: `space-y-3`
- **className**: `w-3.5 h-3.5`
- **className**: `flex flex-wrap items-center justify-between gap-3`
- **className**: `flex flex-wrap items-center gap-2 min-w-0 text-sm text-muted-foreground`
- **className**: `break-words min-w-0`
- **className**: `mt-3 h-1.5 rounded-full bg-border overflow-hidden`
- **className**: `h-full rounded-full bg-foreground/40 transition-all`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminOidcPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `mb-3`
- **className**: `space-y-3`
- **className**: `mb-2 text-xs text-muted-foreground`
- **className**: `flex gap-2`
- **className**: `mt-2 text-xs text-muted-foreground`
- **className**: `flex flex-wrap gap-2`

### `src/pages/admin/AdminSessionsPage.tsx`
- **className**: `w-40`
- **className**: `w-3.5 h-3.5`
- **className**: `sr-only`
- **className**: `grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]`
- **className**: `overflow-x-auto min-w-0`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground border-b border-border`
- **className**: `pb-2 pr-3 font-medium`
- **className**: `pb-2 pr-3 font-medium hidden md:table-cell`
- **className**: `pb-2 font-medium`
- **className**: `border-b border-border/60 last:border-0`
- **className**: `py-2 pr-3`
- **className**: `text-left`
- **className**: `block text-xs font-medium truncate max-w-[12rem]`
- **className**: `block text-[10px] text-muted-foreground`
- **className**: `py-2 pr-3 max-w-[14rem] truncate`
- **className**: `text-left truncate w-full`
- **className**: `py-2 pr-3 text-xs text-muted-foreground`
- **className**: `py-2 pr-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap`
- **className**: `py-2`
- **className**: `flex justify-end gap-0.5`
- **className**: `w-4 h-4`
- **className**: `py-6`
- **className**: `flex justify-end gap-2 pt-3`
- **className**: `text-xs text-muted-foreground`
- **className**: `space-y-2 max-h-[70vh] overflow-y-auto scroll-clip`
- **className**: `rounded-lg border border-border/60 p-2`
- **className**: `text-[10px] uppercase text-muted-foreground`
- **className**: `text-xs whitespace-pre-wrap break-words`
- **cn(...)**: `sm:w-44`
- **cn(...)**: `cursor-pointer`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/AdminSettingsPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `space-y-3 min-w-0`
- **className**: `space-y-2`
- **className**: `grid gap-3 sm:grid-cols-2`
- **className**: `sm:col-span-2`
- **className**: `mt-2 text-xs text-destructive`
- **className`…`**: `… font-mono`
- **className`…`**: `… mt-2`

### `src/pages/admin/AdminSystemPage.tsx`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`

### `src/pages/admin/AdminUserChatsPage.tsx`
- **className**: `w-3.5 h-3.5`
- **className**: `grid grid-cols-1 xl:grid-cols-12 gap-3 min-w-0 flex-1`
- **className**: `xl:col-span-4 min-w-0`
- **className**: `text-sm text-muted-foreground py-4 text-center`
- **className**: `space-y-1 max-h-[70vh] overflow-y-auto`
- **className**: `flex-1 min-w-0 text-left`
- **className**: `font-medium text-sm truncate`
- **className**: `text-xs text-muted-foreground mt-1 font-mono truncate`
- **className**: `text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5`
- **className**: `text-xs text-muted-foreground mt-1 line-clamp-2`
- **className**: `w-4 h-4`
- **className**: `xl:col-span-8`
- **className**: `text-sm text-muted-foreground py-8 text-center`
- **className**: `space-y-4`
- **className**: `grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground`
- **className**: `text-muted-foreground`
- **className**: `font-mono`
- **className**: `block space-y-1`
- **className**: `text-sm font-medium`
- **className**: `flex flex-wrap gap-2`
- **className**: `text-sm font-semibold mb-2`
- **className**: `text-sm text-muted-foreground`
- **className**: `space-y-3 max-h-[50vh] overflow-y-auto pr-1`
- **className**: `rounded-lg border border-border p-3`
- **className**: `flex items-center justify-between gap-2 mb-2`
- **className**: `flex items-center gap-2 flex-wrap`
- **className**: `text-xs text-muted-foreground`
- **className**: `flex items-center gap-1 shrink-0`
- **className**: `p-1.5 rounded hover:bg-accent/70`
- **className**: `space-y-2`
- **className**: `sr-only`
- **className**: `flex gap-2`
- **className**: `w-3.5 h-3.5 inline`
- **className**: `text-sm whitespace-pre-wrap break-words font-sans text-foreground/80`
- **className**: `mt-2 text-xs`
- **className**: `cursor-pointer text-muted-foreground`
- **className**: `mt-1 p-2 rounded bg-accent dark:bg-background overflow-x-auto`
- **cn(...)**: `flex items-start gap-2 rounded-lg border p-3 transition-colors min-w-0`
- **cn(...)**: `border-primary/30 bg-primary/5`
- **cn(...)**: `border-border hover:bg-accent/50`
- **className`…`**: `w-3.5 h-3.5 …`
- **className`…`**: `text-xs px-2 py-0.5 rounded-full …`

### `src/pages/admin/AdminUsersPage.tsx`
- **className**: `w-full`
- **className**: `sr-only`
- **className**: `w-3.5 h-3.5`
- **className**: `overflow-x-auto min-w-0`
- **className**: `w-full text-sm`
- **className**: `text-left text-xs text-muted-foreground border-b border-border`
- **className**: `pb-2 pr-3 font-medium`
- **className**: `pb-2 pr-3 font-medium hidden lg:table-cell`
- **className**: `pb-2 font-medium`
- **className**: `border-b border-border/60 last:border-0`
- **className**: `py-2.5 pr-3 font-mono text-xs max-w-[14rem] truncate`
- **className**: `py-2.5 pr-3 max-w-[10rem] truncate`
- **className**: `py-2.5 pr-3 min-w-[9rem]`
- **className**: `py-2.5 pr-3`
- **className**: `py-2.5 pr-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap`
- **className**: `text-xs text-muted-foreground`
- **className**: `py-2.5`
- **className**: `flex items-center gap-0.5`
- **className**: `p-1.5 rounded-lg hover:bg-accent/70 text-muted-foreground hover:text-foreground`
- **className**: `w-4 h-4`
- **className**: `py-6`
- **className**: `fixed inset-0 modal-scrim flex items-center justify-center z-50 p-4`
- **className**: `glass-modal rounded-lg w-full max-w-md p-5 min-w-0`
- **className**: `text-sm font-semibold mb-4 text-foreground`
- **className**: `space-y-3`
- **className**: `rounded-lg h-9 py-0`
- **className**: `flex gap-2 pt-1`
- **cn(...)**: `sm:w-52`
- **cn(...)**: `flex-1`
- **className`…`**: `w-3.5 h-3.5 …`

### `src/pages/admin/adminUi.tsx`
- **const adminBtn**: `inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none`
- **const adminInput**: `h-8 w-full min-w-0 px-2.5 rounded-lg text-xs glass-input disabled:opacity-70`
- **const adminTextarea**: `w-full min-w-0 px-2.5 py-2 rounded-lg text-xs glass-input disabled:opacity-70`
- **className**: `flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground`
- **className**: `flex h-full w-full min-w-0 items-center justify-between gap-2`
- **className**: `flex min-w-0 items-center gap-2`
- **className**: `shrink-0 text-sm font-semibold text-foreground`
- **className**: `hidden sm:block h-4 w-px bg-border shrink-0`
- **className**: `min-w-0 truncate text-xs sm:text-sm text-muted-foreground`
- **className**: `flex items-center gap-1.5 shrink-0`
- **className**: `text-sm font-semibold mb-3 text-foreground`
- **className**: `text-xs text-muted-foreground block mb-1`
- **className**: `flex items-start gap-2 text-sm min-w-0 cursor-pointer`
- **className**: `mt-0.5 rounded border-border`
- **className**: `min-w-0 break-words`
- **cn(...)**: `flex items-center`
- **cn(...)**: `flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4`
- **cn(...)**: `min-w-0 rounded-lg border border-border bg-background p-3 sm:p-4`
- **cn(...)**: `block text-sm min-w-0`
## 5. Палитры (`lib/palettes.ts`) — primary swatches

- `teal: '#0d9488'`
- `ocean: '#0284c7'`
- `forest: '#16a34a'`
- `amber: '#d97706'`
- `slate: '#475569'`
- `coral: '#ea580c'`
- `indigo: '#4f46e5'`
- `lime: '#65a30d'`
- `copper: '#c2410c'`
- `steel: '#0e7490'`
- `deepseek: '#4d6bfe'`
- `grok: '#1a1a1a'`
- `gpt: '#10a37f'`
- `cursor: '#f54e00'`

### Токены каждой палитры (light/dark): primary, primaryForeground, primaryHover, primaryActive, accent, accentForeground, ring, chart1, chart2

Полные значения — в `src/lib/palettes.ts` (LIGHT + DARK).


## 6. `celestia` / `authUi` / UI variants (уже в §4, дубль ключевых)
