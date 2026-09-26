interface HastNode {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

function hastText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

/**
 * Текст fenced-блока без языка (```` ``` ```` без `cpp`/`bash`), иначе null.
 * Такие блоки не должны уходить в инлайн-`code`: там схлопываются переводы строк
 * у деревьев каталогов и вывода программ.
 */
export function plainCodeFromPre(node: unknown): string | null {
  const pre = node as HastNode | undefined;
  const code = pre?.children?.find((child) => child.type === 'element' && child.tagName === 'code');
  if (!code) return null;
  const classes = code.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : typeof classes === 'string' ? classes.split(/\s+/) : [];
  if (list.some((name) => name.startsWith('language-'))) return null;
  return hastText(code).replace(/\n$/, '');
}

const TREE_LINE = /^\s*(?:[│|]\s*)*(?:├──|└──|│)/;
const FENCE = /^\s*(```|~~~)/;

/**
 * Дерево каталогов, присланное моделью без ``` (строки с ├── / └── / │), оборачивается в блок кода,
 * иначе ветки не выравниваются. Корень дерева (`led_driver/`) прямо над первой веткой уходит в тот же блок.
 */
export function fenceTextTrees(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (FENCE.test(line)) {
      inFence = !inFence;
      out.push(line);
      i += 1;
      continue;
    }
    if (inFence || !TREE_LINE.test(line)) {
      out.push(line);
      i += 1;
      continue;
    }
    const block: string[] = [];
    const prev = out[out.length - 1];
    if (prev !== undefined && /^\S+\/\s*$/.test(prev.trim())) {
      block.push(out.pop() as string);
    }
    while (i < lines.length && TREE_LINE.test(lines[i] ?? '')) {
      block.push(lines[i] ?? '');
      i += 1;
    }
    out.push('```', ...block, '```');
  }
  return out.join('\n');
}
