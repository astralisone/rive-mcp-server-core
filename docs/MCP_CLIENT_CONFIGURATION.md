# MCP Client Configuration Guide

This guide shows you how to configure various MCP clients to connect to the Astralis Motion Rive MCP Server.

## Quick Start

The MCP server runs on stdio and communicates using the Model Context Protocol. When you start the server, it will output the exact configuration you need to add to your MCP client.

### Starting the Server

```bash
# From the monorepo root
node packages/mcp-server/dist/index.js

# Or using npm
npm run start --workspace=@astralismotion/mcp-server
```

The server will output configuration like this:

```
================================================================================
🎨 Astralis Motion Rive MCP Server
================================================================================

Add this configuration to your MCP client settings:

{
  "mcpServers": {
    "astralismotion-rive-mcp": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"]
    }
  }
}

================================================================================
Available Tools:
  • list_libraries       - List all Rive libraries
  • list_components      - List Rive components
  • get_component_detail - Get component details
  • get_runtime_surface  - Extract state machines & inputs
  • generate_wrapper     - Generate React/Vue/Stencil wrappers
  • compose_scene        - Compose multi-component scenes
================================================================================

✓ Server ready and listening on stdio
```

## Configuration by Client

### Claude Desktop

**Location**: `~/.config/claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "astralismotion-rive-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/rive-mcp-server-core/packages/mcp-server/dist/index.js"],
      "env": {
        "STORAGE_TYPE": "local",
        "MANIFESTS_PATH": "/absolute/path/to/rive-mcp-server-core/data/manifests",
        "ASSETS_PATH": "/absolute/path/to/rive-mcp-server-core/data/assets/rive"
      }
    }
  }
}
```

**Steps**:
1. Open or create `claude_desktop_config.json`
2. Add the configuration above with absolute paths
3. Restart Claude Desktop
4. The Rive MCP tools will appear in the available tools list

### Cline (VSCode Extension)

**Location**: VSCode Settings → Extensions → Cline → MCP Servers

**Method 1: Settings UI**
1. Open VSCode Settings (Cmd/Ctrl + ,)
2. Search for "Cline MCP"
3. Click "Edit in settings.json"
4. Add the configuration:

```json
{
  "cline.mcpServers": {
    "astralismotion-rive-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/rive-mcp-server-core/packages/mcp-server/dist/index.js"],
      "env": {
        "STORAGE_TYPE": "local",
        "MANIFESTS_PATH": "/absolute/path/to/rive-mcp-server-core/data/manifests"
      }
    }
  }
}
```

**Method 2: Command Palette**
1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Cline: Edit MCP Settings"
3. Add the server configuration

### Continue.dev (VSCode Extension)

**Location**: `~/.continue/config.json`

```json
{
  "mcpServers": [
    {
      "name": "astralismotion-rive-mcp",
      "command": "node",
      "args": ["/absolute/path/to/rive-mcp-server-core/packages/mcp-server/dist/index.js"],
      "env": {
        "STORAGE_TYPE": "local"
      }
    }
  ]
}
```

### Custom MCP Client

For any custom MCP client implementation:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/absolute/path/to/rive-mcp-server-core/packages/mcp-server/dist/index.js"],
  env: {
    STORAGE_TYPE: "local",
    MANIFESTS_PATH: "/absolute/path/to/rive-mcp-server-core/data/manifests"
  }
});

const client = new Client(
  {
    name: "my-rive-client",
    version: "1.0.0"
  },
  {
    capabilities: {}
  }
);

await client.connect(transport);

// List available tools
const tools = await client.request(
  { method: "tools/list" },
  ListToolsResultSchema
);

// Call a tool
const libraries = await client.request(
  {
    method: "tools/call",
    params: {
      name: "list_libraries",
      arguments: { search: "casino" }
    }
  },
  CallToolResultSchema
);
```

## Environment Variables

Configure the server behavior with these environment variables:

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `STORAGE_TYPE` | Storage backend to use | `local` | `local`, `s3`, `remote` |
| `MANIFESTS_PATH` | Path to manifest files | `./data/manifests` | Any valid path |
| `ASSETS_PATH` | Path to Rive assets | `./data/assets/rive` | Any valid path |
| `AWS_REGION` | AWS region for S3 | - | `us-east-1`, etc. |
| `AWS_BUCKET` | S3 bucket name | - | Your bucket name |
| `REMOTE_BASE_URL` | Remote storage URL | - | `https://api.example.com` |

### Example with S3 Storage

```json
{
  "mcpServers": {
    "astralismotion-rive-mcp": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "STORAGE_TYPE": "s3",
        "AWS_REGION": "us-east-1",
        "AWS_BUCKET": "my-rive-assets",
        "AWS_ACCESS_KEY_ID": "your-key",
        "AWS_SECRET_ACCESS_KEY": "your-secret"
      }
    }
  }
}
```

