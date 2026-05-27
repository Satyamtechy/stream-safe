import { bench, describe, run } from 'vitest';
import { createStreamSanitizer, presets } from '../src/index';

const smallChunk = '<p>Hello <strong>world</strong></p>';
const mediumChunk = '<div><h1>Title</h1><p>Some <a href="https://example.com">link</a> and <code>code</code></p><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul><table><tr><td>cell</td></tr></table></div>';
const xssChunk = '<p>Safe</p><script>alert(1)</script><img onerror="hack" src="x"><a href="javascript:void(0)">click</a><div onmouseover="steal()">hover</div>';
const largeChunk = mediumChunk.repeat(50);

describe('stream-safe sanitizer', () => {
  bench('small chunk (35B)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    s.write(smallChunk);
    s.flush();
  });

  bench('medium chunk (250B)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    s.write(mediumChunk);
    s.flush();
  });

  bench('XSS payload (200B)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    s.write(xssChunk);
    s.flush();
  });

  bench('large chunk (12KB)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    s.write(largeChunk);
    s.flush();
  });

  bench('streaming simulation (100 chunks)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    for (let i = 0; i < 100; i++) {
      s.write(smallChunk);
    }
    s.flush();
  });

  bench('chunked XSS (split mid-tag)', () => {
    const s = createStreamSanitizer(presets.llmChat);
    s.write('<p>safe</p><scr');
    s.write('ipt>alert(1)</sc');
    s.write('ript><p>end</p>');
    s.flush();
  });
});
