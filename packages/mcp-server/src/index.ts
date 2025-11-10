import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { listLibraries } from "./tools/listLibraries.js";
import { listComponents } from "./tools/listComponents.js";
import { getComponentDetail } from "./tools/getComponentDetail.js";
import { getRuntimeSurface } from "./tools/getRuntimeSurface.js";
import { generateWrapper } from "./tools/generateWrapper.js";
import { composeScene } from "./tools/composeScene.js";
import { importRiveFile } from "./tools/importRiveFile.js";
import { logger } from "./utils/logger.js";

const server = new Server(
  {
    name: "astralismotion-rive-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('ListTools request received');
  return {
    tools: [
      {
        name: "list_libraries",
        description: "List all available Rive libraries with optional filtering by tags or search query",
        inputSchema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags"
            },
            search: {
              type: "string",
              description: "Search query for library name or description"
            }
          }
        }
      },
      {
        name: "list_components",
        description: "List Rive components with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            libraryId: {
              type: "string",
              description: "Filter by library ID"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags"
            },
            search: {
              type: "string",
              description: "Search query"
            }
          }
        }
      },
      {
        name: "get_component_detail",
        description: "Get detailed information about a specific Rive component",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Component ID"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "get_runtime_surface",
        description: "Extract runtime surface information from a Rive component (state machines, inputs, events)",
        inputSchema: {
          type: "object",
          properties: {
            componentId: {
              type: "string",
              description: "Component ID"
            }
          },
          required: ["componentId"]
        }
      },
      {
        name: "generate_wrapper",
        description: "Generate framework-specific wrapper components for Rive animations",
        inputSchema: {
          type: "object",
          properties: {
            surface: {
              type: "object",
              description: "Runtime surface data"
            },
            framework: {
              type: "string",
              enum: ["react", "vue", "stencil", "all"],
              description: "Target framework"
            },
            riveSrc: {
              type: "string",
              description: "Path to Rive file"
            },
            componentName: {
              type: "string",
              description: "Component name"
            },
            outputPath: {
              type: "string",
              description: "Output path for generated files"
            },
            writeToFile: {
              type: "boolean",
              description: "Whether to write to file system"
            }
          },
          required: ["surface", "riveSrc"]
        }
      },
      {
        name: "compose_scene",
        description: "Compose a scene from multiple Rive components with orchestration",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Scene name"
            },
            description: {
              type: "string",
              description: "Scene description"
            },
            components: {
              type: "array",
              items: {
                type: "object"
              },
              description: "Components to include in the scene"
            },
            orchestration: {
              type: "object",
              description: "Orchestration rules (timeline, rules)"
            }
          },
          required: ["name", "components"]
        }
      },
      {
        name: "import_rive_file",
        description: "Import a .riv file and auto-generate manifest from it. Accepts file path and extracts all metadata automatically.",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Absolute path to the .riv file"
            },
            libraryId: {
              type: "string",
              description: "Optional library ID (defaults to 'imported-components')"
            },
            componentName: {
              type: "string",
              description: "Optional component name (defaults to filename)"
            },
            componentId: {
              type: "string",
              description: "Optional component ID (defaults to filename)"
            }
          },
          required: ["filePath"]
        }
      }
    ]
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool call received', {
    tool: name,
    hasArguments: Boolean(args && Object.keys(args).length > 0)
  });

  try {
    let result;

    switch (name) {
      case "list_libraries":
        result = await listLibraries(args || {});
        break;
      case "list_components":
        result = await listComponents(args || {});
        break;
      case "get_component_detail":
        result = await getComponentDetail(args as any);
        break;
      case "get_runtime_surface":
        result = await getRuntimeSurface(args as any);
        break;
      case "generate_wrapper":
        result = await generateWrapper(args as any);
        break;
      case "compose_scene":
        result = await composeScene(args as any);
        break;
      case "import_rive_file":
        result = await importRiveFile(args as any);
        break;
      default:
        logger.warn('Unknown tool requested', { tool: name });
        throw new Error(`Unknown tool: ${name}`);
    }

    logger.debug('Tool call completed', {
      tool: name,
      status: result.status || 'unknown'
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Tool call failed', {
      tool: name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            error: {
              message: error instanceof Error ? error.message : String(error)
            }
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Output connection configuration for consumers
function outputConnectionConfig() {
  const serverPath = process.argv[1] || __filename;
  const config = {
    mcpServers: {
      "astralismotion-rive-mcp": {
        command: "node",
        args: [serverPath]
      }
    }
  };

  console.error("\n" + "=".repeat(80));
  console.error("🎨 Astralis Motion Rive MCP Server");
  console.error("=".repeat(80));
  console.error("\nAdd this configuration to your MCP client settings:\n");
  console.error("For Claude Desktop (~/.config/claude/claude_desktop_config.json):");
  console.error("For Cline (VSCode settings):");
  console.error("For other MCP clients (mcp.json or similar):\n");
  console.error(JSON.stringify(config, null, 2));
  console.error("\n" + "=".repeat(80));
  console.error("Available Tools:");
  console.error("  • import_rive_file     - Import .riv file and auto-generate manifest");
  console.error("  • list_libraries       - List all Rive libraries");
  console.error("  • list_components      - List Rive components");
  console.error("  • get_component_detail - Get component details");
  console.error("  • get_runtime_surface  - Extract state machines & inputs");
  console.error("  • generate_wrapper     - Generate React/Vue/Stencil wrappers");
  console.error("  • compose_scene        - Compose multi-component scenes");
  console.error("=".repeat(80));
  console.error("\n✓ Server ready and listening on stdio\n");
}

// Start server
const transport = new StdioServerTransport();
logger.info('Starting MCP server', {
  serverName: 'astralismotion-rive-mcp',
  version: '0.1.0',
  logLevel: logger.getLevel()
});

server.connect(transport).then(() => {
  logger.info('MCP server connected successfully');
  outputConnectionConfig();
}).catch((error) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  console.error("Failed to start server:", error);
  process.exit(1);
});
