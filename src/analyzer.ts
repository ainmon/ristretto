// src/analyzer.ts
import { readFile } from 'fs/promises';
import { parse } from 'svelte/compiler';
// @ts-ignore - estree-walker types are indeed annoying
import { walk } from 'estree-walker';

export interface RoastResult {
  file: string;
  line: number;
  message: string;
  type: 'burnt-note' | 'weak-foam';
}

export async function analyzeFile(filePath: string): Promise<RoastResult[]> {
  const code = await readFile(filePath, 'utf-8');
  const results: RoastResult[] = [];

  // 1. TRACKERS
  // Stores variables that hold a subscription: "unsubscribe" -> line 10
  const assignedSubscriptions = new Map<string, number>(); 
  // Stores variables that were actually called: "unsubscribe"
  const calledFunctions = new Set<string>();

  try {
    const ast = parse(code, { filename: filePath, modern: true });

    if (ast.instance && ast.instance.content) {
      walk(ast.instance.content, {
        // @ts-ignore - parent is the second argument
        enter(node: any, parent: any) {
          
          if (node.type === 'CallExpression') {

            // --- CHECK A: Console Logs ---
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console' &&
              node.callee.property.name === 'log'
            ) {
              results.push({
                file: filePath,
                line: node.loc?.start.line || 0,
                message: 'Console.log detected. Did you leave a debug statement?',
                type: 'burnt-note'
              });
            }

            // --- CHECK B: Subscription Handling ---
            // Detect: something.subscribe(...)
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property?.name === 'subscribe'
            ) {
              // CASE 1: Assigned to a variable? (const x = store.subscribe)
              if (parent?.type === 'VariableDeclarator') {
                const varName = parent.id.name;
                assignedSubscriptions.set(varName, node.loc?.start.line || 0);
              } 
              // CASE 2: Assigned to an existing var? (x = store.subscribe)
              else if (parent?.type === 'AssignmentExpression') {
                const varName = parent.left.name;
                assignedSubscriptions.set(varName, node.loc?.start.line || 0);
              }
              // CASE 3: Not assigned at all? (store.subscribe) -> IMMEDIATE ERROR
              else {
                results.push({
                  file: filePath,
                  line: node.loc?.start.line || 0,
                  message: 'Unassigned subscription detected. You must assign this to a variable to unsubscribe later.',
                  type: 'burnt-note'
                });
              }
            }

            // --- CHECK C: Track Function Calls ---
            // If we see "unsubscribe()", remember that "unsubscribe" was called.
            if (node.callee.type === 'Identifier') {
               calledFunctions.add(node.callee.name);
            }
            
            // Edge Case: onDestroy(unsubscribe) - passing it as an argument also counts!
            if (node.callee.name === 'onDestroy' && node.arguments.length > 0) {
                 const arg = node.arguments[0];
                 if (arg.type === 'Identifier') {
                     calledFunctions.add(arg.name);
                 }
            }
          }
        },
      });

      // --- 2. POST-DIAGNOSIS (Compare the lists) ---
      for (const [varName, line] of assignedSubscriptions) {
        // If we found 'const unsub = ...' but never saw 'unsub()' or 'onDestroy(unsub)'
        if (!calledFunctions.has(varName)) {
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
    // Parser errors are ignored for now
  }

  return results;
}