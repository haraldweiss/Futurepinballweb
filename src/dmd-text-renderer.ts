/**
 * dmd-text-renderer.ts — Intelligent DMD Text Rendering
 *
 * Automatically scales and fits text within DMD display constraints:
 * - Standard DMD: 128x32 pixels
 * - Dynamically adjusts font size based on text length and available space
 * - Supports multi-line text with intelligent wrapping
 * - Respects character spacing and proportional scaling
 */

/**
 * DMD Text Layout Configuration
 */
export interface DMDTextLayout {
  lines: DMDTextLine[];
  totalHeight: number;
  maxWidth: number;
}

export interface DMDTextLine {
  text: string;
  fontSize: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * DMD Text Renderer - Calculates optimal text sizing and positioning
 */
export class DMDTextRenderer {
  /** Standard DMD dimensions in pixels */
  readonly DMD_WIDTH = 128;
  readonly DMD_HEIGHT = 32;

  /** Padding from edges (pixels at 1x scale) */
  readonly PADDING_X = 2;
  readonly PADDING_Y = 2;

  /** Character aspect ratio (monospace font) */
  readonly CHAR_ASPECT_RATIO = 0.6;  // Average monospace char is 60% as wide as tall

  /** Minimum font size to avoid illegibility */
  readonly MIN_FONT_SIZE = 4;

  /** Maximum font size to avoid overflow */
  readonly MAX_FONT_SIZE = 24;

  /**
   * Calculate optimal font size for text to fit in DMD
   * @param text Text to fit
   * @param availableWidth Width available in pixels (at 1x scale)
   * @param availableHeight Height available in pixels (at 1x scale)
   * @param maxLines Maximum number of lines (default 1)
   * @returns Font size in pixels (before DMD_SCALE multiplication)
   */
  calculateOptimalFontSize(
    text: string,
    availableWidth: number = this.DMD_WIDTH - this.PADDING_X * 2,
    availableHeight: number = this.DMD_HEIGHT - this.PADDING_Y * 2,
    maxLines: number = 1
  ): number {
    // Start with a reasonable base size
    let fontSize = this.MAX_FONT_SIZE;

    // If multiple lines possible, try to fit across available height first
    if (maxLines > 1) {
      // Each line gets equal height
      const lineHeight = Math.floor(availableHeight / maxLines);
      fontSize = Math.min(fontSize, Math.floor(lineHeight * 0.9));  // 90% of line height
    }

    // Now calculate based on width
    // Average monospace character width ≈ font size * char aspect ratio
    const avgCharWidth = fontSize * this.CHAR_ASPECT_RATIO;
    const charsPerLine = Math.floor(availableWidth / avgCharWidth);

    // Calculate longest line needed
    const lines = this.wrapText(text, charsPerLine, maxLines);
    const longestLineLength = Math.max(...lines.map(line => line.length));

    // Reduce font size if text doesn't fit
    while (fontSize > this.MIN_FONT_SIZE) {
      const charWidth = fontSize * this.CHAR_ASPECT_RATIO;
      const maxChars = Math.floor(availableWidth / charWidth);

      if (longestLineLength <= maxChars) {
        break;
      }

      fontSize -= 1;
    }

    return Math.max(this.MIN_FONT_SIZE, fontSize);
  }

  /**
   * Wrap text to fit within character limit per line
   * @param text Text to wrap
   * @param charsPerLine Maximum characters per line
   * @param maxLines Maximum number of lines
   * @returns Array of wrapped text lines
   */
  wrapText(
    text: string,
    charsPerLine: number,
    maxLines: number = 1
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      // If word alone exceeds char limit, force split it
      if (word.length > charsPerLine) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        // Split long word into chunks
        for (let i = 0; i < word.length; i += charsPerLine) {
          if (lines.length >= maxLines) {
            return lines;
          }
          lines.push(word.substring(i, i + charsPerLine));
        }
        continue;
      }

