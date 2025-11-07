/**
 * Code generation utilities for creating framework-specific wrappers
 */

import {
  RiveRuntimeSurface,
  RiveComponent,
  GenerateWrapperParams,
} from '../types';

/**
 * Generate React component wrapper
 */
export function generateReactWrapper(
  component: RiveComponent,
  runtimeSurface: RiveRuntimeSurface,
  options: GenerateWrapperParams['options'] = {}
): string {
  const { typescript = true, includeTypes = true } = options;
  const componentName = toPascalCase(component.name);

  const imports = [
    `import React, { useEffect, useRef, useState } from 'react';`,
    `import { useRive, UseRiveParameters } from '@rive-app/react-canvas';`,
  ];

  const propsInterface = includeTypes && typescript ? generatePropsInterface(runtimeSurface) : '';

  const componentCode = `
${imports.join('\n')}

${propsInterface}

export const ${componentName}: React.FC<${typescript ? `${componentName}Props` : 'any'}> = ({
  width = ${runtimeSurface.artboards[0]?.width || 500},
  height = ${runtimeSurface.artboards[0]?.height || 500},
  autoplay = true,
  ${generatePropsList(runtimeSurface)}
  onLoad,
  onStateChange,
  ...riveOptions
}) => {
  const { rive, RiveComponent } = useRive({
    src: '${component.fileUrl || component.filePath}',
    artboard: '${runtimeSurface.artboards[0]?.name || 'Main'}',
    stateMachines: '${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}',
    autoplay,
    ...riveOptions,
  });

  ${generateInputsEffect(runtimeSurface)}

  ${generateEventsEffect(runtimeSurface)}

  return (
    <div style={{ width, height }}>
      <RiveComponent />
    </div>
  );
};
`;

  return componentCode;
}

/**
 * Generate Vue component wrapper
 */
export function generateVueWrapper(
  component: RiveComponent,
  runtimeSurface: RiveRuntimeSurface,
  options: GenerateWrapperParams['options'] = {}
): string {
  const { typescript = true } = options;
  const componentName = toKebabCase(component.name);

  return `
<template>
  <canvas
    ref="canvasRef"
    :width="width"
    :height="height"
  ></canvas>
</template>

<script ${typescript ? 'setup lang="ts"' : 'setup'}>
import { ref, onMounted, watch } from 'vue';
import { Rive } from '@rive-app/canvas';

${generateVueProps(runtimeSurface, typescript)}

const canvasRef = ref${typescript ? '<HTMLCanvasElement | null>' : ''}(null);
let riveInstance${typescript ? ': Rive | null' : ''} = null;

onMounted(() => {
  if (canvasRef.value) {
    riveInstance = new Rive({
      src: '${component.fileUrl || component.filePath}',
      canvas: canvasRef.value,
      artboard: '${runtimeSurface.artboards[0]?.name || 'Main'}',
      stateMachines: '${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}',
      autoplay: props.autoplay,
      onLoad: () => {
        ${generateVueInputsSetup(runtimeSurface)}
        if (props.onLoad) props.onLoad();
      },
    });
  }
});

${generateVueWatchers(runtimeSurface)}
</script>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
}
</style>
`;
}

/**
 * Generate Stencil web component wrapper
 */
export function generateStencilWrapper(
  component: RiveComponent,
  runtimeSurface: RiveRuntimeSurface,
  options: GenerateWrapperParams['options'] = {}
): string {
  const componentName = toKebabCase(component.name);
  const className = toPascalCase(component.name);

  return `
import { Component, Element, Prop, Event, EventEmitter, h, Watch } from '@stencil/core';
import { Rive } from '@rive-app/canvas';

@Component({
  tag: '${componentName}',
  styleUrl: '${componentName}.css',
  shadow: true,
})
export class ${className} {
  @Element() el!: HTMLElement;

  ${generateStencilProps(runtimeSurface)}

  ${generateStencilEvents(runtimeSurface)}

  private canvasEl?: HTMLCanvasElement;
  private riveInstance?: Rive;

  componentDidLoad() {
    this.initRive();
  }

  disconnectedCallback() {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
    }
  }

  private initRive() {
    if (this.canvasEl) {
      this.riveInstance = new Rive({
        src: '${component.fileUrl || component.filePath}',
        canvas: this.canvasEl,
        artboard: '${runtimeSurface.artboards[0]?.name || 'Main'}',
        stateMachines: '${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}',
        autoplay: this.autoplay,
        onLoad: () => {
          ${generateStencilInputsSetup(runtimeSurface)}
          this.loadEvent.emit();
        },
      });
    }
  }

  ${generateStencilWatchers(runtimeSurface)}

  render() {
    return (
      <canvas
        ref={(el) => (this.canvasEl = el as HTMLCanvasElement)}
        width={this.width}
        height={this.height}
      ></canvas>
    );
  }
}
`;
}

/**
 * Generate Angular component wrapper
 */
