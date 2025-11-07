# Agent Roles & Flows

## Motion Spec Agent
- Converts UX/product descriptions into CreationSpec JSON.
- Uses: `list_libraries`, `list_components`.
- Writes to `libs/motion-specs/`.

## Wrapper Generator Agent
- Uses runtime surfaces to generate wrappers.
- Uses: `get_runtime_surface`, `generate_wrapper`.
- Writes to `libs/rive-components/`.

## Scene Composer Agent
- Builds scenes from components.
- Uses: `compose_scene`.
- Writes to `libs/motion-scenes/`.

## Telemetry & Performance Agent
- Reads metrics, suggests optimizations.
- Uses: `analyze_performance`.

## QA / Compliance Agent
- Validates wrappers/scenes against runtime surfaces and rules.
- Uses: `get_runtime_surface`.
