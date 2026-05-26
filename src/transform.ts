import { createStreamSanitizer } from './sanitizer';
import type { SanitizerOptions } from './types';

export function createSanitizeTransform(options?: SanitizerOptions): TransformStream<string, string> {
  const sanitizer = createStreamSanitizer(options);
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const safe = sanitizer.write(chunk);
      if (safe) controller.enqueue(safe);
    },
    flush(controller) {
      const remaining = sanitizer.flush();
      if (remaining) controller.enqueue(remaining);
    }
  });
}
