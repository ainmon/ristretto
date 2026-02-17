// src/bin.ts
// #!/usr/bin/env node
import { intro, outro, spinner, note } from '@clack/prompts';
import color from 'picocolors';
import { findSvelteFiles } from './scanner';
import { analyzeFile } from './analyzer';

async function main() {
  console.clear();
  
  // #3e2723 change to this
  intro((color.bgBlack(color.white(' ☕ RISTRETTO '))));

  

  // GET THE ARGUMENT (folder name)
  // If you type "npx ts-node src/bin.ts sandbox", this captures "sandbox"
  // TODO: Add a check to see if the directory exists and if not, throw an error
  // TODO: Add a check to see if the directory is a valid Svelte project and if not, throw an error
  const targetDir = process.argv[2] || '.'; 

  const s = spinner();
  
  // PASS IT TO THE SCANNER
  s.start(`Grinding beans in ${targetDir}...`);
  const files = await findSvelteFiles(targetDir);
  s.stop(`Found ${files.length} files.`);

  if (files.length === 0) {
    outro('No Svelte files found. Is this the right directory?');
    return;
  }

  // 2. Analyze
  s.start('Pulling the shot (analyzing)...');
  
  const allIssues = [];
  
  for (const file of files) {
    const issues = await analyzeFile(file);
    allIssues.push(...issues);
  }
  
  s.stop('Extraction complete.');

  // 3. Report
  if (allIssues.length > 0) {
    // Group issues by file for cleaner output
    for (const issue of allIssues) {
      const relativeFile = issue.file.replace(process.cwd(), '.');
      console.log(
        `  ${color.red('●')} ${color.bold(relativeFile)}:${issue.line} \n` +
        `    ${color.dim('└─')} ${issue.message}\n`
      );
    }
    
    outro(color.yellow(`Order up! Found ${allIssues.length} burnt notes.`));
    process.exit(1);
  } else {
    outro(color.green('✨ Perfect Shot! No issues found.'));
  }
}

main().catch(console.error);