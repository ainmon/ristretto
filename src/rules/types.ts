// src/rules/types.ts
// Shared types for all rules. Kept separate to avoid circular imports.

/**
 * A "Roast" is the result returned when a rule finds a problem.
 * - 'burnt-note' → error (definite bug / memory leak)
 * - 'weak-foam'  → warning (code smell / best-practice violation)
 */
export interface Roast {
  ruleId: string;
  message: string;
  type: 'burnt-note' | 'weak-foam';
  severity: 'error' | 'warning';
  line: number;
}

/**
 * Context is shared state that accumulates as the AST is walked.
 * Instant rules can read it; the analyzer writes to it during traversal,
 * then post-scan checks read it to detect cross-node patterns.
 */
export interface Context {
  // Subscriptions
  assignedSubscriptions: Map<string, number>; // varName → line
  calledFunctions: Set<string>;               // all directly-called identifiers

  // Intervals
  setIntervals: Map<string, number>;  // varName → line  (__unnamed_N for unassigned)
  clearedIntervals: Set<string>;      // varNames passed to clearInterval()

  // Event listeners (heuristic: count adds vs removes)
  eventListenersAdded: number[];  // line numbers of each addEventListener() call
  eventListenersRemoved: number;  // count of removeEventListener() calls
}

/**
 * A Rule is a pure function that inspects a single AST node and returns a
 * Roast if a problem is found, or null otherwise.
 */
export type Rule = (node: any, parent: any, context: Context) => Roast | null;
