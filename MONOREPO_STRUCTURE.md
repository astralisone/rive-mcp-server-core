# Monorepo Structure

```text
astralismotion-rive-mcp/
├── apps/
│   ├── web/             # Marketing site / dev portal
│   ├── demo/            # Interactive demo app
│   ├── dashboard/       # Telemetry + asset management UI
│   └── cli/             # CLI interface for MCP / generators
│
├── libs/
│   ├── rive-components/ # Generated wrapper components
│   ├── motion-scenes/   # Composed multi-Rive scenes
│   ├── motion-specs/    # Motion & creation specs (JSON)
│   ├── rive-manifests/  # Indexed manifests for Rive assets
│   ├── motion-utils/    # Shared runtime utilities
│   ├── design-tokens/   # Brand tokens
│   ├── motion-qa/       # QA rules & validators
│   └── types/           # Shared TypeScript types
│
├── packages/
│   ├── mcp-server/      # Rive MCP Orchestrator server
│   ├── mcp-agents/      # Specialized agents
│   ├── telemetry-service/ # Metrics API
│   ├── scene-composer/  # Scene composition utilities
│   └── rive-synth/      # Future procedural animation generator
│
├── tools/
│   ├── generators/      # NX generators
│   ├── scripts/         # Helper scripts
│   └── ci/              # CI/CD configs
```
