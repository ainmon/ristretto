// src/rules/subscription-leak.ts
import type { Rule } from './types.js';

/**
 * Flags store.subscribe() calls whose return value is not captured.
 * Without capturing the unsubscribe function, you have no way to clean up —
 * this is always a memory leak.
 *
 * Bad:  myStore.subscribe(v => { ... })
 * Good: const unsub = myStore.subscribe(v => { ... })
 *       onDestroy(unsub)
 */
export const noWildSubscriptions: Rule = (node, parent) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property?.name === 'subscribe'
  ) {
    const isAssigned =
      parent?.type === 'VariableDeclarator' ||
      parent?.type === 'AssignmentExpression';

    if (!isAssigned) {
      return {
        ruleId: 'no-unassigned-subscription',
        message:
          'store.subscribe() return value is not captured. ' +
          'Assign it to a variable and call it in onDestroy() to prevent memory leaks.',
        type: 'burnt-note',
        severity: 'error',
        line: node.loc?.start.line ?? 0,
      };
    }
  }
  return null;
};
