// src/analyzer.ts
import { readFile } from 'fs/promises';
import { parse } from 'svelte/compiler';
// @ts-ignore - estree-walker types
import { walk } from 'estree-walker';
import { noConsoleLog, noWildSubscriptions, Context, Roast } from './rules/index.js';

export interface RoastResult extends Roast {
  file: string;
}

export async function analyzeFile(filePath: string): Promise<RoastResult[]> {
  const code = await readFile(filePath, 'utf-8');
  const results: RoastResult[] = [];

  // Initialize our state trackers
  const context: Context = {
    assignedSubscriptions: new Map(),
    calledFunctions: new Set()
  };

  try {
    const ast = parse(code, { filename: filePath, modern: true });

    if (ast.instance && ast.instance.content) {
      walk(ast.instance.content, {
        // @ts-ignore - parent is the second arg in estree-walker
        enter(node: any, parent: any) {
          
          // --- 1. RUN INSTANT RULES ---
          // These rules don't need history, they just check the current node.
            const rules = [noConsoleLog, noWildSubscriptions];
          
          for (const rule of rules) {
            const result = rule(node, parent, context);
            if (result) {
              results.push({ file: filePath, ...result });
            }
          }

          // --- 2. UPDATE STATE (Track Variables) ---
          
          // A. Track Assignments: const x = store.subscribe()
          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'MemberExpression' &&
            node.callee.property?.name === 'subscribe'
          ) {
            if (parent?.type === 'VariableDeclarator') {
              context.assignedSubscriptions.set(parent.id.name, node.loc?.start.line || 0);
            } else if (parent?.type === 'AssignmentExpression') {
              context.assignedSubscriptions.set(parent.left.name, node.loc?.start.line || 0);
            }
          }

          // B. Track Calls: unsubscribe()
          if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
            context.calledFunctions.add(node.callee.name);
          }

          // C. Track Helpers: onDestroy(unsubscribe)
          if (
            node.type === 'CallExpression' &&
            node.callee.name === 'onDestroy' &&
            node.arguments.length > 0
          ) {
             const arg = node.arguments[0];
             if (arg.type === 'Identifier') {
                 context.calledFunctions.add(arg.name);
             }
          }
        },
      });

      // --- 3. POST-SCAN CHECKS (Memory Leaks) ---
      for (const [varName, line] of context.assignedSubscriptions) {
        if (!context.calledFunctions.has(varName)) {
           results.push({
             file: filePath,
             line: line,
             message: `Subscription '${varName}' is created but never used (potential memory leak).`,
             type: 'burnt-note'
           });
        }
      }
    }
  } catch (e) {
    // If parsing fails, we ignore it for now (or you could return a special error roast)
    // console.error(`Failed to parse ${filePath}`, e);
  }

  return results;
}