# Logic Surface Schema

```ts
interface LogicSurface {
  componentId: string;
  baseRuntimeSurfaceVersion: string;
  patches: LogicPatch[];
}

type LogicPatch =
  | {
      type: "addTransition";
      fromState: string;
      toState: string;
      delay?: number;
      conditionInput?: string;
    }
  | {
      type: "adjustDuration";
      state: string;
      factor: number;
    }
  | {
      type: "mapEventToCallback";
      eventName: string;
      callbackName: string;
    };
```
