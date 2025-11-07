# System Architecture

We separate three key layers:

1. **Rive Editor & Assets**
   - Designers author `.riv` files, libraries, and components using the Rive Editor.
   - Assets are stored in Rive and optionally mirrored to BYOB buckets (S3/DO/etc).

2. **Rive MCP Orchestrator**
   - A Node/TS MCP server that:
     - Discovers and indexes Rive assets.
     - Exposes runtime surfaces (inputs, events, bindings).
     - Generates framework-specific wrappers (React, Stencil, Vue, Unity/Unreal).
     - Composes multi-Rive scenes into orchestrated experiences.
     - Provides tools for logic overlays, telemetry collection, and performance analysis.

3. **Consumers (Apps / Games / Sites)**
   - Next.js / React apps
   - Stencil-based web components
   - Vue apps
   - Game clients where desired

Integration and logic live OUTSIDE the `.riv` files.

See `AGENT_FLOW.md` and `MONOREPO_STRUCTURE.md` for more detail.
