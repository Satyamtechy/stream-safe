import { describe, it, expect } from 'vitest';
import { createStreamSanitizer, presets } from '../src/index';

describe('createStreamSanitizer', () => {
  // Basic functionality
  it('passes through plain text unchanged', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('Hello world') + sanitizer.flush();
    expect(result).toBe('Hello world');
  });

  it('allows safe tags from preset', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<p>Hello <strong>world</strong></p>') + sanitizer.flush();
    expect(result).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips disallowed tags', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<div>text</div>') + sanitizer.flush();
    expect(result).not.toContain('<div');
    expect(result).toContain('text');
  });

  it('strips script tags entirely', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<script>alert(1)</script>') + sanitizer.flush();
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('strips event handler attributes', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<p onclick="alert(1)">text</p>') + sanitizer.flush();
    expect(result).not.toContain('onclick');
    expect(result).toContain('<p>');
    expect(result).toContain('text');
  });

  it('strips javascript: URLs', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<a href="javascript:alert(1)">click</a>') + sanitizer.flush();
    expect(result).not.toContain('javascript:');
    expect(result).toContain('click');
  });

  it('allows safe href URLs', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<a href="https://example.com">link</a>') + sanitizer.flush();
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('link');
  });

  it('closes unclosed tags on flush', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<p>Hello <strong>world') + sanitizer.flush();
    expect(result).toContain('</strong>');
    expect(result).toContain('</p>');
  });

  it('handles self-closing tags like br and img', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<br><img src="x.png" />') + sanitizer.flush();
    expect(result).toContain('<br');
    expect(result).toContain('<img');
    expect(result).toContain('src="x.png"');
  });

  // Streaming edge cases
  it('handles tag split across chunks: <str + ong>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<str') + sanitizer.write('ong>text</strong>') + sanitizer.flush();
    expect(result).toContain('<strong>');
    expect(result).toContain('text');
  });

  it('handles attribute split across chunks', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<a hre') + sanitizer.write('f="https://x.com">link</a>') + sanitizer.flush();
    expect(result).toContain('href="https://x.com"');
    expect(result).toContain('link');
  });

  it('handles script tag split: <scr + ipt>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<scr') + sanitizer.write('ipt>alert(1)</script>') + sanitizer.flush();
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('handles closing tag split: </str + ong>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<strong>text</str') + sanitizer.write('ong>') + sanitizer.flush();
    expect(result).toContain('<strong>');
    expect(result).toContain('text');
    expect(result).toContain('</strong>');
  });

  it('handles multiple chunks producing same result as single string', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const singleSanitizer = createStreamSanitizer(presets.llmChat);
    const singleResult = singleSanitizer.write(input) + singleSanitizer.flush();

    const multiSanitizer = createStreamSanitizer(presets.llmChat);
    const multiResult =
      multiSanitizer.write('<p>Hel') +
      multiSanitizer.write('lo <str') +
      multiSanitizer.write('ong>world</s') +
      multiSanitizer.write('trong></p>') +
      multiSanitizer.flush();

    expect(multiResult).toBe(singleResult);
  });

  it('handles empty chunks', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result =
      sanitizer.write('') +
      sanitizer.write('<p>text</p>') +
      sanitizer.write('') +
      sanitizer.flush();
    expect(result).toBe('<p>text</p>');
  });

  it('handles chunk that is just <', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<') + sanitizer.write('p>text</p>') + sanitizer.flush();
    expect(result).toContain('<p>');
    expect(result).toContain('text');
  });

  // Security
  it('blocks <script>alert(1)</script>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<script>alert(1)</script>') + sanitizer.flush();
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
  });

  it('blocks <img onerror=alert(1)>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<img onerror=alert(1)>') + sanitizer.flush();
    expect(result).not.toContain('onerror');
  });

  it('blocks <a href="javascript:alert(1)">', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<a href="javascript:alert(1)">x</a>') + sanitizer.flush();
    expect(result).not.toContain('javascript:');
  });

  it('blocks <iframe src="evil.com">', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<iframe src="evil.com"></iframe>') + sanitizer.flush();
    expect(result).not.toContain('<iframe');
  });

  it('blocks <div onmouseover="alert(1)">', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<div onmouseover="alert(1)">text</div>') + sanitizer.flush();
    expect(result).not.toContain('onmouseover');
  });

  it('blocks <style>body{background:url(javascript:)}</style>', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<style>body{background:url(javascript:)}</style>') + sanitizer.flush();
    expect(result).not.toContain('<style');
    expect(result).not.toContain('javascript:');
  });

  it('blocks nested script in allowed tag', () => {
    const sanitizer = createStreamSanitizer(presets.llmChat);
    const result = sanitizer.write('<p><script>alert(1)</script></p>') + sanitizer.flush();
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>');
  });

  it('enforces max depth', () => {
    const sanitizer = createStreamSanitizer({ ...presets.llmChat, maxDepth: 3 });
    const deep = '<p><strong><em><code>deep</code></em></strong></p>';
    const result = sanitizer.write(deep) + sanitizer.flush();
    expect(result).not.toContain('<code>');
  });

  it('strips oversized attributes', () => {
    const sanitizer = createStreamSanitizer({ ...presets.llmChat, maxAttributeLength: 10 });
    const longAttr = 'a'.repeat(100);
    const result = sanitizer.write(`<a href="${longAttr}">link</a>`) + sanitizer.flush();
    expect(result).not.toContain(longAttr);
  });
});