### Example with Remote HTTP Storage

```json
{
  "mcpServers": {
    "astralismotion-rive-mcp": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "STORAGE_TYPE": "remote",
        "REMOTE_BASE_URL": "https://cdn.example.com/rive"
      }
    }
  }
}
```

## Available Tools

Once configured, these tools will be available in your MCP client:

### 1. list_libraries
List all available Rive libraries with optional filtering.

```json
{
  "name": "list_libraries",
  "arguments": {
    "tags": ["casino", "ui"],
    "search": "animation"
  }
}
```

### 2. list_components
List Rive components with filtering options.

```json
{
  "name": "list_components",
  "arguments": {
    "libraryId": "ui-components",
    "tags": ["button"],
    "search": "animated"
  }
}
```

### 3. get_component_detail
Get detailed information about a specific component.

```json
{
  "name": "get_component_detail",
  "arguments": {
    "id": "button-animation"
  }
}
```

### 4. get_runtime_surface
Extract runtime surface (state machines, inputs, events) from a component.

```json
{
  "name": "get_runtime_surface",
  "arguments": {
    "componentId": "button-animation"
  }
}
```

### 5. generate_wrapper
Generate framework-specific wrapper components.

```json
{
  "name": "generate_wrapper",
  "arguments": {
    "surface": { /* runtime surface data */ },
    "framework": "react",
    "riveSrc": "./assets/button.riv",
    "componentName": "AnimatedButton",
    "outputPath": "./src/components",
    "writeToFile": true
  }
}
```

### 6. compose_scene
Compose multi-component orchestrated scenes.

```json
{
  "name": "compose_scene",
  "arguments": {
    "name": "casino-lobby",
    "description": "Animated casino lobby scene",
    "components": [
      {
        "componentId": "slot-machine",
        "instanceName": "slot1",
        "position": { "x": 100, "y": 200 }
      }
    ],
    "orchestration": {
      "timeline": [
        {
          "time": 0,
          "component": "slot1",
          "action": "play"
        }
      ]
    }
  }
}
```

## Troubleshooting

### Server won't start

1. **Check Node.js version**: Requires Node 18+
   ```bash
   node --version
   ```

2. **Verify build**: Ensure the server is built
   ```bash
   npm run build:packages
   ```

3. **Check paths**: Use absolute paths in configuration

4. **Test manually**:
   ```bash
   node packages/mcp-server/dist/index.js
   ```
   You should see the configuration output

### Client can't connect

1. **Check configuration syntax**: Ensure JSON is valid
2. **Restart client**: Most clients require restart after config changes
3. **Check logs**: Look for error messages in client logs
4. **Verify permissions**: Ensure the server file is executable

### Tools not appearing

1. **Verify connection**: Check client successfully connected
2. **Check capabilities**: Server advertises `tools` capability
3. **Restart client**: Some clients cache tool lists

### Environment variables not working

1. **Check syntax**: Ensure `env` object is properly formatted
2. **Use absolute paths**: Relative paths may not resolve correctly
3. **Quote values**: Some shells require quoted values

## Advanced Configuration

### Using with PM2

For production deployments, use PM2 to manage the server:

```json
{
  "apps": [{
    "name": "rive-mcp-server",
    "script": "./packages/mcp-server/dist/index.js",
    "interpreter": "node",
    "env": {
      "STORAGE_TYPE": "s3",
      "AWS_REGION": "us-east-1"
    }
  }]
}
```

Then configure your MCP client to use:
```json
{
  "command": "pm2",
  "args": ["start", "rive-mcp-server"]
}
```

### Using with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY packages/mcp-server/dist ./dist
COPY data ./data
CMD ["node", "dist/index.js"]
```

Configure your MCP client:
```json
{
  "command": "docker",
  "args": ["run", "-i", "rive-mcp-server"]
}
```

## Getting Help

- **Documentation**: See docs/ folder for detailed guides
- **Examples**: Check data/manifests/ for example configurations
- **Issues**: Report problems on GitHub
- **CLI Tools**: Use `npm run generate-manifest` to create custom components

## Next Steps

1. ✅ Configure your MCP client (this guide)
2. 📚 Read [ADDING_YOUR_RIVE_FILES.md](./ADDING_YOUR_RIVE_FILES.md) to add custom Rive files
3. 🚀 Explore [CLI_USAGE_FROM_EXTERNAL_PROJECTS.md](./CLI_USAGE_FROM_EXTERNAL_PROJECTS.md) for external project integration
4. 🎨 Check [SCENE_COMPOSITION.md](./SCENE_COMPOSITION.md) for orchestration examples
