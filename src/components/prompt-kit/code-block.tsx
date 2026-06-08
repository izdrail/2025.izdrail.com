"use client";

import type { HTMLProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { Check, Copy } from "lucide-react";

type CodeBlockProps = {
  children?: ReactNode;
  className?: string;
} & HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-hidden rounded-xl border border-[var(--chat-border)] bg-[#0d0d0d] text-[var(--chat-white)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CodeBlockCodeProps = {
  code: string;
  language?: string;
  className?: string;
} & HTMLProps<HTMLDivElement>;

const THEME_LIGHT = "github-light";
const THEME_DARK = "github-dark";

function getTheme(): string {
  if (typeof window === "undefined") return THEME_DARK;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? THEME_LIGHT
    : THEME_DARK;
}

function CodeBlockCode({
  code,
  language = "plaintext",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isActive = true;
    let currentTheme = getTheme();

    async function highlight() {
      if (!code) {
        if (isActive) setHighlightedHtml("<pre><code></code></pre>");
        return;
      }
      const html = await codeToHtml(code, {
        lang: language,
        theme: currentTheme,
      });
      if (isActive) setHighlightedHtml(html);
    }

    highlight();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      currentTheme = getTheme();
      highlight();
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      isActive = false;
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] leading-relaxed [&>pre]:px-5 [&>pre]:py-4 [&>pre]:!bg-transparent",
    className,
  );

  return (
    <div className="group/codeblock relative">
      {highlightedHtml ? (
        <div
          className={classNames}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          {...props}
        />
      ) : (
        <div className={classNames} {...props}>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      )}
      {code && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            "text-[var(--chat-white-icon)] hover:bg-[var(--chat-hover)] hover:text-[var(--chat-sec)]",
            copied
              ? "opacity-100 text-green-400"
              : "opacity-0 group-hover/codeblock:opacity-100",
          )}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

type CodeBlockHeaderProps = {
  language: string;
  className?: string;
};

function CodeBlockHeader({ language, className }: CodeBlockHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-[var(--chat-border)] px-4 py-2",
        className,
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--chat-white-icon)]">
        {language}
      </span>
    </div>
  );
}

type CodeBlockGroupProps = HTMLProps<HTMLDivElement>;

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { CodeBlock, CodeBlockCode, CodeBlockHeader, CodeBlockGroup };
