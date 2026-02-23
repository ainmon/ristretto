// src/rules/index.ts
// Central registry — import rules and types from here.

export type { Roast, Rule, Context } from './types.js';

export { noConsole } from './no-console.js';
export { noWildSubscriptions } from './subscription-leak.js';
export { noAsyncOnMount } from './async-onmount.js';

/**
 * INSTANT_RULES are run on every AST node during the script walk.
 * Add new per-node rules here.
 */
import { noConsole } from './no-console.js';
import { noWildSubscriptions } from './subscription-leak.js';
import { noAsyncOnMount } from './async-onmount.js';
import type { Rule } from './types.js';

export const INSTANT_RULES: Rule[] = [noConsole, noWildSubscriptions, noAsyncOnMount];
