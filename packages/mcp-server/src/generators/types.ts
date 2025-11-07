import { RuntimeSurface } from "../../../../libs/types/index.d";

export type TargetFramework = "react" | "vue" | "stencil";

export interface GeneratorContext {
  surface: RuntimeSurface;
  framework: TargetFramework;
  componentName: string;
  riveSrc: string;
  outputPath?: string;
}

export interface GeneratedComponent {
  code: string;
  filePath: string;
  framework: TargetFramework;
  componentName: string;
}

export interface FrameworkGenerator {
  framework: TargetFramework;
  fileExtension: string;
  generate(context: GeneratorContext): Promise<GeneratedComponent>;
}
