import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  content: string;
  isDarkMode: boolean;
  isStreaming?: boolean;
  className?: string;
}

function getCodeStyles(isDarkMode: boolean): React.CSSProperties {
  return {
    backgroundColor: isDarkMode ? '#1e1e1e' : '#f6f8fa',
    color: isDarkMode ? '#d4d4d4' : '#24292e',
    border: `1px solid ${isDarkMode ? '#3e3e3e' : '#e1e4e8'}`,
    borderRadius: '6px',
    padding: '0.2em 0.4em',
    fontFamily: 'monospace',
    fontSize: '0.875em',
  };
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isDarkMode,
  isStreaming = false,
  className = '',
}) => {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className={`break-words leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline =
              !match ||
              (props.node &&
                props.node.position?.start.line === props.node.position?.end.line);
            const codeString = String(children).replace(/\n$/, '');

            if (!isInline && match) {
              const language = match[1];
              const syntaxStyle = isDarkMode ? vscDarkPlus : vs;

              return (
                <div className="relative group my-4">
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(codeString)}
                      className="p-1.5 bg-muted hover:bg-accent text-foreground rounded-md text-xs transition-colors shadow-lg"
                      title="Копировать код"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={syntaxStyle as Record<string, React.CSSProperties>}
                    language={language}
                    PreTag="div"
                    className="rounded-lg text-sm overflow-x-auto"
                    showLineNumbers={codeString.split('\n').length > 1}
                    wrapLines
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
                className={`${codeClassName || ''} px-1.5 py-0.5 rounded-md text-sm font-mono`}
                style={getCodeStyles(isDarkMode)}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
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
            return (
              <th className="border border-border px-4 py-2.5 text-left font-semibold text-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-4 py-2.5 text-foreground/80">
                {children}
              </td>
            );
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
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>;
          },
          li({ children }) {
            return <li className="my-1 leading-relaxed">{children}</li>;
          },
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold my-4 pb-2 border-b-2 border-border">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold my-3 pb-1.5 border-b border-border">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-bold my-2.5 text-blue-700 dark:text-blue-300">{children}</h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold my-2 text-foreground">{children}</h4>
            );
          },
          p({ children }) {
            return <p className="my-2.5 leading-relaxed">{children}</p>;
          },
          hr() {
            return <hr className="my-4 border-t border-border" />;
          },
          img({ src, alt }) {
            if (!src) return null;
            return (
              <div className="my-3">
                <img
                  src={src}
                  alt={alt || 'Изображение'}
                  className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                  loading="lazy"
                />
                {alt && <p className="text-center text-xs text-muted-foreground mt-1.5">{alt}</p>}
              </div>
            );
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
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-blue-500 animate-pulse align-middle" />
      )}
    </div>
  );
};

export default MarkdownContent;
