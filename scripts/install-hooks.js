const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const hooksDir = path.join(projectRoot, '.git', 'hooks');
const hookFile = path.join(hooksDir, 'pre-commit');

const hookContent = `#!/bin/sh
# Antigravity Autonomous Documentation Agent Git Pre-Commit Hook

echo "🤖 Antigravity: Analyzing staged changes for documentation updates..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  echo "No staged changes found. Skipping documentation check."
  exit 0
fi

# Run agy to analyze changes and update docs autonomously
# We use --dangerously-skip-permissions to let the agent modify documentation without blocking your commit CLI flow
agy --print "Run /auto-doc" --dangerously-skip-permissions

# Re-stage any modified markdown files
git add README.md docs/*.md docs/**/*.md 2>/dev/null || true

echo "🤖 Antigravity: Done!"
`;

function install() {
  console.log('🤖 Setting up Git Hooks and Antigravity Skills...');

  if (!fs.existsSync(hooksDir)) {
    console.log('Creating Git hooks directory...');
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  console.log(`Writing pre-commit hook to: ${hookFile}`);
  fs.writeFileSync(hookFile, hookContent, { encoding: 'utf8', mode: 0o755 });

  try {
    fs.chmodSync(hookFile, '755');
    console.log('Set pre-commit hook executable permissions successfully.');
  } catch (err) {
    console.log('Could not set permissions (this is normal on standard Windows filesystems, Git Bash will handle it):', err.message);
  }

  console.log('🤖 Git hook setup completed successfully!');
}

install();
