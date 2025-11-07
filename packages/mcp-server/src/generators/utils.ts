import { RuntimeSurface } from "../../../../libs/types/index.d";

/**
 * Converts a component ID to a PascalCase component name
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Converts a component ID to a kebab-case name
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

/**
 * Converts a component ID to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Gets TypeScript type for Rive input type
 */
export function getTypeScriptType(riveType: "bool" | "number" | "string"): string {
  switch (riveType) {
    case "bool":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    default:
      return "any";
  }
}

/**
 * Gets default value for a Rive input type
 */
export function getDefaultValue(
  riveType: "bool" | "number" | "string",
  providedDefault?: any
): string {
  if (providedDefault !== undefined) {
    return typeof providedDefault === "string"
      ? `"${providedDefault}"`
      : String(providedDefault);
  }

  switch (riveType) {
    case "bool":
      return "false";
    case "number":
      return "0";
    case "string":
      return '""';
    default:
      return "undefined";
  }
}

/**
 * Generates JSDoc comment for input
 */
export function generateInputJSDoc(
  inputName: string,
  inputType: "bool" | "number" | "string",
  defaultValue?: any
): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * State machine input: ${inputName}`);
  lines.push(` * @type {${getTypeScriptType(inputType)}}`);
  if (defaultValue !== undefined) {
    lines.push(` * @default ${defaultValue}`);
  }
  lines.push(` */`);
  return lines.join("\n");
}

/**
 * Generates JSDoc comment for event handler
 */
export function generateEventJSDoc(
  eventName: string,
  description?: string
): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * Event handler for: ${eventName}`);
  if (description) {
    lines.push(` * ${description}`);
  }
  lines.push(` */`);
  return lines.join("\n");
}

/**
 * Gets all inputs from all state machines
 */
export function getAllInputs(surface: RuntimeSurface) {
  const inputs = new Map<string, { name: string; type: "bool" | "number" | "string"; defaultValue?: any }>();

  surface.stateMachines.forEach(sm => {
    sm.inputs.forEach(input => {
      inputs.set(input.name, input);
    });
  });

  return Array.from(inputs.values());
}

/**
 * Gets all events from all state machines
 */
export function getAllEvents(surface: RuntimeSurface) {
  const events = new Map<string, { name: string; description?: string }>();

  surface.stateMachines.forEach(sm => {
    sm.events?.forEach(event => {
      events.set(event.name, event);
    });
  });

  return Array.from(events.values());
}
