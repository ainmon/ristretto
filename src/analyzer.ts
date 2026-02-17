// src/analyzer.ts
import { readFile } from 'fs/promises';
import { parse } from 'svelte/compiler';
// @ts-ignore - estree-walker types are stupid as hell
import { walk } from 'estree-walker';

export interface RoastResult {
  file: string;
  line: number;
  message: string;
  type: 'burnt-note' | 'weak-foam'; // Error vs Warning, sorry for the pun
}

export async function analyzeFile(filePath: string): Promise<RoastResult[]> {
  const code = await readFile(filePath, 'utf-8');
  const results: RoastResult[] = [];

  try {
    // 1. Parse the Svelte code into an AST, modern: true gives us the standard AST structure
    const ast = parse(code, { filename: filePath, modern: true });

    // 2. Walk the AST, this allows us to visit every single part of the code
    if (ast.instance && ast.instance.content) {
      walk(ast.instance.content, {
        enter(node: any) {
          
          // --- RULE: No Console Logs (The "Burnt Note" is a pun, sorry) ---
          // TODO: CREATE HELPERS FOR THIS
          if (
            node.type === 'CallExpression' &&
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
          
        }
      });
    }
  } catch (e) {
    // If parsing fails (syntax error in user's code), ignore or log it
  }

  return results;
}   