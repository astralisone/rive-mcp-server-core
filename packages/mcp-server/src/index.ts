import { createServer } from "@modelcontextprotocol/sdk/server";
import { listLibraries } from "./tools/listLibraries";
import { listComponents } from "./tools/listComponents";
import { getComponentDetail } from "./tools/getComponentDetail";
import { getRuntimeSurface } from "./tools/getRuntimeSurface";
import { generateWrapper } from "./tools/generateWrapper";
import { composeScene } from "./tools/composeScene";

const server = createServer({
  name: "astralismotion-rive-mcp",
  version: "0.1.0"
});

server.tool("list_libraries", async () => listLibraries({}));
server.tool("list_components", async (params) => listComponents(params));
server.tool("get_component_detail", async ({ id }) => getComponentDetail({ id }));
server.tool("get_runtime_surface", async ({ componentId }) => getRuntimeSurface({ componentId }));
server.tool("generate_wrapper", async (params) => generateWrapper(params));
server.tool("compose_scene", async (params) => composeScene(params));

server.start();
