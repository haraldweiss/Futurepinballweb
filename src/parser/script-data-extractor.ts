/**
 * script-data-extractor.ts — Extract event bindings, scoring rules, triggers from VBScript
 * Parse game logic from script code
 */

import { EventBinding, ScoringRule } from './enhanced-fpt-types';

// ─── Patterns for VBScript Parsing ────────────────────────────────────────
const FUNCTION_PATTERN = /Sub\s+(\w+)\s*\(\s*(.*?)\s*\)/gi;
const SCORE_PATTERN = /AddScore\s*\(\s*(\d+)\s*\)/gi;
const IF_PATTERN = /If\s+(.+?)\s+Then/gi;
const MULTIBALL_PATTERN = /multiball|multi.?ball|mb/gi;
const EXTRA_BALL_PATTERN = /extra.?ball|xball|eb/gi;

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract event bindings from VBScript code
 */
export function extractEventBindings(vbsCode: string): EventBinding[] {
  const bindings: EventBinding[] = [];

  if (!vbsCode || vbsCode.length === 0) return bindings;

  // Parse all function definitions
  let match;
  const functionRegex = /Sub\s+(\w+)\s*\(\s*(.*?)\s*\)/gi;

  while ((match = functionRegex.exec(vbsCode)) !== null) {
    const functionName = match[1];
    const parameters = match[2];

    // Determine event type from function name
    const eventType = extractEventTypeFromName(functionName);
    if (!eventType) continue;

    // Extract element ID
    const elementId = extractElementIdFromFunctionName(functionName);

    const binding: EventBinding = {
      elementId: elementId || 'unknown',
      eventType: eventType,
      scriptFunction: functionName,
      params: parseParameters(parameters),
      priority: eventType === 'hit' ? 10 : 5,
    };

    bindings.push(binding);
  }

  return bindings;
}

/**
 * Extract scoring rules from VBScript
 */
export function extractScoringRules(vbsCode: string): ScoringRule[] {
  const rules: ScoringRule[] = [];

  if (!vbsCode || vbsCode.length === 0) return rules;

  // Find all AddScore calls
  let match;
  const scoreRegex = /Sub\s+(\w+).*?AddScore\s*\(\s*(\d+)\s*\)/gis;

  while ((match = scoreRegex.exec(vbsCode)) !== null) {
    const functionName = match[1];
    const scoreValue = parseInt(match[2]);

    const rule: ScoringRule = {
      ruleName: functionName,
      triggerElement: extractElementIdFromFunctionName(functionName) || functionName,
      baseScore: scoreValue,
      multipliers: extractMultiplierLogic(vbsCode, functionName),
      specialEffects: extractSpecialEffects(vbsCode, functionName),
    };

    rules.push(rule);
  }

  return rules;
}

/**
 * Extract trigger conditions from VBScript
 */
export function extractTriggerConditions(vbsCode: string): TriggerCondition[] {
  const conditions: TriggerCondition[] = [];

  if (!vbsCode || vbsCode.length === 0) return conditions;

  // Find If statements
  let match;
  const ifRegex = /If\s+(.+?)\s+Then\s+(.+?)(?:Else|End If)/gis;

  while ((match = ifRegex.exec(vbsCode)) !== null) {
    const condition = match[1].trim();
    const action = match[2].trim();

    const trigger: TriggerCondition = {
      condition,
      action,
      type: parseTriggerType(condition),
      threshold: extractThresholdValue(condition),
    };

    conditions.push(trigger);
  }

  return conditions;
}

interface TriggerCondition {
  condition: string;
  action: string;
  type: string;
  threshold?: number;
}

/**
 * Extract animation trigger associations
 */
export function extractAnimationTriggers(vbsCode: string): Map<string, string[]> {
  const animTriggers = new Map<string, string[]>();

  if (!vbsCode || vbsCode.length === 0) return animTriggers;

  // Look for BAM animation references
  const bamRegex = /xBAM\.PlayAnimation\s*\(\s*"?(\w+)"?\s*\)/gi;
  let match;

  while ((match = bamRegex.exec(vbsCode)) !== null) {
    const animationName = match[1];

    // Find the function containing this call
    const functionMatch = vbsCode.substring(0, match.index).lastIndexOf('Sub');
    const functionNameMatch = vbsCode.substring(functionMatch, match.index).match(/Sub\s+(\w+)/);

    if (functionNameMatch) {
      const functionName = functionNameMatch[1];
      const eventType = extractEventTypeFromName(functionName);

      if (!animTriggers.has(animationName)) {
        animTriggers.set(animationName, []);
      }

      if (eventType) {
        animTriggers.get(animationName)!.push(eventType);
      }
    }
  }

  return animTriggers;
}

// ─── Helper Functions ────────────────────────────────────────────────────

/**
 * Determine event type from VBScript function name
 */
