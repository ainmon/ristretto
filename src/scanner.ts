// src/scanner.ts
import fg from 'fast-glob';

export async function findSvelteFiles(cwd: string = process.cwd()): Promise<string[]> {
  // Find all .svelte files, ignoring node_modules and .svelte-kit
  const files = await fg('**/*.svelte', {
    cwd,
    ignore: ['**/node_modules/**', '**/.svelte-kit/**'],
    absolute: true,
  });
  return files;
}