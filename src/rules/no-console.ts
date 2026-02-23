// src/rules/no-console.ts
import type { Rule } from './types.js';

const CONSOLE_METHODS = new Set(['log', 'warn', 'error', 'debug', 'info', 'table', 'dir']);

/**
 * Flags any console.* call left in component code.
 * Severity: warning — console calls are usually debug artifacts, not crashes.
 */
export const noConsole: Rule = (node) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object?.name === 'console' &&
    CONSOLE_METHODS.has(node.callee.property?.name)
  ) {
    const method: string = node.callee.property.name;
    return {
      ruleId: 'no-console',
      message: `console.${method}() detected — remove debug statements before shipping.`,
      type: 'weak-foam',
      severity: 'warning',
      line: node.loc?.start.line ?? 0,
    };
  }
  return null;
};
