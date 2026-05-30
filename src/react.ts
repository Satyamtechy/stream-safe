/**
 * React integration for stream-safe.
 *
 * Requires React 18+ as a peer dependency.
 * Import from 'stream-safe/react'.
 */
import { createElement, useMemo, useRef } from "react";
import { presets } from "./presets";
import { createStreamSanitizer } from "./sanitizer";
import type { SanitizerOptions } from "./types";

type PresetName = "llmChat" | "richText" | "textOnly";

interface SafeStreamProps {
  /** The raw HTML content (can grow incrementally during streaming) */
  content: string;
  /** Built-in preset to use */
  preset?: PresetName;
  /** Custom sanitizer options (merged with preset if both provided) */
  options?: SanitizerOptions;
  /** CSS class name for the wrapper element */
  className?: string;
  /** HTML tag to render as (default: "div") */
  as?: string;
}

function resolveOptions(
  preset: PresetName | undefined,
  options: SanitizerOptions | undefined,
): SanitizerOptions | undefined {
  if (preset) {
    return options ? { ...presets[preset], ...options } : presets[preset];
  }
  return options;
}

/**
 * Component that sanitizes streaming HTML content safely.
 * Only processes the delta (new characters) on each render for performance.
 * Resets when content shrinks (e.g., new message replaces old one).
 */
export function SafeStream({
  content,
  preset,
  options,
  className,
  as: Tag = "div",
}: SafeStreamProps) {
  const sanitizer = useMemo(
    () => createStreamSanitizer(resolveOptions(preset, options)),
    [preset, options],
  );

  const prevContent = useRef("");
  const sanitizedRef = useRef("");

  if (content !== prevContent.current) {
    if (content.length < prevContent.current.length) {
      // Content shrunk — new message, re-sanitize from scratch
      const fresh = createStreamSanitizer(resolveOptions(preset, options));
      sanitizedRef.current = fresh.write(content) + fresh.flush();
    } else {
      // Content grew — sanitize only the new delta
      const delta = content.slice(prevContent.current.length);
      sanitizedRef.current += sanitizer.write(delta);
    }
    prevContent.current = content;
  }

  return createElement(Tag, {
    className,
    dangerouslySetInnerHTML: { __html: sanitizedRef.current },
  });
}

/**
 * Hook for manual streaming control.
 * Returns sanitize() to process each chunk and flush() to finalize.
 */
export function useSafeStream(
  options?: SanitizerOptions & { preset?: PresetName },
) {
  const resolved = resolveOptions(options?.preset, options);
  const sanitizer = useRef(createStreamSanitizer(resolved));

  return {
    sanitize: (chunk: string): string => sanitizer.current.write(chunk),
    flush: (): string => sanitizer.current.flush(),
  };
}

export type { SafeStreamProps, PresetName };
