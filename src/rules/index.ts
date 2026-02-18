// src/rules/index.ts
import type { Node } from 'estree-walker';

// A "Roast" is what we return if we find a problem
export interface Roast {
  message: string;
  type: 'burnt-note' | 'weak-foam';
  line: number;
}

// A "Rule" is a function that looks at a node and returns a Roast (or null)
export type Rule = (node: any, parent: any, context: Context) => Roast | null;

// Context helps rules share data (like your "calledFunctions" set)
export interface Context {
  assignedSubscriptions: Map<string, number>;
  calledFunctions: Set<string>;
}

// --- RULE 1: Console Logs ---
export const noConsoleLog: Rule = (node) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.name === 'console' &&
    node.callee.property.name === 'log'
  ) {
    return {
      message: 'Console.log detected. Did you leave a debug statement?',
      type: 'burnt-note',
      line: node.loc?.start.line || 0
    };
  }
  return null;
};

// --- RULE 2: Wild Subscriptions (Unassigned) ---
export const noWildSubscriptions: Rule = (node, parent) => {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property?.name === 'subscribe'
  ) {
    // If parent is NOT an assignment, it's a wild subscription
    const isAssigned = 
      parent?.type === 'VariableDeclarator' || 
      parent?.type === 'AssignmentExpression';

    if (!isAssigned) {
      return {
        message: 'Unassigned subscription detected. Assign this to a variable to cleanup later.',
        type: 'burnt-note',
        line: node.loc?.start.line || 0
      };
    }
  }
  return null;
};