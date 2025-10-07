const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Finding all routes with error recursion bug...\n');

// Find all route.ts files with the bug
const files = execSync(
  `find app/api -name 'route.ts' -type f -exec grep -l 'throw new Error.*Backend responded with' {} \\;`,
  { encoding: 'utf-8' }
).trim().split('\n').filter(f => f);

console.log(`Found ${files.length} files to fix:\n`);
files.forEach(f => console.log(`  - ${f}`));

let fixedCount = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;
    
    // Fix 1: Replace "throw new Error" with direct error return
    const throwPattern = /const errorText = await backendResponse\.text\(\);\s*console\.error\('Backend error response:', errorText\);\s*throw new Error\(`Backend responded with \$\{backendResponse\.status\}: \$\{errorText\}`\);/g;
    
    if (content.match(throwPattern)) {
      content = content.replace(
        throwPattern,
        `const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      return new NextResponse(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });`
      );
      modified = true;
    }
    
    // Fix 2: Simplify catch block error messages to prevent nesting
    const catchPattern = /{ error: `Failed to ([^:]+): \$\{error instanceof Error \? error\.message : 'Unknown error'\}` }/g;
    
    if (content.match(catchPattern)) {
      content = content.replace(
        catchPattern,
        (match, action) => `{ error: 'Failed to ${action}' }`
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n✅ Successfully fixed ${fixedCount} out of ${files.length} files!`);

