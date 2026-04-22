const { execSync } = require('child_process');

try {
  console.log('Adding files...');
  execSync('git add .');
  
  console.log('Committing...');
  try {
    execSync('git commit -m "fix(calendar): implement paginated fetching to fix 1000-row limit mismatch"');
  } catch (e) {
    console.log('Commit might be empty or failed, continuing...');
  }
  
  console.log('Pushing to remote...');
  execSync('git push');
  console.log('Push successful!');
} catch (error) {
  console.error('Error executing git commands:', error.message);
  if (error.stdout) console.log(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
}
// Force trigger update: 2026-04-22 09:12
