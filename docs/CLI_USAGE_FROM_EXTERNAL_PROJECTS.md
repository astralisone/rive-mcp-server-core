# Using Rive MCP CLI from Your External Project

This guide shows you how to use the Rive MCP tools directly from your project directory where your Rive files are located, without having to cd into the rive-mcp-server-core directory.

## Setup (One Time)

First, set up an alias or add the rive-mcp-server-core to your PATH:

### Option 1: Create an Alias (Recommended)

Add this to your `~/.zshrc` or `~/.bashrc`:

```bash
# Rive MCP CLI Aliases
alias rive-manifest="cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core && npm run generate-manifest --"
alias rive-batch="cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core && npm run batch-import --"
alias rive-validate="cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core && npm run validate-manifests"
alias rive-update-index="cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core && npm run update-manifest-index"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Option 2: Create a Global CLI Script

Create a script in `/usr/local/bin/rive-mcp`:

```bash
#!/bin/bash
cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core
npm run "$@"
```

Make it executable:
```bash
chmod +x /usr/local/bin/rive-mcp
```

## Usage from Your Project Directory

Now you can use the tools from anywhere!

### Example: You're Working on Your Game

```bash
# Your current directory
cd ~/my-awesome-game/assets/animations/

# You have some Rive files here
ls
# slot-machine.riv  celebration.riv  character-avatar.riv
```

### Generate a Manifest for a Single File

```bash
# Using absolute path
rive-manifest -f ~/my-awesome-game/assets/animations/slot-machine.riv --interactive

# Using relative path (from current directory)
rive-manifest -f ./slot-machine.riv --interactive

# With all options specified
rive-manifest \
  -f ./slot-machine.riv \
  --name "Slot Machine" \
  --description "Casino slot machine with spinning reels" \
  --category "game-elements" \
  --tags "casino,slots,game" \
  --library "my-game" \
  --author "Your Name" \
  --copy
```

**What this does:**
1. Creates a manifest in `rive-mcp-server-core/data/manifests/components/`
2. Copies your .riv file to `rive-mcp-server-core/data/assets/rive/`
3. Generates a template with state machines to fill in

### Batch Import an Entire Directory

```bash
# Import all Rive files from your current directory
rive-batch \
  --dir ~/my-awesome-game/assets/animations \
  --library my-game \
  --category game-elements \
  --author "Your Name" \
  --tags "game,casino" \
  --copy

# Import recursively (including subdirectories)
rive-batch \
  --dir ~/my-awesome-game/assets/animations \
  --recursive \
  --library my-game \
  --copy
```

**What this does:**
1. Finds all `.riv` files in the directory
2. Creates a manifest for each file
3. Copies all files to the MCP server
4. Creates a library grouping them
5. Updates the manifest index

### Validate Your Manifests

```bash
# From anywhere
rive-validate

# Verbose mode for more details
rive-validate --verbose
```

### Update the Manifest Index

```bash
# After adding new manifests
rive-update-index
```

## Complete Workflow Example

Here's a complete real-world workflow:

```bash
# 1. You're in your game project
cd ~/my-awesome-game

# 2. You've created some new Rive animations
ls assets/animations/
# new-button.riv  new-loader.riv  new-character.riv

# 3. Batch import them all
rive-batch \
  --dir ./assets/animations \
  --library my-game-ui \
  --category ui-elements \
  --author "John Doe" \
  --tags "ui,game" \
  --library-name "My Game UI Components" \
  --library-description "UI components for My Awesome Game" \
  --copy

# Output:
# 🔍 Scanning for Rive files in: ./assets/animations
# ✅ Found 3 Rive file(s):
#    1. new-button.riv
#    2. new-loader.riv
#    3. new-character.riv
# 📦 Starting batch import...
# Processing: new-button.riv...
#    ✅ Success: my-game-ui-new-button
# Processing: new-loader.riv...
#    ✅ Success: my-game-ui-new-loader
# Processing: new-character.riv...
#    ✅ Success: my-game-ui-new-character
# ✅ Library manifest created
# 🔄 Updating manifest index...
# ✅ Batch import complete!

# 4. Now edit the manifests to add actual state machine details
# Open in your editor:
# - rive-mcp-server-core/data/manifests/components/my-game-ui-new-button.json

# 5. Validate everything
rive-validate

# Output:
# 🔍 Validating manifests...
# Found 3 component manifest(s)
# Found 1 library manifest(s)
# ============================================================
# ✅ All manifests are valid!

# 6. Now you can use the MCP tools to generate wrappers!
```

## Advanced: NPX Usage (No Aliases)

If you don't want to create aliases, you can use npx:

```bash
# From your project directory
cd ~/my-game/assets/animations

