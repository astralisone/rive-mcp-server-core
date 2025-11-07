import { FrameworkGenerator, GeneratorContext, GeneratedComponent, TargetFramework } from "./types";
import { generateReact } from "./templates/react.template";
import { generateVue } from "./templates/vue.template";
import { generateStencil } from "./templates/stencil.template";
import { toPascalCase } from "./utils";

/**
 * Registry of framework generators
 */
const generators: Record<TargetFramework, FrameworkGenerator> = {
  react: {
    framework: "react",
    fileExtension: ".tsx",
    generate: generateReact,
  },
  vue: {
    framework: "vue",
    fileExtension: ".vue",
    generate: generateVue,
  },
  stencil: {
    framework: "stencil",
    fileExtension: ".tsx",
    generate: generateStencil,
  },
};

/**
 * Gets a framework generator by name
 */
export function getGenerator(framework: TargetFramework): FrameworkGenerator {
  const generator = generators[framework];
  if (!generator) {
    throw new Error(`Unsupported framework: ${framework}. Supported frameworks: ${Object.keys(generators).join(", ")}`);
  }
  return generator;
}

/**
 * Generates a wrapper component for the specified framework
 */
export async function generateWrapper(
  context: GeneratorContext
): Promise<GeneratedComponent> {
  const generator = getGenerator(context.framework);
  return generator.generate(context);
}

/**
 * Generates wrappers for all supported frameworks
 */
export async function generateAllWrappers(
  context: Omit<GeneratorContext, "framework">
): Promise<GeneratedComponent[]> {
  const frameworks: TargetFramework[] = ["react", "vue", "stencil"];
  const results: GeneratedComponent[] = [];

  for (const framework of frameworks) {
    const fullContext: GeneratorContext = {
      ...context,
      framework,
    };
    results.push(await generateWrapper(fullContext));
  }

  return results;
}

export * from "./types";
export * from "./utils";
