/**
 * Runtime Code Generator
 *
 * Generates framework-specific runtime code for scene playback
 * from scene composition specifications.
 */

import type { SceneComposition } from '../types/scene-spec';

/**
 * Code generation options
 */
export interface CodeGenOptions {
  framework: 'react' | 'vue' | 'stencil' | 'vanilla';
  typescript?: boolean;
  includeTypes?: boolean;
  outputPath?: string;
  componentLibrary?: string;
}

/**
 * Generated code result
 */
export interface GeneratedCode {
  code: string;
  imports: string[];
  types?: string;
  filename: string;
}

/**
 * Runtime code generator
 */
export class RuntimeGenerator {
  /**
   * Generate runtime code for a scene
   */
  generate(
    spec: SceneComposition,
    options: CodeGenOptions
  ): GeneratedCode {
    switch (options.framework) {
      case 'react':
        return this.generateReact(spec, options);
      case 'vue':
        return this.generateVue(spec, options);
      case 'stencil':
        return this.generateStencil(spec, options);
      case 'vanilla':
        return this.generateVanilla(spec, options);
      default:
        throw new Error(`Unsupported framework: ${options.framework}`);
    }
  }

  /**
   * Generate React component
   */
  private generateReact(
    spec: SceneComposition,
    options: CodeGenOptions
  ): GeneratedCode {
    const ts = options.typescript ?? true;
    const ext = ts ? 'tsx' : 'jsx';

    const imports = [
      `import React, { useEffect, useRef, useState } from 'react';`,
      `import { SceneRuntime } from '@astralismotion/scene-composer';`,
    ];

    // Add component imports
    for (const component of spec.components) {
      imports.push(
        `import { ${component.name}Component } from '${options.componentLibrary || '@components'}';`
      );
    }

    const propsInterface = ts
      ? this.generatePropsInterface(spec)
      : '';

    const componentCode = `
${propsInterface}

export const ${this.toPascalCase(spec.id)}Scene${ts ? ': React.FC<SceneProps>' : ''} = (props) => {
  const canvasRef = useRef${ts ? '<HTMLCanvasElement>(null)' : '(null)'};
  const runtimeRef = useRef${ts ? '<SceneRuntime | null>(null)' : '(null)'};
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize scene runtime
    const runtime = new SceneRuntime({
      spec: sceneSpec,
      canvas: canvasRef.current,
      autoPlay: props.autoPlay ?? true,
      inputs: props.inputs,
      onEvent: props.onEvent,
      onStateChange: props.onStateChange,
      onError: props.onError,
    });

    runtimeRef.current = runtime;

    runtime.initialize().then(() => {
      setIsReady(true);
      if (props.onReady) {
        props.onReady(runtime);
      }
    });

    return () => {
      runtime.dispose();
    };
  }, []);

  // Update inputs when they change
  useEffect(() => {
    if (runtimeRef.current && props.inputs) {
      runtimeRef.current.setInputs(props.inputs);
    }
  }, [props.inputs]);

  return (
    <div className="scene-container" style={{
      width: '${spec.viewport.width}${spec.viewport.unit || 'px'}',
      height: '${spec.viewport.height}${spec.viewport.unit || 'px'}',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        width={${spec.viewport.width}}
        height={${spec.viewport.height}}
        style={{ width: '100%', height: '100%' }}
      />
      {!isReady && props.loading && (
        <div className="scene-loading">{props.loading}</div>
      )}
    </div>
  );
};

// Scene specification
const sceneSpec${ts ? ': SceneComposition' : ''} = ${JSON.stringify(spec, null, 2)};
`;

    return {
      code: componentCode,
      imports,
      types: ts ? this.generateTypeDefinitions(spec) : undefined,
      filename: `${spec.id}-scene.${ext}`,
    };
  }

