// src/bin.ts
import { intro, outro, spinner, log } from '@clack/prompts';
import color from 'picocolors';
import { findSvelteFiles } from './scanner.js';
import { analyzeFile } from './analyzer.js';
import type { RoastResult } from './analyzer.js';

async function main() {
  console.clear();

  intro(color.bgBlack(color.white(' ☕ RISTRETTO ')));

  // Accept a target directory as the first arg, default to cwd
  const targetDir = process.argv[2] || '.';

  const s = spinner();

  s.start(`Grinding beans in ${color.cyan(targetDir)} ...`);
  const files = await findSvelteFiles(targetDir);
  s.stop(`Found ${color.bold(String(files.length))} Svelte file${files.length !== 1 ? 's' : ''}.`);

  if (files.length === 0) {
    outro('No Svelte files found. Is this the right directory?');
    return;
  }

  s.start('Pulling the shot (analyzing) ...');
  const allIssues: RoastResult[] = [];
  for (const file of files) {
    const issues = await analyzeFile(file);
    allIssues.push(...issues);
  }
  s.stop('Extraction complete.');

  if (allIssues.length === 0) {
    outro(color.green('✨ Perfect shot! No issues found.'));
    return;
  }

  // ── Group by file for a cleaner report ──────────────────────────────────
  const byFile = new Map<string, RoastResult[]>();
  for (const issue of allIssues) {
    if (!byFile.has(issue.file)) byFile.set(issue.file, []);
    byFile.get(issue.file)!.push(issue);
  }

  console.log(''); // breathing room after spinner

  for (const [file, issues] of byFile) {
    const relFile = file.replace(process.cwd(), '.').replace(/\\/g, '/');
    console.log(`  ${color.bold(color.underline(relFile))}`);

    // Sort: errors first, then warnings; then by line number
    const sorted = [...issues].sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
      return a.line - b.line;
    });

    for (const issue of sorted) {
      const icon =
        issue.severity === 'error' ? color.red('✖') : color.yellow('⚠');
      const lineTag = color.dim(`line ${issue.line}`);
      const ruleTag = color.dim(`[${issue.ruleId}]`);
      console.log(
        `    ${icon} ${lineTag} ${ruleTag}\n` +
        `       ${color.dim('└─')} ${issue.message}\n`,
      );
    }
  }

  // ── Summary line ─────────────────────────────────────────────────────────
  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warnCount = allIssues.filter((i) => i.severity === 'warning').length;

  const parts: string[] = [];
  if (errorCount > 0)
    parts.push(color.red(`${errorCount} error${errorCount !== 1 ? 's' : ''}`));
  if (warnCount > 0)
    parts.push(color.yellow(`${warnCount} warning${warnCount !== 1 ? 's' : ''}`));

  outro(color.yellow(`Order up! Found ${parts.join(color.dim(', '))}.`));
  process.exit(1);
}

main().catch(console.error);
