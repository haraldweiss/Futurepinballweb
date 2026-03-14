/**
 * HTML Security Utilities
 * Prevent XSS attacks by escaping user-controlled content
 *
 * Phase: Security Remediation Phase 1
 * Priority: CRITICAL
 */

/**
 * HTML special character escape map
 */
const HTML_ESCAPE_MAP: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape HTML special characters to prevent XSS
 * Safe for use in innerHTML, attributes, and text context
 *
 * @param text Raw text that might contain HTML entities
 * @returns Safe HTML-escaped string
 *
 * @example
 * escapeHtml('<img onerror="alert(1)">')
 * // → '&lt;img onerror=&quot;alert(1)&quot;&gt;'
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  if (typeof text !== 'string') {
    console.warn('[HTML Escape] Non-string input:', text);
    return String(text);
  }

  return text.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitize user input for safe display
 * Removes potentially dangerous characters from file names
 *
 * @param fileName Raw file name from user input
 * @returns Sanitized file name
 *
 * @example
 * sanitizeFileName('my<script>.fpt') → 'my_script_.fpt'
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file';

  return fileName
    .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '_')  // Replace invalid chars
    .replace(/\.+$/, '')                       // Remove trailing dots
    .slice(0, 255)                             // Limit length (filesystem limit)
    .trim();
}

/**
 * Create safe HTML from template with escaped placeholders
 * Use this to safely insert user data into HTML templates
 *
 * @param template HTML template with {{placeholder}} markers
 * @param data Object with { placeholder: value } pairs
 * @returns Safe HTML string with escaped values
 *
 * @example
 * createSafeHtml(
 *   '<h3>{{name}}</h3><span>{{size}}</span>',
 *   { name: 'Test<img>.fpt', size: '5.2' }
 * )
 * // → '<h3>Test&lt;img&gt;.fpt</h3><span>5.2</span>'
 */
export function createSafeHtml(
  template: string,
  data: { [key: string]: string | number }
): string {
  if (!template) return '';

  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    const escapedValue = escapeHtml(String(value));
    result = result.replace(placeholder, escapedValue);
  }

  return result;
}

/**
 * Set element innerHTML safely from template
 * Preferred over direct innerHTML assignment for user-controlled data
 *
 * @param element DOM element to update
 * @param template HTML template (trusted) with {{placeholder}} markers
 * @param data User data to be escaped and inserted
 *
 * @example
 * setInnerHTMLSafe(
 *   element,
 *   '<h3>{{filename}}</h3>',
 *   { filename: userFileName }
 * )
 */
export function setInnerHTMLSafe(
  element: HTMLElement,
  template: string,
  data?: { [key: string]: string | number }
): void {
  if (!element) {
    console.error('[HTML Escape] No element provided');
    return;
  }

  try {
    element.innerHTML = data ? createSafeHtml(template, data) : template;
  } catch (e) {
    console.error('[HTML Escape] Failed to set innerHTML:', e);
    element.textContent = template;
  }
}

/**
 * Set element text content (never interprets HTML)
 * Use this for all pure text content
 *
 * @param element DOM element to update
 * @param text Text content (always safe, no HTML)
 *
 * @example
 * setTextContent(element, 'File: ' + userFileName)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  if (!element) {
    console.error('[HTML Escape] No element provided');
    return;
  }

  try {
    element.textContent = text;
  } catch (e) {
    console.error('[HTML Escape] Failed to set textContent:', e);
  }
}

/**
 * Escape attributes to prevent attribute injection
 * Use when inserting user data into HTML attributes
 *
 * @param value User data for attribute
 * @returns Escaped value safe for attributes
 *
 * @example
 * `<div title="${escapeAttribute(userInput)}">...</div>`
 */
export function escapeAttribute(value: string): string {
  if (!value) return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate that a string contains only safe characters
 * Useful for pre-validation before display
 *
 * @param text Text to validate
 * @returns true if text is safe, false if contains dangerous patterns
 *
 * @example
 * if (!isSafeText(userInput)) {
 *   userInput = sanitizeFileName(userInput);
 * }
 */
export function isSafeText(text: string): boolean {
  if (!text) return true;

  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /on\w+\s*=/i,           // onerror=, onclick=, etc.
    /javascript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i,     // CSS expression()
  ];

  return !dangerousPatterns.some(pattern => pattern.test(text));
}

/**
 * Create a safe data URI (for images, etc.)
 * Validates that the URI is actually data: and not javascript:
 *
 * @param dataUri User-provided data URI
 * @returns Validated data URI or empty string
 *
 * @example
 * img.src = createSafeDataURI(userDataURI)
 */
export function createSafeDataURI(dataUri: string): string {
  if (!dataUri) return '';

  // Only allow data: URIs, not javascript: or other schemes
  if (dataUri.startsWith('data:')) {
    return dataUri;
  }

  console.warn('[HTML Escape] Attempted to use non-data URI:', dataUri);
  return '';
}

/**
 * Log security event (for monitoring/debugging)
 * @internal
 */
export function logSecurityEvent(event: string, details: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security Event] ${event}`, details);
  }
}

/**
 * Get statistics on HTML escape usage (for testing)
 * @internal
 */
let escapingStats = {
  htmlEscaped: 0,
  attributeEscaped: 0,
  sanitized: 0,
  unsafeAttempts: 0,
};

export function recordEscape(type: 'html' | 'attribute' | 'sanitize' | 'unsafe'): void {
  if (process.env.NODE_ENV === 'development') {
    switch (type) {
      case 'html': escapingStats.htmlEscaped++; break;
      case 'attribute': escapingStats.attributeEscaped++; break;
      case 'sanitize': escapingStats.sanitized++; break;
      case 'unsafe': escapingStats.unsafeAttempts++; break;
    }
  }
}

export function getEscapingStats() {
  return { ...escapingStats };
}

export function resetEscapingStats(): void {
  escapingStats = { htmlEscaped: 0, attributeEscaped: 0, sanitized: 0, unsafeAttempts: 0 };
}