  /**
   * Generate Vue component
   */
  private generateVue(
    spec: SceneComposition,
    options: CodeGenOptions
  ): GeneratedCode {
    const ts = options.typescript ?? true;

    const imports = [
      `import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';`,
      `import { SceneRuntime } from '@astralismotion/scene-composer';`,
    ];

    const componentCode = `
${ts ? `import type { SceneComposition } from '@astralismotion/scene-composer';` : ''}

export default defineComponent({
  name: '${this.toPascalCase(spec.id)}Scene',
  props: {
    autoPlay: {
      type: Boolean,
      default: true,
    },
    inputs: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['ready', 'event', 'stateChange', 'error'],
  setup(props, { emit }) {
    const canvasRef = ref${ts ? '<HTMLCanvasElement | null>' : ''}(null);
    const runtime = ref${ts ? '<SceneRuntime | null>' : ''}(null);
    const isReady = ref(false);

    onMounted(async () => {
      if (!canvasRef.value) return;

      runtime.value = new SceneRuntime({
        spec: sceneSpec,
        canvas: canvasRef.value,
        autoPlay: props.autoPlay,
        inputs: props.inputs,
        onEvent: (name, payload) => emit('event', { name, payload }),
        onStateChange: (from, to) => emit('stateChange', { from, to }),
        onError: (error) => emit('error', error),
      });

      await runtime.value.initialize();
      isReady.value = true;
      emit('ready', runtime.value);
    });

    onUnmounted(() => {
      runtime.value?.dispose();
    });

    // Watch inputs for changes
    watch(() => props.inputs, (newInputs) => {
      runtime.value?.setInputs(newInputs);
    }, { deep: true });

    return {
      canvasRef,
      isReady,
    };
  },
  template: \`
    <div class="scene-container" :style="{
      width: '${spec.viewport.width}${spec.viewport.unit || 'px'}',
      height: '${spec.viewport.height}${spec.viewport.unit || 'px'}',
      position: 'relative'
    }">
      <canvas
        ref="canvasRef"
        :width="${spec.viewport.width}"
        :height="${spec.viewport.height}"
        style="width: 100%; height: 100%;"
      />
      <div v-if="!isReady" class="scene-loading">
        <slot name="loading">Loading...</slot>
      </div>
    </div>
  \`,
});

const sceneSpec${ts ? ': SceneComposition' : ''} = ${JSON.stringify(spec, null, 2)};
`;

    return {
      code: componentCode,
      imports,
      types: ts ? this.generateTypeDefinitions(spec) : undefined,
      filename: `${spec.id}-scene.vue`,
    };
  }

  /**
   * Generate Stencil component
   */
  private generateStencil(
    spec: SceneComposition,
    options: CodeGenOptions
  ): GeneratedCode {
    const imports = [
      `import { Component, Prop, h, Element, State, Watch } from '@stencil/core';`,
      `import { SceneRuntime } from '@astralismotion/scene-composer';`,
      `import type { SceneComposition } from '@astralismotion/scene-composer';`,
    ];

    const componentCode = `
@Component({
  tag: '${this.toKebabCase(spec.id)}-scene',
  styleUrl: '${spec.id}-scene.css',
  shadow: true,
})
export class ${this.toPascalCase(spec.id)}Scene {
  @Element() el: HTMLElement;

  @Prop() autoPlay: boolean = true;
  @Prop() inputs: Record<string, any> = {};

  @State() isReady: boolean = false;

  private canvasRef: HTMLCanvasElement;
  private runtime: SceneRuntime | null = null;

  async componentDidLoad() {
    if (!this.canvasRef) return;

    this.runtime = new SceneRuntime({
      spec: sceneSpec,
      canvas: this.canvasRef,
      autoPlay: this.autoPlay,
      inputs: this.inputs,
      onEvent: (name, payload) => {
        this.el.dispatchEvent(new CustomEvent('sceneEvent', {
          detail: { name, payload },
          bubbles: true,
          composed: true,
        }));
      },
      onStateChange: (from, to) => {
        this.el.dispatchEvent(new CustomEvent('sceneStateChange', {
          detail: { from, to },
          bubbles: true,
          composed: true,
        }));
      },
      onError: (error) => {
        this.el.dispatchEvent(new CustomEvent('sceneError', {
          detail: error,
          bubbles: true,
          composed: true,
        }));
      },
    });

    await this.runtime.initialize();
    this.isReady = true;
  }

  disconnectedCallback() {
    this.runtime?.dispose();
  }

  @Watch('inputs')
  watchInputs(newInputs: Record<string, any>) {
    this.runtime?.setInputs(newInputs);
  }

  render() {
    return (
      <div class="scene-container" style={{
        width: '${spec.viewport.width}${spec.viewport.unit || 'px'}',
        height: '${spec.viewport.height}${spec.viewport.unit || 'px'}',
        position: 'relative',
      }}>
        <canvas
          ref={(el) => (this.canvasRef = el)}
          width={${spec.viewport.width}}
          height={${spec.viewport.height}}
          style={{ width: '100%', height: '100%' }}
        />
        {!this.isReady && (
          <div class="scene-loading">
            <slot name="loading">Loading...</slot>
          </div>
        )}
      </div>
    );
  }
}

const sceneSpec: SceneComposition = ${JSON.stringify(spec, null, 2)};
`;

    return {
      code: componentCode,
      imports,
      types: this.generateTypeDefinitions(spec),
      filename: `${spec.id}-scene.tsx`,
    };
  }