export function generateAngularWrapper(
  component: RiveComponent,
  runtimeSurface: RiveRuntimeSurface,
  options: GenerateWrapperParams['options'] = {}
): string {
  const componentName = toPascalCase(component.name);
  const selector = toKebabCase(component.name);

  return `
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Rive } from '@rive-app/canvas';

@Component({
  selector: 'app-${selector}',
  template: \`
    <canvas
      #canvas
      [width]="width"
      [height]="height"
    ></canvas>
  \`,
  styleUrls: ['./${selector}.component.css']
})
export class ${componentName}Component implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  ${generateAngularInputs(runtimeSurface)}

  ${generateAngularOutputs(runtimeSurface)}

  private riveInstance?: Rive;

  ngOnInit() {
    this.initRive();
  }

  ngOnDestroy() {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
    }
  }

  private initRive() {
    this.riveInstance = new Rive({
      src: '${component.fileUrl || component.filePath}',
      canvas: this.canvasRef.nativeElement,
      artboard: '${runtimeSurface.artboards[0]?.name || 'Main'}',
      stateMachines: '${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}',
      autoplay: this.autoplay,
      onLoad: () => {
        ${generateAngularInputsSetup(runtimeSurface)}
        this.load.emit();
      },
    });
  }

  ${generateAngularSetters(runtimeSurface)}
}
`;
}

/**
 * Generate Svelte component wrapper
 */
export function generateSvelteWrapper(
  component: RiveComponent,
  runtimeSurface: RiveRuntimeSurface,
  options: GenerateWrapperParams['options'] = {}
): string {
  const { typescript = true } = options;

  return `
<script ${typescript ? 'lang="ts"' : ''}>
  import { onMount } from 'svelte';
  import { Rive } from '@rive-app/canvas';

  ${generateSvelteProps(runtimeSurface)}

  let canvasEl${typescript ? ': HTMLCanvasElement' : ''};
  let riveInstance${typescript ? ': Rive | null' : ''} = null;

  onMount(() => {
    riveInstance = new Rive({
      src: '${component.fileUrl || component.filePath}',
      canvas: canvasEl,
      artboard: '${runtimeSurface.artboards[0]?.name || 'Main'}',
      stateMachines: '${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}',
      autoplay,
      onLoad: () => {
        ${generateSvelteInputsSetup(runtimeSurface)}
      },
    });

    return () => {
      if (riveInstance) {
        riveInstance.cleanup();
      }
    };
  });

  ${generateSvelteReactiveStatements(runtimeSurface)}
</script>

<canvas
  bind:this={canvasEl}
  {width}
  {height}
></canvas>

<style>
  canvas {
    width: 100%;
    height: 100%;
  }
</style>
`;
}

// Helper functions

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function generatePropsInterface(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  const inputProps = inputs.map((input) => {
    const type = input.type === 'bool' ? 'boolean' : input.type === 'number' ? 'number' : 'void';
    return `  ${input.name}?: ${type};`;
  });

  return `
interface ${runtimeSurface.componentId}Props {
  width?: number;
  height?: number;
  autoplay?: boolean;
  ${inputProps.join('\n  ')}
  onLoad?: () => void;
  onStateChange?: (stateName: string) => void;
}`;
}

function generatePropsList(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  return inputs.map((input) => `${input.name},`).join('\n  ');
}

function generateInputsEffect(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  const effects = inputs.map((input) => {
    return `
  useEffect(() => {
    if (rive && ${input.name} !== undefined) {
      const input = rive.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name || 'State Machine 1'}')?.find(i => i.name === '${input.name}');
      if (input) {
        ${input.type === 'trigger' ? `input.fire();` : `input.value = ${input.name};`}
      }
    }
  }, [rive, ${input.name}]);`;
  });

  return effects.join('\n');
}

function generateEventsEffect(runtimeSurface: RiveRuntimeSurface): string {
  const events = runtimeSurface.events || [];
  if (events.length === 0) return '';

  return `
  useEffect(() => {
    if (rive) {
      rive.on('statechange', (event: any) => {
        if (onStateChange) onStateChange(event.data[0]);
      });
    }
  }, [rive, onStateChange]);`;
}

function generateVueProps(runtimeSurface: RiveRuntimeSurface, typescript: boolean): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  const props = [
    `width: { type: Number, default: ${runtimeSurface.artboards[0]?.width || 500} }`,
    `height: { type: Number, default: ${runtimeSurface.artboards[0]?.height || 500} }`,
    `autoplay: { type: Boolean, default: true }`,
    ...inputs.map((input) => {
      const type = input.type === 'bool' ? 'Boolean' : input.type === 'number' ? 'Number' : 'Function';
      return `${input.name}: { type: ${type}, default: ${input.defaultValue ?? 'undefined'} }`;
    }),
  ];

  return typescript
    ? `const props = defineProps<{\n  ${props.map(p => p.replace(/: \{.*\}/, '')).join(',\n  ')}\n}>();`
    : `const props = defineProps({\n  ${props.join(',\n  ')}\n});`;
}

