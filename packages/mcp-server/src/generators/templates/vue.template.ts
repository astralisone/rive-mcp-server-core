import { GeneratorContext, GeneratedComponent } from "../types";
import {
  toPascalCase,
  toKebabCase,
  getAllInputs,
  getAllEvents,
  getTypeScriptType,
} from "../utils";

export function generateVueComponent(context: GeneratorContext): string {
  const { surface, componentName, riveSrc } = context;
  const inputs = getAllInputs(surface);
  const events = getAllEvents(surface);
  const stateMachineName = surface.stateMachines[0]?.name || "DefaultSM";
  const kebabName = toKebabCase(componentName);

  // Generate props definitions
  const propsDefinition = generatePropsDefinition(inputs);

  // Generate emits definitions
  const emitsDefinition = events.length > 0
    ? generateEmitsDefinition(events)
    : "";

  // Generate input watchers
  const inputWatchers = inputs.map(input => `
  watch(() => props.${input.name}, (newValue) => {
    if (stateMachineInputs.value.${input.name}) {
      stateMachineInputs.value.${input.name}.value = newValue;
    }
  });`).join("\n");

  // Generate event listener setup
  const eventSetup = events.length > 0 ? `
  // Event listeners
  onMounted(() => {
    if (!riveInstance.value) return;

    const handleRiveEvent = (event: any) => {
${events.map(event => `      if (event.data?.name === "${event.name}") {
        emit("${toKebabCase(event.name)}", event.data);
      }`).join("\n")}
    };

    riveInstance.value.on("event", handleRiveEvent);

    onUnmounted(() => {
      riveInstance.value?.off("event", handleRiveEvent);
    });
  });` : "";

  return `<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useRive } from "@rive-app/vue-canvas";

${propsDefinition}

${emitsDefinition}

/**
 * ${componentName} - A Rive-powered Vue component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 */

const canvasRef = ref<HTMLCanvasElement | null>(null);

const { rive: riveInstance, setCanvasRef } = useRive({
  src: "${riveSrc}",
  stateMachines: "${stateMachineName}",
  autoplay: true,
});

// Get state machine inputs
const stateMachineInputs = computed(() => {
  if (!riveInstance.value) return {};

  const stateMachine = riveInstance.value.stateMachineInputs("${stateMachineName}");
  return {
${inputs.map(input => `    ${input.name}: stateMachine?.find((input: any) => input.name === "${input.name}")`).join(",\n")}
  };
});

// Watch for prop changes and update inputs
${inputWatchers}
${eventSetup}

onMounted(() => {
  if (canvasRef.value) {
    setCanvasRef(canvasRef.value);
  }
});
</script>

<template>
  <div class="${kebabName}-wrapper">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.${kebabName}-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.${kebabName}-wrapper canvas {
  width: 100%;
  height: 100%;
}
</style>
`;
}

function generatePropsDefinition(
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>
): string {
  if (inputs.length === 0) return "";

  const lines: string[] = [];
  lines.push("interface Props {");

  inputs.forEach(input => {
    lines.push(`  /**`);
    lines.push(`   * State machine input: ${input.name}`);
    if (input.defaultValue !== undefined) {
      lines.push(`   * @default ${input.defaultValue}`);
    }
    lines.push(`   */`);
    lines.push(`  ${input.name}: ${getTypeScriptType(input.type)};`);
  });

  lines.push("}");
  lines.push("");
  lines.push("const props = defineProps<Props>();");

  return lines.join("\n");
}

function generateEmitsDefinition(
  events: Array<{ name: string; description?: string }>
): string {
  if (events.length === 0) return "";

  const lines: string[] = [];
  lines.push("interface Emits {");

  events.forEach(event => {
    lines.push(`  /**`);
    lines.push(`   * Emitted when: ${event.name}`);
    if (event.description) {
      lines.push(`   * ${event.description}`);
    }
    lines.push(`   */`);
    lines.push(`  (event: "${toKebabCase(event.name)}", payload: any): void;`);
  });

  lines.push("}");
  lines.push("");
  lines.push("const emit = defineEmits<Emits>();");

  return lines.join("\n");
}

export async function generateVue(context: GeneratorContext): Promise<GeneratedComponent> {
  const code = generateVueComponent(context);
  const filePath = context.outputPath ||
    `/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/${context.componentName}.vue`;

  return {
    code,
    filePath,
    framework: "vue",
    componentName: context.componentName,
  };
}