      // Try to add word to current line
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= charsPerLine) {
        currentLine = testLine;
      } else {
        // Start new line
        if (currentLine) {
          lines.push(currentLine);
          if (lines.length >= maxLines) {
            return lines;
          }
        }
        currentLine = word;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Calculate layout for text in DMD
   * @param text Text to layout
   * @param dmdScale DMD scale factor (1-6+)
   * @param options Layout options
   * @returns DMD text layout with positioned lines
   */
  calculateLayout(
    text: string,
    dmdScale: number = 1,
    options?: {
      alignment?: 'left' | 'center' | 'right';
      verticalAlignment?: 'top' | 'middle' | 'bottom';
      maxLines?: number;
      availableWidth?: number;
      availableHeight?: number;
    }
  ): DMDTextLayout {
    const opts = {
      alignment: 'center' as const,
      verticalAlignment: 'middle' as const,
      maxLines: 2,
      availableWidth: this.DMD_WIDTH - this.PADDING_X * 2,
      availableHeight: this.DMD_HEIGHT - this.PADDING_Y * 2,
      ...options
    };

    // Calculate optimal font size
    const fontSize = this.calculateOptimalFontSize(
      text,
      opts.availableWidth,
      opts.availableHeight,
      opts.maxLines
    );

    // Wrap text
    const charsPerLine = Math.floor(opts.availableWidth / (fontSize * this.CHAR_ASPECT_RATIO));
    const lines = this.wrapText(text, charsPerLine, opts.maxLines);

    // Calculate layout for each line
    const lineHeight = fontSize * 1.2;  // Add 20% line spacing
    const totalHeight = lines.length * lineHeight;

    // Calculate vertical starting position
    let startY = this.PADDING_Y;
    if (opts.verticalAlignment === 'middle') {
      startY = Math.max(this.PADDING_Y, (this.DMD_HEIGHT - totalHeight) / 2);
    } else if (opts.verticalAlignment === 'bottom') {
      startY = Math.max(this.PADDING_Y, this.DMD_HEIGHT - totalHeight - this.PADDING_Y);
    }

    // Calculate horizontal positioning for each line
    const layoutLines: DMDTextLine[] = lines.map((line, index) => {
      const charWidth = fontSize * this.CHAR_ASPECT_RATIO;
      const lineWidth = line.length * charWidth;

      let x = this.PADDING_X;
      if (opts.alignment === 'center') {
        x = (this.DMD_WIDTH - lineWidth) / 2;
      } else if (opts.alignment === 'right') {
        x = this.DMD_WIDTH - lineWidth - this.PADDING_X;
      }

      return {
        text: line,
        fontSize,
        x: Math.max(this.PADDING_X, x),
        y: startY + index * lineHeight,
        width: lineWidth,
        height: fontSize
      };
    });

    return {
      lines: layoutLines,
      totalHeight,
      maxWidth: Math.max(...layoutLines.map(l => l.width))
    };
  }

  /**
   * Calculate text metrics for a given string
   * @param text Text to measure
   * @param fontSize Font size in pixels (before DMD_SCALE)
   * @returns Text metrics (width, height)
   */
  calculateTextMetrics(text: string, fontSize: number): { width: number; height: number } {
    const charWidth = fontSize * this.CHAR_ASPECT_RATIO;
    return {
      width: text.length * charWidth,
      height: fontSize
    };
  }

  /**
   * Get recommended font size for a text line to fit exactly in available space
   * @param text Text to fit
   * @param availableWidth Available width in pixels
   * @returns Font size that makes text fit exactly
   */
  getExactFitFontSize(text: string, availableWidth: number): number {
    if (text.length === 0) return this.MAX_FONT_SIZE;

    // Calculate font size where text exactly fits
    const fontSize = (availableWidth / text.length) / this.CHAR_ASPECT_RATIO;
    return Math.max(this.MIN_FONT_SIZE, Math.min(this.MAX_FONT_SIZE, fontSize));
  }
}

// Export singleton instance
export const dmdTextRenderer = new DMDTextRenderer();
