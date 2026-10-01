import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark-dimmed.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure marked
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  const htmlContent = React.useMemo(() => {
    try {
      return marked.parse(content || '') as string;
    } catch {
      return content;
    }
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Highlight all code blocks
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    // Add Copy buttons to pre blocks
    const preBlocks = containerRef.current.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;

      pre.style.position = 'relative';

      // Detect language if present
      const codeEl = pre.querySelector('code');
      let lang = '';
      if (codeEl) {
        for (const cls of Array.from(codeEl.classList)) {
          if (cls.startsWith('language-')) {
            lang = cls.replace('language-', '');
            break;
          }
        }
      }

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between px-3 py-1.5 bg-[#141414] border-b border-[#242424] text-[11px] font-mono text-neutral-400 select-none';
      header.innerHTML = `
        <span class="text-[#f5a623] uppercase text-[10px] font-semibold">${lang || 'CODE'}</span>
        <button class="code-copy-btn flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#222222] hover:text-white transition text-[11px]">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          <span>Copy</span>
        </button>
      `;

      const copyBtn = header.querySelector('.code-copy-btn') as HTMLButtonElement;
      if (copyBtn) {
        copyBtn.onclick = (e) => {
          e.stopPropagation();
          const text = codeEl?.textContent || pre.textContent || '';
          navigator.clipboard.writeText(text);
          copyBtn.innerHTML = '<span class="text-[#f5a623] font-sans font-medium">✓ Copied</span>';
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              <span>Copy</span>
            `;
          }, 2000);
        };
      }

      pre.insertBefore(header, pre.firstChild);
    });
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      className={`prose-claude text-[0.935rem] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