# Generate manifest
npx -w /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core \
  ts-node tools/scripts/generate-manifest.ts \
  -f ./my-animation.riv \
  --interactive
```

## Workflow for Multiple Projects

If you're working on multiple projects that all use the same Rive MCP server:

```bash
# Project 1: Casino game
cd ~/casino-game/animations
rive-batch --dir . --library casino-game --copy

# Project 2: Mobile app
cd ~/mobile-app/rive-assets
rive-batch --dir . --library mobile-app --copy

# Project 3: Marketing site
cd ~/marketing-site/assets/rive
rive-batch --dir . --library marketing --copy

# All manifests are now in one centralized MCP server!
# Validate everything
rive-validate
```

## Typical Daily Workflow

```bash
# Morning: Create new Rive animation in Rive Editor
# Save to: ~/my-project/assets/new-animation.riv

# Add to MCP server
cd ~/my-project/assets
rive-manifest -f ./new-animation.riv --interactive

# Edit the generated manifest to add details
vim /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/data/manifests/components/new-animation.json

# Validate
rive-validate

# Update index
rive-update-index

# Generate a React wrapper using MCP tools
# (Use your MCP client)
generateWrapper({
  componentId: "new-animation",
  framework: "react"
})

# Copy generated wrapper to your project
cp /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/NewAnimation.tsx \
   ~/my-project/src/components/

# Done! Use in your app
```

## Tips

### 1. Keep Rive Files Organized

```
my-project/
├── assets/
│   └── animations/
│       ├── ui/
│       │   ├── buttons/
│       │   └── loaders/
│       ├── game/
│       │   ├── characters/
│       │   └── effects/
│       └── scenes/
```

Use batch import with `--recursive` to import entire directory structures.

### 2. Use Consistent Naming

- **Rive files**: `kebab-case.riv`
- **Component IDs**: Auto-generated from filename
- **Library IDs**: Project or feature name (`my-game`, `ui-components`)

### 3. Automate with Scripts

Create a script in your project:

```bash
# scripts/import-rive-files.sh
#!/bin/bash
rive-batch \
  --dir ./assets/animations \
  --library my-project \
  --category game-elements \
  --author "$(git config user.name)" \
  --copy

rive-validate
```

### 4. Git Integration

Add a pre-commit hook to validate manifests:

```bash
# .git/hooks/pre-commit
#!/bin/bash
cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core
npm run validate-manifests || exit 1
```

## Troubleshooting

### "Command not found: rive-manifest"

- Make sure you've added the alias to your shell rc file
- Reload your shell: `source ~/.zshrc`

### "Cannot find file"

- Use absolute paths: `~/my-project/file.riv`
- Or cd to the directory first: `cd ~/my-project && rive-manifest -f ./file.riv`

### "Permission denied"

- Make sure the rive-mcp-server-core directory has write permissions
- Check that data/manifests/ exists: `npm run init-storage`

## Full Command Reference

### generate-manifest

```bash
rive-manifest -f <path> [options]

Options:
  -f, --file <path>           Path to .riv file (required)
  -i, --id <id>               Component ID
  -n, --name <name>           Component name
  -d, --description <desc>    Description
  -c, --category <category>   Category
  -t, --tags <tags>           Comma-separated tags
  -l, --library <library>     Library ID
  -a, --author <author>       Author name
  -o, --output <path>         Output manifest path
  --interactive               Interactive mode
  --copy                      Copy file to MCP server
  --no-copy                   Don't copy file
```

### batch-import

```bash
rive-batch --dir <path> [options]

Options:
  -d, --dir <path>                    Directory with .riv files (required)
  -r, --recursive                     Scan subdirectories
  -l, --library <id>                  Library ID
  -c, --category <category>           Category for all
  -t, --tags <tags>                   Tags for all
  -a, --author <author>               Author for all
  --copy                              Copy files (default: true)
  --no-copy                           Don't copy files
  --library-name <name>               Library name
  --library-description <desc>        Library description
```

### validate-manifests

```bash
rive-validate [options]

Options:
  -v, --verbose    Verbose output
```

### update-manifest-index

```bash
rive-update-index
```

No options needed - automatically scans and updates.

## Next Steps

Now that you can easily add your Rive files:

1. **Generate wrappers** for your framework
2. **Compose scenes** with multiple components
3. **Set up telemetry** to track usage
4. **Create QA rules** for validation
5. **Build your app** with the generated components!

See `ADDING_YOUR_RIVE_FILES.md` for more details on the manifest format and best practices.