function generateVueInputsSetup(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  return inputs.map((input) => {
    return `        const ${input.name}Input = riveInstance.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name}').find(i => i.name === '${input.name}');`;
  }).join('\n');
}

function generateVueWatchers(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  return inputs.map((input) => {
    return `
watch(() => props.${input.name}, (value) => {
  if (riveInstance) {
    const input = riveInstance.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name}').find(i => i.name === '${input.name}');
    if (input) {
      ${input.type === 'trigger' ? 'input.fire();' : 'input.value = value;'}
    }
  }
});`;
  }).join('\n');
}

function generateStencilProps(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  const props = [
    `@Prop() width: number = ${runtimeSurface.artboards[0]?.width || 500};`,
    `@Prop() height: number = ${runtimeSurface.artboards[0]?.height || 500};`,
    `@Prop() autoplay: boolean = true;`,
    ...inputs.map((input) => {
      const type = input.type === 'bool' ? 'boolean' : input.type === 'number' ? 'number' : 'void';
      return `@Prop() ${input.name}?: ${type};`;
    }),
  ];

  return props.join('\n  ');
}

function generateStencilEvents(runtimeSurface: RiveRuntimeSurface): string {
  return `@Event() loadEvent!: EventEmitter<void>;\n  @Event() stateChangeEvent!: EventEmitter<string>;`;
}

function generateStencilInputsSetup(runtimeSurface: RiveRuntimeSurface): string {
  return `this.updateInputs();`;
}

function generateStencilWatchers(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  return inputs.map((input) => {
    return `
  @Watch('${input.name}')
  ${input.name}Changed() {
    this.updateInput('${input.name}', this.${input.name});
  }

  private updateInput(name: string, value: any) {
    if (this.riveInstance) {
      const input = this.riveInstance.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name}')?.find(i => i.name === name);
      if (input) {
        ${input.type === 'trigger' ? 'input.fire();' : 'input.value = value;'}
      }
    }
  }`;
  }).join('\n');
}

function generateAngularInputs(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  const props = [
    `@Input() width: number = ${runtimeSurface.artboards[0]?.width || 500};`,
    `@Input() height: number = ${runtimeSurface.artboards[0]?.height || 500};`,
    `@Input() autoplay: boolean = true;`,
    ...inputs.map((input) => {
      const type = input.type === 'bool' ? 'boolean' : input.type === 'number' ? 'number' : 'void';
      return `@Input() ${input.name}?: ${type};`;
    }),
  ];

  return props.join('\n  ');
}

function generateAngularOutputs(runtimeSurface: RiveRuntimeSurface): string {
  return `@Output() load = new EventEmitter<void>();\n  @Output() stateChange = new EventEmitter<string>();`;
}

function generateAngularInputsSetup(runtimeSurface: RiveRuntimeSurface): string {
  return `this.updateInputs();`;
}

function generateAngularSetters(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  return `
  private updateInputs() {
    if (this.riveInstance) {
      const stateMachineInputs = this.riveInstance.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name}');
      ${inputs.map((input) => {
        return `
      const ${input.name}Input = stateMachineInputs?.find(i => i.name === '${input.name}');
      if (${input.name}Input && this.${input.name} !== undefined) {
        ${input.type === 'trigger' ? `${input.name}Input.fire();` : `${input.name}Input.value = this.${input.name};`}
      }`;
      }).join('')}
    }
  }`;
}

function generateSvelteProps(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  const props = [
    `export let width = ${runtimeSurface.artboards[0]?.width || 500};`,
    `export let height = ${runtimeSurface.artboards[0]?.height || 500};`,
    `export let autoplay = true;`,
    ...inputs.map((input) => `export let ${input.name} = ${input.defaultValue ?? 'undefined'};`),
  ];

  return props.join('\n  ');
}

function generateSvelteInputsSetup(runtimeSurface: RiveRuntimeSurface): string {
  return `updateInputs();`;
}

function generateSvelteReactiveStatements(runtimeSurface: RiveRuntimeSurface): string {
  const inputs = runtimeSurface.stateMachines[0]?.inputs || [];
  if (inputs.length === 0) return '';

  return `
  function updateInputs() {
    if (riveInstance) {
      const stateMachineInputs = riveInstance.stateMachineInputs('${runtimeSurface.stateMachines[0]?.name}');
      ${inputs.map((input) => {
        return `
      const ${input.name}Input = stateMachineInputs?.find(i => i.name === '${input.name}');
      if (${input.name}Input && ${input.name} !== undefined) {
        ${input.type === 'trigger' ? `${input.name}Input.fire();` : `${input.name}Input.value = ${input.name};`}
      }`;
      }).join('')}
    }
  }

  ${inputs.map((input) => `$: ${input.name}, updateInputs();`).join('\n  ')}`;
}
