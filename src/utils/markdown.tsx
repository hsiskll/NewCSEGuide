import React from 'react';
import { Info } from 'lucide-react';

/**
 * Parses markdown text into highly-styled React elements tailored to CSEGuide theme.
 * Handles headings (###, ##, #), bullet lists (*, -, •), numbered lists (1.), 
 * inline bold (**bold**), and inline code (`code`).
 */
export function renderFormattedMarkdown(text: string | undefined): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const parseInlineStyles = (lineText: string) => {
    const parts = lineText.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-[var(--t1)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 bg-[var(--ra)] text-[var(--gd)] font-mono text-[10px] rounded border border-[var(--bd)]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      const hasSeparator = tableRows.length > 1 && tableRows[1].every(cell => /^:?-+:?$/.test(cell));
      let headers: string[] = [];
      let bodyRows: string[][] = [];
      if (hasSeparator) {
        headers = tableRows[0];
        bodyRows = tableRows.slice(2);
      } else {
        bodyRows = tableRows;
      }

      elements.push(
        <div key={`table-${listKey++}`} className="overflow-x-auto my-4.5 rounded-xl border border-[var(--bd)]/50 shadow-sm">
          <table className="min-w-full divide-y divide-[var(--bd)]/40 text-xs text-left">
            {headers.length > 0 && (
              <thead className="bg-[var(--ra)]/80 font-sans font-bold text-[var(--t1)]">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-[var(--bd)]/40 font-semibold tracking-wider">
                      {parseInlineStyles(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[var(--bd)]/20 bg-[var(--sur)]">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-[var(--ra)]/20' : ''}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-[var(--t2)] leading-relaxed font-sans align-top">
                      {parseInlineStyles(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-none pl-1 space-y-2.5 my-3.5">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushAll = () => {
    flushList();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushAll();
      continue;
    }

    // Table row (line starting with '|')
    if (line.startsWith('|')) {
      flushList();
      const cells = line.split('|').map(s => s.trim());
      if (line.startsWith('|')) cells.shift();
      if (line.endsWith('|')) cells.pop();
      tableRows.push(cells);
      inTable = true;
    }
    // Heading level 3 (###)
    else if (line.startsWith('### ')) {
      flushAll();
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-[var(--gd)] font-sans uppercase mt-5 mb-2.5 tracking-wider border-b border-[var(--bd)]/30 pb-1 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[var(--gd)] shrink-0" />
          {parseInlineStyles(line.slice(4))}
        </h4>
      );
    } 
    // Heading level 2 or 1 (##, #)
    else if (line.startsWith('## ') || line.startsWith('# ')) {
      flushAll();
      const content = line.startsWith('## ') ? line.slice(3) : line.slice(2);
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-[var(--t1)] font-sans border-l-3 border-[var(--gd)] pl-3 my-4.5 tracking-tight uppercase">
          {parseInlineStyles(content)}
        </h3>
      );
    } 
    // Bullet lists
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      flushTable();
      inList = true;
      const content = line.slice(2);
      listItems.push(
        <li key={`li-${i}`} className="flex items-start gap-2.5 text-xs text-[var(--t2)] leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gd)] mt-2 shrink-0 animate-pulse" />
          <div className="flex-1">{parseInlineStyles(content)}</div>
        </li>
      );
    } 
    // Numbered lists (1., 2.)
    else if (/^\d+\.\s/.test(line)) {
      flushAll();
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        const num = match[1];
        const content = match[2];
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-3.5 my-3.5 p-3.5 bg-[var(--ra)]/55 border border-[var(--bd)]/40 rounded-xl text-xs">
            <span className="flex items-center justify-center w-5.5 h-5.5 rounded-full bg-[var(--gd)]/15 text-[var(--gd)] font-bold text-xs shrink-0 border border-[var(--gd)]/30">
              {num}
            </span>
            <div className="flex-1 leading-relaxed text-[var(--t2)] pt-0.5">{parseInlineStyles(content)}</div>
          </div>
        );
      }
    } 
    // Standard text paragraph
    else {
      flushAll();
      elements.push(
        <p key={`p-${i}`} className="text-xs text-[var(--t2)] leading-relaxed text-justify mb-3 font-serif">
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  flushAll();
  return <div className="space-y-1.5 font-sans">{elements}</div>;
}
