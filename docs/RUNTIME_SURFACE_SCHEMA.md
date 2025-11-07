# Runtime Surface Schema

```ts
interface RuntimeSurface {
  componentId: string;
  stateMachines: {
    name: string;
    inputs: {
      name: string;
      type: "bool" | "number" | "string";
      defaultValue?: boolean | number | string;
    }[];
    events?: {
      name: string;
      description?: string;
    }[];
  }[];
  dataBindings?: {
    name: string;
    type: "array" | "object" | "image" | "text";
    itemSchema?: Record<string, string>;
  }[];
  recommendedFrameworks?: string[];
  runtimeVersion?: string;
}
```
