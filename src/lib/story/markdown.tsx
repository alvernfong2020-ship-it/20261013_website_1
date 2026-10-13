import React from "react";

/**
 * Minimal, safe rich-text renderer.
 *
 * Supports a restricted markdown subset:
 *   - paragraphs (blank-line separated)
 *   - **bold**, *italic*, `code`
 *   - [link](https://…)  (http/https/mailto only)
 *   - bullet lists (lines starting with "- ")
 *   - numbered lists (lines starting with "1. ")
 *   - ## subheadings
 *
 * The renderer emits React elements directly. It never uses
 * dangerouslySetInnerHTML and never parses raw HTML, so untrusted content
 * cannot inject markup or scripts.
 */

const SAFE_LINK = /^(https?:\/\/|mailto:|\/)/i;

type InlineNode = React.ReactNode;

function renderInline(text: string, keyPrefix: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Order matters: bold, italic, code, then links.
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-paper-sunken px-1.5 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (m && SAFE_LINK.test(m[2])) {
        const external = /^https?:\/\//i.test(m[2]);
        nodes.push(
          <a
            key={key}
            href={m[2]}
            className="text-accent-strong underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {m[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function RichText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const output: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((line, idx) => (
      <li key={`${key}-li${idx}`}>{renderInline(line, `${key}-li${idx}`)}</li>
    ));
    output.push(
      listOrdered ? (
        <ol key={key} className="ml-5 list-decimal space-y-1.5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="ml-5 list-disc space-y-1.5">
          {items}
        </ul>
      ),
    );
    listBuffer = [];
  };

  blocks.forEach((raw, bIdx) => {
    const block = raw.trim();
    if (!block) return;
    const key = `b${bIdx}`;

    if (block.startsWith("## ")) {
      flushList(`${key}-pre`);
      output.push(
        <h3 key={key} className="mt-6 mb-3 font-display text-2xl">
          {renderInline(block.slice(3), key)}
        </h3>,
      );
      return;
    }

    const lines = block.split("\n");
    const allBullets = lines.every((l) => /^\s*[-*]\s+/.test(l));
    const allNumbers = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (allBullets || allNumbers) {
      listOrdered = allNumbers;
      lines.forEach((l) => listBuffer.push(l.replace(/^\s*(?:[-*]|\d+\.)\s+/, "")));
      flushList(key);
      return;
    }

    flushList(`${key}-pre`);
    output.push(
      <p key={key}>{renderInline(block, key)}</p>,
    );
  });

  flushList("tail");

  return <div className={className}>{output}</div>;
}
