import { Transform, type TransformCallback } from "node:stream";
import { createStreamSanitizer } from "./sanitizer";
import type { SanitizerOptions } from "./types";

export function createNodeTransform(options?: SanitizerOptions): Transform {
  const sanitizer = createStreamSanitizer(options);
  return new Transform({
    encoding: "utf8",
    transform(
      chunk: Buffer | string,
      encoding: string,
      callback: TransformCallback,
    ) {
      const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      const safe = sanitizer.write(str);
      if (safe) this.push(safe);
      callback();
    },
    flush(callback: TransformCallback) {
      const remaining = sanitizer.flush();
      if (remaining) this.push(remaining);
      callback();
    },
  });
}
