import { createElement, useMemo, useRef } from "react";
import { createStreamSanitizer } from "./sanitizer";
import { presets } from "./presets";
import type { SanitizerOptions, StreamSanitizer } from "./types";

interface SafeStreamProps {
  content: string;
  preset?: "llmChat" | "richText" | "textOnly";
  options?: SanitizerOptions;
  className?: string;
  as?: string;
}

export function SafeStream({
  content,
  preset,
  options,
  className,
  as: Tag = "div",
}: SafeStreamProps) {
  const sanitizer = useMemo(
    () => createStreamSanitizer(preset ? { ...presets[preset], ...options } : options),
    [preset, options],
  );

  const prevContent = useRef("");
  const sanitizedRef = useRef("");

  if (content !== prevContent.current) {
    // Reset sanitizer if content shrunk (new message)
    if (content.length < prevContent.current.length) {
      const fresh = createStreamSanitizer(preset ? { ...presets[preset], ...options } : options);
      sanitizedRef.current = fresh.write(content) + fresh.flush();
    } else {
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

export function useSafeStream(options?: SanitizerOptions & { preset?: "llmChat" | "richText" | "textOnly" }) {
  const sanitizer = useRef<StreamSanitizer>(null!);
  if (!sanitizer.current) {
    const opts = options?.preset ? { ...presets[options.preset], ...options } : options;
    sanitizer.current = createStreamSanitizer(opts);
  }

  return {
    sanitize: (chunk: string) => sanitizer.current.write(chunk),
    flush: () => sanitizer.current.flush(),
  };
}

export type { SafeStreamProps };
