import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzer';
import path from 'path';

// Helper to get full path to fixtures
const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

describe('The Ristretto Taste Test', () => {
  
  it('detects burnt notes (console.log) in bad files', async () => {
    const results = await analyzeFile(fixture('burnt.svelte'));
    
    // Expect 1 error
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Console.log detected');
    expect(results[0].type).toBe('burnt-note');
  });

  it('approves a perfect shot (clean file)', async () => {
    const results = await analyzeFile(fixture('clean.svelte'));
    
    // Expect 0 errors
    expect(results).toHaveLength(0);
  });

});