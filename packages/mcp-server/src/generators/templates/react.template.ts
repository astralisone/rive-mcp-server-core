import { GeneratorContext, GeneratedComponent } from "../types";
import {
  toPascalCase,
  getAllInputs,
  getAllEvents,
  getTypeScriptType,
  getDefaultValue,
} from "../utils";

export function generateReactComponent(context: GeneratorContext): string {
  const { surface, componentName, riveSrc } = context;
  const inputs = getAllInputs(surface);
  const events = getAllEvents(surface);
  const stateMachineName = surface.stateMachines[0]?.name || "DefaultSM";

  // Generate props interface
  const propsInterface = generatePropsInterface(componentName, inputs, events);

  // Generate input hooks and effects
  const inputHooks = inputs.map(input =>
    `  const ${input.name}Input = useStateMachineInput(rive, "${stateMachineName}", "${input.name}");`
  ).join("\n");

  const inputEffects = inputs.map(input => `
  useEffect(() => {
    if (${input.name}Input) ${input.name}Input.value = ${input.name};
  }, [${input.name}, ${input.name}Input]);`
  ).join("\n");

  // Generate event handlers
  const eventHandlers = events.map(event => `
  useEffect(() => {
    if (!rive || !on${toPascalCase(event.name)}) return;
    const handler = (riveEvent: any) => {
      if (riveEvent.data?.name === "${event.name}") {
        on${toPascalCase(event.name)}(riveEvent.data);
      }
    };
    rive.on("event", handler);
    return () => {
      rive.off("event", handler);
    };
  }, [rive, on${toPascalCase(event.name)}]);`
  ).join("\n");

  // Generate component code
  return `import React, { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

${propsInterface}

/**
 * ${componentName} - A Rive-powered component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * @component
 */
export const ${componentName}: React.FC<${componentName}Props> = ({
${inputs.map(input => `  ${input.name}`).join(",\n")}${events.length > 0 ? "," : ""}
${events.map(event => `  on${toPascalCase(event.name)}`).join(",\n")}
}) => {
  const { rive, RiveComponent } = useRive({
    src: "${riveSrc}",
    stateMachines: ["${stateMachineName}"],
    autoplay: true
  });

${inputHooks}
${inputEffects}
${eventHandlers}

  return (
    <div className="${componentName.toLowerCase()}-wrapper">
      <RiveComponent />
    </div>
  );
};
`;
}

function generatePropsInterface(
  componentName: string,
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>,
  events: Array<{ name: string; description?: string }>
): string {
  const lines: string[] = [];

  lines.push(`type ${componentName}Props = {`);

  // Add input props with JSDoc
  inputs.forEach(input => {
    lines.push(`  /**`);
    lines.push(`   * State machine input: ${input.name}`);
    if (input.defaultValue !== undefined) {
      lines.push(`   * @default ${input.defaultValue}`);
    }
    lines.push(`   */`);
    lines.push(`  ${input.name}: ${getTypeScriptType(input.type)};`);
  });

  // Add event handler props with JSDoc
  events.forEach(event => {
    lines.push(`  /**`);
    lines.push(`   * Event handler for: ${event.name}`);
    if (event.description) {
      lines.push(`   * ${event.description}`);
    }
    lines.push(`   */`);
    lines.push(`  on${toPascalCase(event.name)}?: (payload: any) => void;`);
  });

  lines.push(`};`);

  return lines.join("\n");
}

export async function generateReact(context: GeneratorContext): Promise<GeneratedComponent> {
  const code = generateReactComponent(context);
  const filePath = context.outputPath ||
    `/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/${context.componentName}.tsx`;

  return {
    code,
    filePath,
    framework: "react",
    componentName: context.componentName,
  };
}
