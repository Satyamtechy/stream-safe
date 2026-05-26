import type { Attribute, Token } from "./types";

enum State {
  TEXT = 0,
  TAG_OPEN = 1,
  TAG_NAME = 2,
  TAG_CLOSE = 3,
  IN_ATTRIBUTE = 4,
  ATTR_VALUE = 5,
  IN_COMMENT = 6,
  IN_DANGEROUS = 7,
}

const DANGEROUS_TAGS = new Set(["script", "style", "xmp", "plaintext"]);

export class IncrementalTokenizer {
  private state: State = State.TEXT;
  private buffer = "";
  private tagName = "";
  private attributes: Attribute[] = [];
  private attrName = "";
  private attrValue = "";
  private quoteChar = "";
  private selfClosing = false;
  private dangerousTag = "";
  private commentBuffer = "";

  write(chunk: string): Token[] {
    const tokens: Token[] = [];
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      switch (this.state) {
        case State.TEXT:
          if (ch === "<") {
            if (this.buffer) {
              tokens.push({ type: "text", value: this.buffer });
              this.buffer = "";
            }
            this.state = State.TAG_OPEN;
            this.tagName = "";
            this.attributes = [];
            this.selfClosing = false;
          } else {
            this.buffer += ch;
          }
          break;

        case State.TAG_OPEN:
          if (ch === "/") {
            this.state = State.TAG_CLOSE;
            this.tagName = "";
          } else if (ch === "!") {
            // Could be comment, check next chars
            if (chunk[i + 1] === "-" && chunk[i + 2] === "-") {
              this.state = State.IN_COMMENT;
              this.commentBuffer = "";
              i += 2; // skip --
            } else {
              // Treat as text (doctype etc)
              this.buffer = `<!${chunk[i + 1] || ""}`;
              this.state = State.TEXT;
            }
          } else if (ch === ">" || ch === " ") {
            // Malformed `< >` or `<>`, treat as text
            this.buffer = `<${ch}`;
            this.state = State.TEXT;
          } else {
            this.tagName = ch;
            this.state = State.TAG_NAME;
          }
          break;

        case State.TAG_NAME:
          if (ch === ">") {
            this.emitOpenTag(tokens);
            if (this.state !== State.IN_DANGEROUS) this.state = State.TEXT;
          } else if (ch === "/" && this.peek(chunk, i + 1) === ">") {
            this.selfClosing = true;
            // Don't advance; next iteration will see '>' but we handle it now
          } else if (ch === ">" && this.selfClosing) {
            this.emitOpenTag(tokens);
            if (this.state !== State.IN_DANGEROUS) this.state = State.TEXT;
          } else if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
            this.state = State.IN_ATTRIBUTE;
            this.attrName = "";
            this.attrValue = "";
          } else if (ch === "/") {
            this.selfClosing = true;
          } else {
            this.tagName += ch;
          }
          break;

        case State.TAG_CLOSE:
          if (ch === ">") {
            tokens.push({
              type: "closeTag",
              tagName: this.tagName.toLowerCase(),
            });
            this.state = State.TEXT;
          } else if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") {
            this.tagName += ch;
          }
          break;

