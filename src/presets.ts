import type { SanitizerOptions } from './types';

export const llmChat: SanitizerOptions = {
  allowedTags: ['p', 'b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'span', 'del', 'sup', 'sub', 'kbd', 'mark'],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'title'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan', 'scope'],
    'code': ['class'],
    'pre': ['class'],
    'span': ['class'],
    '*': ['id']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  stripDisallowed: true,
  maxDepth: 50,
  maxAttributeLength: 2048,
};

export const richText: SanitizerOptions = {
  allowedTags: [...(llmChat.allowedTags || []), 'div', 'section', 'article', 'header', 'footer', 'nav', 'figure', 'figcaption', 'details', 'summary', 'abbr', 'cite', 'dfn', 'time', 'address', 'dl', 'dt', 'dd', 'caption', 'colgroup', 'col', 'video', 'audio', 'source', 'picture'],
  allowedAttributes: {
    ...llmChat.allowedAttributes,
    'video': ['src', 'controls', 'width', 'height', 'poster'],
    'audio': ['src', 'controls'],
    'source': ['src', 'type'],
    'time': ['datetime'],
    'div': ['class', 'id'],
    'section': ['class', 'id'],
    '*': ['id', 'class', 'lang', 'dir']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  stripDisallowed: true,
  maxDepth: 100,
  maxAttributeLength: 4096,
};

export const textOnly: SanitizerOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  stripDisallowed: true,
  maxDepth: 0,
  maxAttributeLength: 0,
};

export const presets = { llmChat, richText, textOnly } as const;
