import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { PlainCodeBlock } from './PlainCodeBlock';
import { CodeCopyButton } from './CodeCopyButton';
import { fenceTextTrees, plainCodeFromPre, splitStreamingMarkdown } from './markdownText';
import { useThrottledValue } from '../../hooks/useThrottledValue';

const STREAM_RENDER_INTERVAL_MS = 100;

const REMARK_FULL = [remarkGfm, remarkMath, remarkBreaks];
const REHYPE_FULL = [rehypeKatex, rehypeRaw];
const REMARK_NO_MATH = [remarkGfm, remarkBreaks];
const REHYPE_NO_MATH = [rehypeRaw];

const getCodeStyles = (isDarkMode: boolean): React.CSSProperties => ({
  backgroundColor: isDarkMode ? '#1e1e1e' : '#f6f8fa',
  color: isDarkMode ? '#d4d4d4' : '#24292e',
  border: `1px solid ${isDarkMode ? '#3e3e3e' : '#e1e4e8'}`,
  borderRadius: '6px',
  padding: '0.2em 0.4em',
  fontFamily: 'monospace',
  fontSize: '0.875em',
});

type LoadImage = (src: string, alt?: string) => Promise<string | null>;

function ResolvedMarkdownImage({
  src,
  alt,
  loadImage,
}: {
  src?: string;
  alt?: string;
  loadImage?: LoadImage;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    const absolute = /^(https?:|data:|blob:)/i.test(src);
    if (!loadImage || absolute) {
      setUrl(src);
      setFailed(false);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void loadImage(src, alt)
      .then((next) => {
        if (cancelled) {
          if (next?.startsWith('blob:')) URL.revokeObjectURL(next);
          return;
        }
        if (!next) {
          setFailed(true);
          return;
        }
        objectUrl = next.startsWith('blob:') ? next : null;
        setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, loadImage]);

  if (!src || failed) {
    return alt ? <p className="my-2 text-center text-xs text-muted-foreground">{alt}</p> : null;
  }
  if (!url) {
    return <p className="my-3 text-center text-xs text-muted-foreground">Загружаю изображение…</p>;
  }
  return (
    <div className="my-3">
      <img
        src={url}
        alt={alt || 'Изображение'}
        className="max-w-full h-auto rounded-lg shadow-md mx-auto"
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {alt && <p className="text-center text-xs text-muted-foreground mt-1.5">{alt}</p>}
    </div>
  );
}

/** `draftCode`: блок кода ещё пишется — без Prism, любой язык выводится простым `<pre>`. */
function buildComponents(isDarkMode: boolean, draftCode: boolean, loadImage?: LoadImage): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match || (props.node && props.node.position?.start.line === props.node.position?.end.line);
      const codeString = String(children).replace(/\n$/, '');

      if (!isInline && match) {
        const language = match[1];
        const syntaxStyle = isDarkMode ? vscDarkPlus : vs;

        return (
          <div className="relative group my-4 min-w-0 max-w-full">
            <CodeCopyButton code={codeString} />
            <SyntaxHighlighter
              style={syntaxStyle as Record<string, React.CSSProperties>}
              language={language}
              PreTag="div"
              customStyle={{ margin: 0 }}
              className="rounded-lg text-sm overflow-x-auto"
              showLineNumbers={codeString.split('\n').length > 1}
              wrapLines={true}
              lineNumberStyle={{
                minWidth: '2.5em',
                paddingRight: '1em',
                color: isDarkMode ? '#858585' : '#6e7781',
                userSelect: 'none',
              }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className={`${className || ''} px-1.5 py-0.5 rounded-md text-sm font-mono`}
          style={getCodeStyles(isDarkMode)}
          {...props}
        >
          {children}
        </code>
      );
    },

    pre({ node, children }) {
      const plain = plainCodeFromPre(node, draftCode);
      if (plain !== null) return <PlainCodeBlock code={plain} isDarkMode={isDarkMode} />;
      return <div className="overflow-x-auto my-4">{children}</div>;
    },

    a({ href, children }) {
      if (!href) return <span>{children}</span>;

      const isExternal = href.startsWith('http') || href.startsWith('https');

      return (
        <a
          href={href}
          target={isExternal ? '_blank' : '_self'}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-primary hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {children}
          {isExternal && (
            <svg className="inline-block w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </a>
      );
    },

    table({ children }) {
      return (
        <div className="overflow-x-auto my-4 shadow-sm rounded-lg border border-border">
          <table className="min-w-full border-collapse">{children}</table>
        </div>
      );
    },

    thead({ children }) {
      return <thead className="bg-background/50 dark:bg-muted/50">{children}</thead>;
    },

    th({ children }) {
      return <th className="border border-border px-4 py-2.5 text-left font-semibold text-foreground">{children}</th>;
    },

    td({ children }) {
      return <td className="border border-border px-4 py-2.5 text-foreground/80">{children}</td>;
    },

    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 my-3 rounded-r-lg">
          <div className="text-foreground/80 italic">{children}</div>
        </blockquote>
      );
    },

    ul({ children }) {
      return <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>;
    },

    ol({ children, start }) {
      return <ol start={start} className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>;
    },

    li({ children }) {
      return <li className="my-1 leading-relaxed">{children}</li>;
    },

    h1({ children }) {
      return <h1 className="text-2xl font-bold my-4 pb-2 border-b-2 border-border">{children}</h1>;
    },

    h2({ children }) {
      return <h2 className="text-xl font-bold my-3 pb-1.5 border-b border-border">{children}</h2>;
    },

    h3({ children }) {
      return <h3 className="text-lg font-bold my-2.5 text-blue-700 dark:text-blue-300">{children}</h3>;
    },

    h4({ children }) {
      return <h4 className="text-base font-semibold my-2 text-foreground">{children}</h4>;
    },

    p({ children }) {
      return <p className="my-2.5 leading-relaxed">{children}</p>;
    },

    hr() {
      return <hr className="my-4 border-t border-border" />;
    },

    img({ src, alt }) {
      return <ResolvedMarkdownImage src={src} alt={alt} loadImage={loadImage} />;
    },

    strong({ children }) {
      return <strong className="font-bold text-blue-700 dark:text-blue-300">{children}</strong>;
    },

    em({ children }) {
      return <em className="italic text-muted-foreground">{children}</em>;
    },

    del({ children }) {
      return <del className="line-through text-muted-foreground">{children}</del>;
    },

    ins({ children }) {
      return <ins className="underline text-green-600 dark:text-green-400">{children}</ins>;
    },

    details({ children }) {
      return (
        <details className="my-3 p-3 bg-background/50 dark:bg-muted/50 rounded-lg border border-border">{children}</details>
      );
    },

    summary({ children }) {
      return (
        <summary className="font-semibold cursor-pointer text-primary hover:text-blue-700 dark:hover:text-blue-300">
          {children}
        </summary>
      );
    },
  };
}

interface MarkdownBlockProps {
  text: string;
  isDarkMode: boolean;
  draftCode?: boolean;
  withMath?: boolean;
}

const MarkdownBlock = React.memo(function MarkdownBlock({
  text,
  isDarkMode,
  draftCode = false,
  withMath = true,
  loadImage,
}: MarkdownBlockProps & { loadImage?: LoadImage }) {
  const components = useMemo(() => buildComponents(isDarkMode, draftCode, loadImage), [isDarkMode, draftCode, loadImage]);
  return (
    <ReactMarkdown
      remarkPlugins={withMath ? REMARK_FULL : REMARK_NO_MATH}
      rehypePlugins={withMath ? REHYPE_FULL : REHYPE_NO_MATH}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
});

export const ChatMarkdown: React.FC<{
  content: string;
  isDarkMode: boolean;
  /** Относительные `src` из рабочей папки: вернуть blob-URL или null. */
  loadImage?: LoadImage;
}> = ({ content, isDarkMode, loadImage }) => {
  const text = useMemo(() => fenceTextTrees(content), [content]);
  return <MarkdownBlock text={text} isDarkMode={isDarkMode} loadImage={loadImage} />;
};

/**
 * Markdown во время генерации: разбор не чаще раза в 100 мс, готовые блоки не перерисовываются,
 * дописываемый блок кода — без подсветки, незакрытая формула `$$` — текстом.
 */
export const StreamingChatMarkdown: React.FC<{ content: string; isDarkMode: boolean }> = ({ content, isDarkMode }) => {
  const throttled = useThrottledValue(content, STREAM_RENDER_INTERVAL_MS);
  const { done, tail, openFence, openMath } = useMemo(
    () => splitStreamingMarkdown(fenceTextTrees(throttled)),
    [throttled],
  );

  return (
    <>
      {done.map((block, index) => (
        <MarkdownBlock key={index} text={block} isDarkMode={isDarkMode} />
      ))}
      {tail.trim() && <MarkdownBlock text={tail} isDarkMode={isDarkMode} draftCode={openFence} withMath={!openMath} />}
    </>
  );
};
