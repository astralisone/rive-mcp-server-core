# Creation Spec Schema

```ts
interface CreationSpec {
  id: string;
  name: string;
  purpose: string;
  inputs: {
    name: string;
    type: "bool" | "number" | "string";
    description?: string;
  }[];
  events?: {
    name: string;
    description?: string;
  }[];
  dataBindings?: {
    name: string;
    type: "array" | "object" | "image" | "text";
    itemSchema?: Record<string, string>;
  }[];
  visualGuidelines?: {
    brand: string;
    palette?: string[];
    notes?: string;
  };
  motionGuidelines?: {
    duration?: string;
    easing?: string;
    styleKeywords?: string[];
  };
}
```