  /**
   * Generate vanilla JavaScript runtime
   */
  private generateVanilla(
    spec: SceneComposition,
    options: CodeGenOptions
  ): GeneratedCode {
    const ts = options.typescript ?? false;
    const ext = ts ? 'ts' : 'js';

    const imports = [
      `import { SceneRuntime } from '@astralismotion/scene-composer';`,
    ];

    const code = `
${ts ? `import type { SceneComposition, SceneRuntimeConfig } from '@astralismotion/scene-composer';` : ''}

/**
 * Initialize ${spec.name} scene
 */
export async function initialize${this.toPascalCase(spec.id)}Scene(
  canvas${ts ? ': HTMLCanvasElement | string' : ''},
  options${ts ? '?: Partial<SceneRuntimeConfig>' : ''} = {}
)${ts ? ': Promise<SceneRuntime>' : ''} {
  const runtime = new SceneRuntime({
    spec: sceneSpec,
    canvas,
    autoPlay: true,
    ...options,
  });

  await runtime.initialize();
  return runtime;
}

// Scene specification
const sceneSpec${ts ? ': SceneComposition' : ''} = ${JSON.stringify(spec, null, 2)};

// Export for direct use
export { sceneSpec };
`;

    return {
      code,
      imports,
      types: ts ? this.generateTypeDefinitions(spec) : undefined,
      filename: `${spec.id}-scene.${ext}`,
    };
  }

  /**
   * Generate TypeScript props interface
   */
  private generatePropsInterface(spec: SceneComposition): string {
    const inputTypes = spec.inputs
      ?.map((input) => `  ${input.name}?: ${input.type};`)
      .join('\n');

    return `
export interface SceneProps {
  autoPlay?: boolean;
  inputs?: {
${inputTypes || '    [key: string]: any;'}
  };
  onReady?: (runtime: SceneRuntime) => void;
  onEvent?: (eventName: string, payload: any) => void;
  onStateChange?: (from: string, to: string) => void;
  onError?: (error: Error) => void;
  loading?: React.ReactNode;
}`;
  }

  /**
   * Generate TypeScript type definitions
   */
  private generateTypeDefinitions(spec: SceneComposition): string {
    const inputTypes = spec.inputs
      ?.map(
        (input) =>
          `  ${input.name}${input.validation?.required ? '' : '?'}: ${input.type};`
      )
      .join('\n');

    const eventTypes = spec.events
      ?.map((event) => `  ${event.name}: ${JSON.stringify(event.payload)};`)
      .join('\n');

    return `
export interface ${this.toPascalCase(spec.id)}Inputs {
${inputTypes || '  [key: string]: any;'}
}

export interface ${this.toPascalCase(spec.id)}Events {
${eventTypes || '  [key: string]: any;'}
}

export interface ${this.toPascalCase(spec.id)}Runtime {
  play(): void;
  pause(): void;
  stop(): void;
  setInput(name: string, value: any): void;
  setInputs(inputs: Partial<${this.toPascalCase(spec.id)}Inputs>): void;
  transitionTo(state: string): Promise<boolean>;
  on(event: keyof ${this.toPascalCase(spec.id)}Events, callback: (data: any) => void): () => void;
  dispose(): void;
}`;
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

/**
 * Convenience function to generate runtime code
 */
export function generateRuntimeCode(
  spec: SceneComposition,
  options: CodeGenOptions
): GeneratedCode {
  const generator = new RuntimeGenerator();
  return generator.generate(spec, options);
}
