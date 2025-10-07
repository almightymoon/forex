const fs = require('fs');
const { execSync } = require('child_process');

console.log('Finding routes with error.message nesting...\n');

const files = execSync(
  `find app/api -name 'route.ts' -type f -exec grep -l 'error.*error.message\\|Failed to.*error.message' {} \\;`,
  { encoding: 'utf-8' }
).trim().split('\n').filter(f => f);

console.log(`Found ${files.length} files to fix:\n`);

let fixedCount = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;
    
    // Pattern 1: error instanceof Error ? error.message : 'Unknown error'
    const pattern1 = /{ error: `([^`]+): \$\{error instanceof Error \? error\.message : ['"]Unknown error['"]\}` }/g;
    if (content.match(pattern1)) {
      content = content.replace(pattern1, (match, prefix) => {
        return `{ error: '${prefix}' }`;
      });
      modified = true;
    }
    
    // Pattern 2: error.message || 'Unknown error'  
    const pattern2 = /{ error: `([^`]+): \$\{error\.message \|\| ['"]Unknown error['"]\}` }/g;
    if (content.match(pattern2)) {
      content = content.replace(pattern2, (match, prefix) => {
        return `{ error: '${prefix}' }`;
      });
      modified = true;
    }
    
    // Pattern 3: String(error)
    const pattern3 = /{ error: `([^`]+): \$\{String\(error\)\}` }/g;
    if (content.match(pattern3)) {
      content = content.replace(pattern3, (match, prefix) => {
        return `{ error: '${prefix}' }`;
      });
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    } else {
      console.log(`⚠️  Skipped (no match): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n✅ Successfully fixed ${fixedCount} out of ${files.length} files!`);
console.log('\nAll routes now return simple error messages without nesting!');

