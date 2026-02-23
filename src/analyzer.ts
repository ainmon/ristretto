// src/analyzer.ts
import { readFile } from 'fs/promises';
import { parse } from 'svelte/compiler';
// @ts-ignore — estree-walker lacks complete type declarations
import { walk } from 'estree-walker';
import { INSTANT_RULES, noConsole } from './rules/index.js';
import type { Context, Roast } from './rules/index.js';

const MODULE_RULES = [noConsole];

export interface RoastResult extends Roast {
  file: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a character offset to a 1-based line number. */
function lineFromOffset(code: string, offset: number): number {
  return code.slice(0, offset).split('\n').length;
}

/**
 * A simple recursive walker for Svelte's template AST.
 * estree-walker only understands ESTree node shapes, so we need our own
 * walker for the HTML fragment (EachBlock, IfBlock, etc.).
 */
function walkTemplate(node: any, visitor: (n: any) => void): void {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  // Cover every child-bearing property used across Svelte 4 + 5 ASTs
  for (const key of [
    'nodes',     // Fragment (Svelte 5)
    'children',  // Fragment (Svelte 4) / EachBlock body
    'body',      // EachBlock / IfBlock
    'fragment',  // Component / Element (Svelte 5)
    'consequent',
    'alternate',
    'branches',  // SnippetBlock
    'block',
  ]) {
    const child = (node as any)[key];
    if (Array.isArray(child)) {
      for (const c of child) walkTemplate(c, visitor);
    } else if (child && typeof child === 'object' && child.type) {
      walkTemplate(child, visitor);
    }
  }
}

/** Walk a block of script code (ESTree), running instant rules and updating context. */
function walkScript(
  content: any,
  context: Context,
  instantOnly: boolean,
  onResult: (r: Omit<RoastResult, 'file'>) => void,
) {
  walk(content, {
    enter(node: any, parent: any) {
      // --- Instant rules ---
      const rules = instantOnly ? MODULE_RULES : INSTANT_RULES;
      for (const rule of rules) {
        const result = rule(node, parent, context);
        if (result) onResult(result);
      }

      if (instantOnly) return; // <script context="module"> — skip state tracking

      // --- State tracking ---

      // 1. Subscription assignments: const unsub = store.subscribe(...)
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property?.name === 'subscribe'
      ) {
        if (parent?.type === 'VariableDeclarator' && parent.id?.name) {
          context.assignedSubscriptions.set(parent.id.name, node.loc?.start.line ?? 0);
        } else if (parent?.type === 'AssignmentExpression' && parent.left?.name) {
          context.assignedSubscriptions.set(parent.left.name, node.loc?.start.line ?? 0);
        }
      }

      // 2. Direct function calls: unsub() — or onDestroy(unsub)
      if (node.type === 'CallExpression') {
        if (node.callee.type === 'Identifier') {
          context.calledFunctions.add(node.callee.name);
        }
        if (
          node.callee.name === 'onDestroy' &&
          node.arguments[0]?.type === 'Identifier'
        ) {
          context.calledFunctions.add(node.arguments[0].name);
        }
      }

      // 3. setInterval assignments
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'setInterval'
      ) {
        const line = node.loc?.start.line ?? 0;
        if (parent?.type === 'VariableDeclarator' && parent.id?.name) {
          context.setIntervals.set(parent.id.name, line);
        } else if (parent?.type === 'AssignmentExpression' && parent.left?.name) {
          context.setIntervals.set(parent.left.name, line);
        } else {
          // Unassigned — the result is immediately discarded, can never be cleared
          context.setIntervals.set(`__unnamed_${line}`, line);
        }
      }

      // 4. clearInterval calls
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'clearInterval' &&
        node.arguments[0]?.type === 'Identifier'
      ) {
        context.clearedIntervals.add(node.arguments[0].name);
      }

      // 5. addEventListener / removeEventListener
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression'
      ) {
        const methodName = node.callee.property?.name;
        if (methodName === 'addEventListener') {
          context.eventListenersAdded.push(node.loc?.start.line ?? 0);
        } else if (methodName === 'removeEventListener') {
          context.eventListenersRemoved++;
        }
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function analyzeFile(filePath: string): Promise<RoastResult[]> {
  const code = await readFile(filePath, 'utf-8');
  const results: RoastResult[] = [];

  const push = (r: Omit<RoastResult, 'file'>) => results.push({ file: filePath, ...r });

  const context: Context = {
    assignedSubscriptions: new Map(),
    calledFunctions: new Set(),
    setIntervals: new Map(),
    clearedIntervals: new Set(),
    eventListenersAdded: [],
    eventListenersRemoved: 0,
  };

  try {
    const ast = parse(code, { filename: filePath, modern: true });

    // ── 1. Walk <script> ────────────────────────────────────────────────────
    if (ast.instance?.content) {
      walkScript(ast.instance.content, context, false, push);
    }

    // ── 2. Walk <script context="module"> (console checks only) ────────────
    if (ast.module?.content) {
      walkScript(ast.module.content, context, true, push);
    }

    // ── 3. Walk the HTML template ───────────────────────────────────────────
    // Svelte 5 → ast.fragment | Svelte 4 → ast.html
    const fragment = (ast as any).fragment ?? (ast as any).html;
    if (fragment) {
      walkTemplate(fragment, (node: any) => {
        // Rule: {#each} without a key expression
        if (node.type === 'EachBlock' && !node.key) {
          const line = node.start != null ? lineFromOffset(code, node.start) : 0;
          push({
            ruleId: 'missing-each-key',
            message:
              '{#each} block is missing a key expression. ' +
              'Add a unique key like {#each items as item (item.id)} so Svelte can ' +
              'efficiently reconcile DOM nodes instead of destroying and recreating them.',
            type: 'weak-foam',
            severity: 'warning',
            line,
          });
        }
      });
    }

    // ── 4. Post-scan checks (cross-node patterns) ───────────────────────────

    // Subscription never unsubscribed
    for (const [varName, line] of context.assignedSubscriptions) {
      if (!context.calledFunctions.has(varName)) {
        push({
          ruleId: 'subscription-not-cleaned-up',
          message:
            `Subscription '${varName}' is never unsubscribed. ` +
            `Call ${varName}() inside onDestroy() to prevent a memory leak.`,
          type: 'burnt-note',
          severity: 'error',
          line,
        });
      }
    }

    // setInterval never cleared
    for (const [varName, line] of context.setIntervals) {
      if (!context.clearedIntervals.has(varName)) {
        const isUnnamed = varName.startsWith('__unnamed_');
        push({
          ruleId: 'no-interval-leak',
          message: isUnnamed
            ? 'setInterval() result is not assigned to a variable — it can never be cleared. ' +
              'Assign it and call clearInterval() in onDestroy().'
            : `setInterval result '${varName}' is never cleared. ` +
              `Call clearInterval(${varName}) in onDestroy() to prevent it from running forever.`,
          type: 'burnt-note',
          severity: 'error',
          line,
        });
      }
    }

    // addEventListener without matching removeEventListener
    const listenerImbalance =
      context.eventListenersAdded.length - context.eventListenersRemoved;
    if (listenerImbalance > 0) {
      // Report each unmatched addEventListener by its original line number
      for (let i = 0; i < listenerImbalance; i++) {
        push({
          ruleId: 'no-event-listener-leak',
          message:
            'addEventListener() has no matching removeEventListener(). ' +
            'Add the removal in onDestroy() or inside onMount\'s returned cleanup function.',
          type: 'burnt-note',
          severity: 'error',
          line: context.eventListenersAdded[i] ?? 0,
        });
      }
    }
  } catch {
    // Silently skip unparseable files (syntax errors, non-Svelte .svelte, etc.)
  }

  return results;
}
