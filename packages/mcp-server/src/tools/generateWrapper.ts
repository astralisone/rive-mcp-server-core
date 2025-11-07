import * as fs from "fs/promises";
import * as path from "path";
import { RuntimeSurface } from "../../../../libs/types/index.d";
import {
  generateWrapper as generateWrapperCore,
  generateAllWrappers,
  TargetFramework,
  GeneratorContext,
  GeneratedComponent,
} from "../generators";
import { toPascalCase } from "../generators/utils";

export interface GenerateWrapperParams {
  surface: RuntimeSurface;
  framework?: TargetFramework | "all";
  riveSrc: string;
  componentName?: string;
  outputPath?: string;
  writeToFile?: boolean;
}

/**
 * Generates framework-specific wrapper components for Rive animations
 *
 * @param params - Configuration for wrapper generation
 * @returns Generated component code and metadata
 */
export async function generateWrapper(params: GenerateWrapperParams): Promise<any> {
  const {
    surface,
    framework = "react",
    riveSrc,
    componentName: providedName,
    outputPath,
    writeToFile = true,
  } = params;

  // Validate surface
  if (!surface || !surface.componentId) {
    return {
      status: "error",
      message: "Invalid surface: componentId is required",
    };
  }

  if (!surface.stateMachines || surface.stateMachines.length === 0) {
    return {
      status: "error",
      message: "Invalid surface: at least one state machine is required",
    };
  }

  // Generate component name
  const componentName = providedName || toPascalCase(surface.componentId);

  try {
    let results: GeneratedComponent[];

    if (framework === "all") {
      // Generate for all frameworks
      const context = {
        surface,
        componentName,
        riveSrc,
        outputPath,
      };
      results = await generateAllWrappers(context);
    } else {
      // Generate for specific framework
      const context: GeneratorContext = {
        surface,
        framework: framework as TargetFramework,
        componentName,
        riveSrc,
        outputPath,
      };
      results = [await generateWrapperCore(context)];
    }

    // Write to files if requested
    if (writeToFile) {
      for (const result of results) {
        await writeComponentToFile(result);
      }
    }

    return {
      status: "success",
      components: results.map(r => ({
        framework: r.framework,
        componentName: r.componentName,
        filePath: r.filePath,
        codePreview: r.code.substring(0, 500) + (r.code.length > 500 ? "..." : ""),
      })),
      message: `Successfully generated ${results.length} wrapper component(s)`,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: `Failed to generate wrapper: ${error.message}`,
      error: error.stack,
    };
  }
}

/**
 * Writes a generated component to the filesystem
 */
async function writeComponentToFile(component: GeneratedComponent): Promise<void> {
  const dir = path.dirname(component.filePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Handle special case for Stencil (CSS file)
  if (component.framework === "stencil" && component.code.includes("// CSS File:")) {
    const [tsCode, cssSection] = component.code.split("// CSS File:");
    const cssMatch = cssSection.match(/\/\/ (.+\.css)\n([\s\S]+)/);

    if (cssMatch) {
      const [, cssPath, cssCode] = cssMatch;
      // Write TypeScript file
      await fs.writeFile(component.filePath, tsCode.trim(), "utf-8");
      // Write CSS file
      await fs.writeFile(cssPath, cssCode.trim(), "utf-8");
      return;
    }
  }

  // Write component file
  await fs.writeFile(component.filePath, component.code, "utf-8");
}

/**
 * Helper function to generate a wrapper from component ID (convenience method)
 */
export async function generateWrapperFromComponentId(
  componentId: string,
  framework: TargetFramework | "all" = "react",
  riveSrc: string
): Promise<any> {
  // This would typically call getRuntimeSurface first
  // For now, returning a placeholder
  return {
    status: "error",
    message: "This helper requires getRuntimeSurface to be implemented first",
  };
}
