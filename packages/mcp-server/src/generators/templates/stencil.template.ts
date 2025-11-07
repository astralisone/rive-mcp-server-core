import { GeneratorContext, GeneratedComponent } from "../types";
import {
  toPascalCase,
  toKebabCase,
  getAllInputs,
  getAllEvents,
  getTypeScriptType,
  getDefaultValue,
} from "../utils";

export function generateStencilComponent(context: GeneratorContext): string {
  const { surface, componentName, riveSrc } = context;
  const inputs = getAllInputs(surface);
  const events = getAllEvents(surface);
  const stateMachineName = surface.stateMachines[0]?.name || "DefaultSM";
  const kebabName = toKebabCase(componentName);

  // Generate property declarations
  const propertyDeclarations = inputs.map(input => `
  /**
   * State machine input: ${input.name}
   */
  @Prop() ${input.name}!: ${getTypeScriptType(input.type)};`
  ).join("\n");

  // Generate event declarations
  const eventDeclarations = events.map(event => `
  /**
   * Emitted when: ${event.name}${event.description ? ` - ${event.description}` : ""}
   */
  @Event() ${toKebabCase(event.name)}: EventEmitter<any>;`
  ).join("\n");

  // Generate watch handlers
  const watchHandlers = inputs.map(input => `
  @Watch("${input.name}")
  handle${toPascalCase(input.name)}Change(newValue: ${getTypeScriptType(input.type)}) {
    if (this.rive && this.stateMachineInputs.${input.name}) {
      this.stateMachineInputs.${input.name}.value = newValue;
    }
  }`
  ).join("\n");

  // Generate event handler setup
  const eventHandlerSetup = events.length > 0 ? `
    // Set up event listeners
    this.rive.on("event", (event: any) => {
${events.map(event => `      if (event.data?.name === "${event.name}") {
        this.${toKebabCase(event.name)}.emit(event.data);
      }`).join("\n")}
    });` : "";

  return `import { Component, Prop, Element, Watch, Event, EventEmitter, h } from "@stencil/core";
import { Rive } from "@rive-app/canvas";

/**
 * ${componentName} - A Rive-powered web component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * @slot default - Default slot content
 */
@Component({
  tag: "${kebabName}",
  styleUrl: "${kebabName}.css",
  shadow: true,
})
export class ${componentName} {
  @Element() el!: HTMLElement;

  private canvasElement?: HTMLCanvasElement;
  private rive?: Rive;
  private stateMachineInputs: any = {};
${propertyDeclarations}
${eventDeclarations}

  componentDidLoad() {
    this.initializeRive();
  }

  disconnectedCallback() {
    this.cleanup();
  }
${watchHandlers}

  private initializeRive() {
    if (!this.canvasElement) return;

    this.rive = new Rive({
      src: "${riveSrc}",
      canvas: this.canvasElement,
      stateMachines: "${stateMachineName}",
      autoplay: true,
      onLoad: () => {
        this.setupStateMachine();
      },
    });
  }

  private setupStateMachine() {
    if (!this.rive) return;

    // Get state machine inputs
    const inputs = this.rive.stateMachineInputs("${stateMachineName}");
    if (!inputs) return;

    this.stateMachineInputs = {
${inputs.map(input => `      ${input.name}: inputs.find((input: any) => input.name === "${input.name}")`).join(",\n")}
    };

    // Set initial values
${inputs.map(input => `    if (this.${input.name} !== undefined && this.stateMachineInputs.${input.name}) {
      this.stateMachineInputs.${input.name}.value = this.${input.name};
    }`).join("\n")}
${eventHandlerSetup}
  }

  private cleanup() {
    if (this.rive) {
      this.rive.cleanup();
      this.rive = undefined;
    }
  }

  render() {
    return (
      <div class="${kebabName}-wrapper">
        <canvas
          ref={(el) => (this.canvasElement = el as HTMLCanvasElement)}
        ></canvas>
      </div>
    );
  }
}
`;
}

export function generateStencilCSS(componentName: string): string {
  const kebabName = toKebabCase(componentName);

  return `:host {
  display: block;
  width: 100%;
  height: 100%;
}

.${kebabName}-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
`;
}

export async function generateStencil(context: GeneratorContext): Promise<GeneratedComponent> {
  const code = generateStencilComponent(context);
  const cssCode = generateStencilCSS(context.componentName);
  const kebabName = toKebabCase(context.componentName);

  const filePath = context.outputPath ||
    `/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/${kebabName}.tsx`;

  const cssFilePath = `/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/${kebabName}.css`;

  return {
    code: code + "\n\n// CSS File:\n// " + cssFilePath + "\n" + cssCode,
    filePath,
    framework: "stencil",
    componentName: context.componentName,
  };
}