function extractEventTypeFromName(
  functionName: string
): 'hit' | 'enter' | 'exit' | 'active' | 'inactive' | 'drain' | 'launch' | 'collision' | null {
  const lower = functionName.toLowerCase();

  if (lower.includes('_hit') || lower.endsWith('hit')) return 'hit';
  if (lower.includes('_enter') || lower.endsWith('enter')) return 'enter';
  if (lower.includes('_exit') || lower.endsWith('exit')) return 'exit';
  if (lower.includes('_active') || lower.endsWith('active')) return 'active';
  if (lower.includes('_inactive') || lower.endsWith('inactive')) return 'inactive';
  if (lower.includes('drain')) return 'drain';
  if (lower.includes('launch')) return 'launch';

  return null;
}

/**
 * Extract element ID from VBScript function name
 */
function extractElementIdFromFunctionName(functionName: string): string | null {
  // Pattern: ElementType1_Hit, Bumper2_Hit, etc.
  const match = functionName.match(/([A-Za-z]+)(\d+)/);
  if (match) {
    return `element_${match[2]}`;
  }

  return null;
}

/**
 * Parse function parameters
 */
function parseParameters(paramString: string): Record<string, any> | undefined {
  if (!paramString || paramString.length === 0) return undefined;

  const params: Record<string, any> = {};
  const parts = paramString.split(',').map(p => p.trim());

  for (const part of parts) {
    const [name, value] = part.split('=').map(p => p.trim());
    params[name] = value || true;
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extract multiplier logic from script
 */
function extractMultiplierLogic(vbsCode: string, functionName: string): Record<string, number> {
  const multipliers: Record<string, any> = {};

  // Find the function
  const funcRegex = new RegExp(`Sub\\s+${functionName}\\s*\\([^)]*\\)([^E]*?)End Sub`, 'i');
  const funcMatch = vbsCode.match(funcRegex);

  if (!funcMatch) return multipliers;

  const funcBody = funcMatch[1];

  // Look for multiplier references
  if (funcBody.toLowerCase().includes('multiplier')) {
    multipliers.comboChain = 1.5; // Default combo multiplier
  }

  if (funcBody.toLowerCase().includes('ballcount') || funcBody.toLowerCase().includes('ball_count')) {
    multipliers.ballCount = 1.1;
  }

  if (funcBody.toLowerCase().includes('progress')) {
    multipliers.progressiveLevel = 1.25;
  }

  return multipliers;
}

/**
 * Extract special effects (multiball, extra ball, etc.)
 */
function extractSpecialEffects(vbsCode: string, functionName: string): string[] {
  const effects: string[] = [];

  // Find the function
  const funcRegex = new RegExp(`Sub\\s+${functionName}\\s*\\([^)]*\\)([^E]*?)End Sub`, 'i');
  const funcMatch = vbsCode.match(funcRegex);

  if (!funcMatch) return effects;

  const funcBody = funcMatch[1];

  if (MULTIBALL_PATTERN.test(funcBody)) effects.push('multiball');
  if (EXTRA_BALL_PATTERN.test(funcBody)) effects.push('extra-ball');
  if (funcBody.toLowerCase().includes('jackpot')) effects.push('jackpot');
  if (funcBody.toLowerCase().includes('mode')) effects.push('mode-start');

  return effects;
}

/**
 * Parse trigger type from condition string
 */
function parseTriggerType(condition: string): string {
  const lower = condition.toLowerCase();

  if (lower.includes('count') || lower.includes('==')) return 'equality';
  if (lower.includes('>')) return 'greater-than';
  if (lower.includes('<')) return 'less-than';
  if (lower.includes('and')) return 'and';
  if (lower.includes('or')) return 'or';

  return 'generic';
}

/**
 * Extract threshold value from condition
 */
function extractThresholdValue(condition: string): number | undefined {
  const match = condition.match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * Validate extracted event bindings
 */
export function validateEventBindings(bindings: EventBinding[]): {
  valid: number;
  invalid: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = 0;
  let invalid = 0;

  for (const binding of bindings) {
    const errors: string[] = [];

    if (!binding.elementId || binding.elementId === 'unknown') {
      errors.push('Unknown element ID');
    }

    if (!binding.eventType) {
      errors.push('Unknown event type');
    }

    if (!binding.scriptFunction) {
      errors.push('No script function');
    }

    if (errors.length > 0) {
      invalid++;
      warnings.push(`Binding ${binding.scriptFunction}: ${errors.join('; ')}`);
    } else {
      valid++;
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Generate script extraction summary
 */
export function summarizeScriptExtraction(
  bindings: EventBinding[],
  rules: ScoringRule[],
  conditions: TriggerCondition[]
): string {
  return `
Script Extraction Summary:
  Event Bindings: ${bindings.length}
  Scoring Rules: ${rules.length}
  Trigger Conditions: ${conditions.length}

Event Types Distribution:
  Hit: ${bindings.filter(b => b.eventType === 'hit').length}
  Enter/Exit: ${bindings.filter(b => ['enter', 'exit'].includes(b.eventType)).length}
  Active/Inactive: ${bindings.filter(b => ['active', 'inactive'].includes(b.eventType)).length}
  Other: ${bindings.filter(b => !['hit', 'enter', 'exit', 'active', 'inactive'].includes(b.eventType)).length}
`.trim();
}
