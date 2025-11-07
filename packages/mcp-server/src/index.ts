import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { listLibraries } from "./tools/listLibraries.js";
import { listComponents } from "./tools/listComponents.js";
import { getComponentDetail } from "./tools/getComponentDetail.js";
import { getRuntimeSurface } from "./tools/getRuntimeSurface.js";
import { generateWrapper } from "./tools/generateWrapper.js";
import { composeScene } from "./tools/composeScene.js";

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
      }
    ]
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
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

// Start server
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("Astralis Motion Rive MCP Server running on stdio");
}).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
