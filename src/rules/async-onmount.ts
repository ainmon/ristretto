// src/rules/async-onmount.ts
import type { Rule } from './types.js';

/**
 * Flags `onMount(async () => { ... })`.
 *
 * Svelte's onMount expects the callback to optionally *return* a synchronous
 * cleanup function. Async functions always return a Promise — Svelte will
 * receive the Promise and silently ignore it, meaning your cleanup never runs.
 *
 * Bad:
 *   onMount(async () => {
 *     data = await fetchData();
 *     return () => cleanup(); // ← this is NEVER called
 *   });
 *
 * Good:
 *   onMount(() => {
 *     fetchData().then(d => (data = d));
 *     return () => cleanup(); // ← this IS called
 *   });
 */
export const noAsyncOnMount: Rule = (node) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'onMount' &&
    node.arguments.length > 0 &&
    node.arguments[0].async === true
  ) {
    return {
      ruleId: 'no-async-onmount',
      message:
        'onMount() received an async function. Async functions return a Promise, not a ' +
        'cleanup function — Svelte will silently discard it and your cleanup will never run.',
      type: 'burnt-note',
      severity: 'error',
      line: node.loc?.start.line ?? 0,
    };
  }
  return null;
};
