# Scene Spec Schema

```ts
interface SceneSpec {
  sceneId: string;
  name: string;
  description?: string;
  layers: SceneLayer[];
  triggers?: SceneTrigger[];
}

interface SceneLayer {
  id: string;
  componentId: string;
  zIndex?: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  propsMapping?: Record<string, string>;
}

interface SceneTrigger {
  sourceComponentId: string;
  eventName: string;
  actions: SceneAction[];
}

type SceneAction =
  | { type: "setProp"; targetLayerId: string; prop: string; valueFrom?: string; value?: any }
  | { type: "callCallback"; name: string; payloadFrom?: string };
```