        case State.IN_ATTRIBUTE:
          if (ch === ">") {
            this.pushAttr();
            this.emitOpenTag(tokens);
            if (this.state !== State.IN_DANGEROUS) this.state = State.TEXT;
          } else if (ch === "/") {
            this.selfClosing = true;
          } else if (ch === "=") {
            // Move to reading value
            this.state = State.ATTR_VALUE;
            this.attrValue = "";
            this.quoteChar = "";
          } else if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
            if (this.attrName) {
              // Could be a valueless attr or space before =
              // Peek ahead to see if next non-space is =
              const rest = chunk.slice(i + 1);
              const nextNonSpace = rest.match(/^\s*(.)/);
              if (nextNonSpace && nextNonSpace[1] === "=") {
                // Space before =, keep accumulating
              } else {
                // Valueless attribute
                this.pushAttr();
              }
            }
          } else {
            this.attrName += ch;
          }
          break;

        case State.ATTR_VALUE:
          if (!this.quoteChar && !this.attrValue) {
            // First char of value
            if (ch === '"' || ch === "'") {
              this.quoteChar = ch;
            } else if (ch === ">") {
              // Empty value attr like `attr=>`
              this.pushAttr();
              this.emitOpenTag(tokens);
              if (this.state !== State.IN_DANGEROUS) this.state = State.TEXT;
            } else {
              // Unquoted value
              this.attrValue = ch;
            }
          } else if (this.quoteChar) {
            if (ch === this.quoteChar) {
              this.pushAttr();
              this.state = State.IN_ATTRIBUTE;
              this.attrName = "";
            } else {
              this.attrValue += ch;
            }
          } else {
            // Unquoted value - ends on space or >
            if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
              this.pushAttr();
              this.state = State.IN_ATTRIBUTE;
              this.attrName = "";
            } else if (ch === ">") {
              this.pushAttr();
              this.emitOpenTag(tokens);
              if (this.state !== State.IN_DANGEROUS) this.state = State.TEXT;
            } else if (ch === "/") {
              const next = this.peek(chunk, i + 1);
              if (next === ">") {
                this.pushAttr();
                this.selfClosing = true;
              } else {
                this.attrValue += ch;
              }
            } else {
              this.attrValue += ch;
            }
          }
          break;

        case State.IN_COMMENT:
          this.commentBuffer += ch;
          if (this.commentBuffer.endsWith("-->")) {
            tokens.push({
              type: "comment",
              value: this.commentBuffer.slice(0, -3),
            });
            this.commentBuffer = "";
            this.state = State.TEXT;
          }
          break;

        case State.IN_DANGEROUS: {
          this.buffer += ch;
          const closeTag = `</${this.dangerousTag}>`;
          if (this.buffer.toLowerCase().endsWith(closeTag)) {
            const content = this.buffer.slice(0, -closeTag.length);
            tokens.push({
              type: "dangerousContent",
              tagName: this.dangerousTag,
              value: content,
            });
            this.buffer = "";
            this.dangerousTag = "";
            this.state = State.TEXT;
          }
          break;
        }
      }
    }

    // Emit any accumulated text
    if (this.state === State.TEXT && this.buffer) {
      tokens.push({ type: "text", value: this.buffer });
      this.buffer = "";
    }

    return tokens;
  }

  flush(): Token[] {
    const tokens: Token[] = [];

    switch (this.state) {
      case State.TEXT:
        if (this.buffer) {
          tokens.push({ type: "text", value: this.buffer });
        }
        break;
      case State.TAG_OPEN:
        tokens.push({ type: "text", value: "<" });
        break;
      case State.TAG_NAME:
      case State.IN_ATTRIBUTE:
      case State.ATTR_VALUE:
        // Incomplete tag, emit as text
        tokens.push({ type: "text", value: this.reconstructTag() });
        break;
      case State.TAG_CLOSE:
        tokens.push({ type: "text", value: `</${this.tagName}` });
        break;
      case State.IN_COMMENT:
        tokens.push({ type: "comment", value: this.commentBuffer });
        break;
      case State.IN_DANGEROUS:
        tokens.push({
          type: "dangerousContent",
          tagName: this.dangerousTag,
          value: this.buffer,
        });
        break;
    }

    this.reset();
    return tokens;
  }

  private emitOpenTag(tokens: Token[]): void {
    const name = this.tagName.toLowerCase();
    if (DANGEROUS_TAGS.has(name) && !this.selfClosing) {
      tokens.push({
        type: "openTag",
        tagName: name,
        attributes: this.attributes,
        selfClosing: false,
      });
      this.dangerousTag = name;
      this.buffer = "";
      this.state = State.IN_DANGEROUS;
    } else {
      tokens.push({
        type: "openTag",
        tagName: name,
        attributes: this.attributes,
        selfClosing: this.selfClosing,
      });
    }
    this.attributes = [];
    this.tagName = "";
    this.selfClosing = false;
  }

  private pushAttr(): void {
    if (this.attrName) {
      this.attributes.push({
        name: this.attrName.toLowerCase(),
        value: this.attrValue,
      });
      this.attrName = "";
      this.attrValue = "";
    }
  }

  private peek(chunk: string, index: number): string {
    return index < chunk.length ? chunk[index] : "";
  }

  private reconstructTag(): string {
    let tag = `<${this.tagName}`;
    for (const attr of this.attributes) {
      tag += ` ${attr.name}`;
      if (attr.value) tag += `="${attr.value}"`;
    }
    if (this.attrName) {
      tag += ` ${this.attrName}`;
      if (this.attrValue) tag += `="${this.attrValue}"`;
    }
    return tag;
  }

  private reset(): void {
    this.state = State.TEXT;
    this.buffer = "";
    this.tagName = "";
    this.attributes = [];
    this.attrName = "";
    this.attrValue = "";
    this.quoteChar = "";
    this.selfClosing = false;
    this.dangerousTag = "";
    this.commentBuffer = "";
  }
}
