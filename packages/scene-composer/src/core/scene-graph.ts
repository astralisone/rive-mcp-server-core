/**
 * Scene Graph Data Structure
 *
 * Manages the hierarchical structure of components in a scene,
 * handles transformations, and maintains spatial relationships.
 */

import type {
  ComponentLayout,
  Transform,
  Position,
  SceneComposition,
} from '../types/scene-spec';

/**
 * Scene graph node representing a component instance
 */
export class SceneNode {
  public id: string;
  public name: string;
  public componentId: string;
  public transform: Transform;
  public children: SceneNode[] = [];
  public parent: SceneNode | null = null;
  public zIndex: number;
  public visible: boolean;
  public interactive: boolean;
  public metadata: Record<string, any> = {};

  private _worldTransform: Transform | null = null;
  private _dirty: boolean = true;

  constructor(layout: ComponentLayout) {
    this.id = layout.id;
    this.name = layout.name;
    this.componentId = layout.componentId;
    this.transform = { ...layout.transform };
    this.zIndex = layout.zIndex ?? 0;
    this.visible = layout.visible ?? true;
    this.interactive = layout.interactive ?? true;
  }

  /**
   * Add a child node
   */
  addChild(node: SceneNode): void {
    if (node.parent) {
      node.parent.removeChild(node);
    }
    node.parent = this;
    this.children.push(node);
    node.markDirty();
  }

  /**
   * Remove a child node
   */
  removeChild(node: SceneNode): void {
    const index = this.children.indexOf(node);
    if (index !== -1) {
      this.children.splice(index, 1);
      node.parent = null;
      node.markDirty();
    }
  }

  /**
   * Mark transform as dirty (needs recalculation)
   */
  markDirty(): void {
    this._dirty = true;
    this._worldTransform = null;
    // Propagate to children
    for (const child of this.children) {
      child.markDirty();
    }
  }

  /**
   * Get world-space transform (accumulated from parent chain)
   */
  getWorldTransform(): Transform {
    if (!this._dirty && this._worldTransform) {
      return this._worldTransform;
    }

    if (!this.parent) {
      this._worldTransform = { ...this.transform };
    } else {
      const parentWorld = this.parent.getWorldTransform();
      this._worldTransform = this.combineTransforms(
        parentWorld,
        this.transform
      );
    }

    this._dirty = false;
    return this._worldTransform;
  }

  /**
   * Combine parent and local transforms
   */
  private combineTransforms(parent: Transform, local: Transform): Transform {
    const combined: Transform = {};

    // Combine positions
    if (parent.position || local.position) {
      combined.position = {
        x: (parent.position?.x ?? 0) + (local.position?.x ?? 0),
        y: (parent.position?.y ?? 0) + (local.position?.y ?? 0),
        z: (parent.position?.z ?? 0) + (local.position?.z ?? 0),
      };
    }

    // Combine scales (multiply)
    if (parent.scale || local.scale) {
      combined.scale = {
        x: (parent.scale?.x ?? 1) * (local.scale?.x ?? 1),
        y: (parent.scale?.y ?? 1) * (local.scale?.y ?? 1),
      };
    }

    // Combine rotations (add)
    if (parent.rotation !== undefined || local.rotation !== undefined) {
      combined.rotation = (parent.rotation ?? 0) + (local.rotation ?? 0);
    }

    // Combine opacity (multiply)
    if (parent.opacity !== undefined || local.opacity !== undefined) {
      combined.opacity = (parent.opacity ?? 1) * (local.opacity ?? 1);
    }

    return combined;
  }

  /**
   * Update local transform
   */
  setTransform(transform: Partial<Transform>): void {
    this.transform = { ...this.transform, ...transform };
    this.markDirty();
  }

  /**
   * Get all descendants in depth-first order
   */
  getDescendants(): SceneNode[] {
    const descendants: SceneNode[] = [];
    for (const child of this.children) {
      descendants.push(child);
      descendants.push(...child.getDescendants());
    }
    return descendants;
  }

  /**
   * Find node by name in subtree
   */
  findByName(name: string): SceneNode | null {
    if (this.name === name) {
      return this;
    }
    for (const child of this.children) {
      const found = child.findByName(name);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Get rendering order (sorted by z-index)
   */
  getRenderOrder(): SceneNode[] {
    const allNodes = [this, ...this.getDescendants()];
    return allNodes
      .filter((node) => node.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }
}

/**
 * Scene graph managing all nodes
 */
export class SceneGraph {
  public root: SceneNode;
  private nodeMap: Map<string, SceneNode> = new Map();

  constructor(spec: SceneComposition) {
    // Create root node
    this.root = new SceneNode({
      id: 'root',
      name: 'root',
      componentId: 'root',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
      },
    });
    this.nodeMap.set('root', this.root);

    // Build graph from spec
    this.buildFromSpec(spec);
  }

  /**
   * Build scene graph from composition specification
   */
  private buildFromSpec(spec: SceneComposition): void {
    // Sort components by z-index for proper layering
    const sortedComponents = [...spec.components].sort(
      (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
    );

    for (const layout of sortedComponents) {
      const node = new SceneNode(layout);
      this.nodeMap.set(node.name, node);
      this.root.addChild(node);
    }
  }

  /**
   * Get node by name
   */
  getNode(name: string): SceneNode | undefined {
    return this.nodeMap.get(name);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): SceneNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Get nodes in render order (sorted by z-index, visible only)
   */
  getRenderOrder(): SceneNode[] {
    return this.root.getRenderOrder().filter((node) => node.name !== 'root');
  }

  /**
   * Update node transform
   */
  updateNodeTransform(name: string, transform: Partial<Transform>): boolean {
    const node = this.nodeMap.get(name);
    if (!node) {
      return false;
    }
    node.setTransform(transform);
    return true;
  }

  /**
   * Set node visibility
   */
  setNodeVisibility(name: string, visible: boolean): boolean {
    const node = this.nodeMap.get(name);
    if (!node) {
      return false;
    }
    node.visible = visible;
    return true;
  }

  /**
   * Get spatial query results (nodes within bounds)
   */
  queryBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): SceneNode[] {
    const results: SceneNode[] = [];
    for (const node of this.nodeMap.values()) {
      if (node.name === 'root' || !node.visible) {
        continue;
      }
      const worldTransform = node.getWorldTransform();
      const pos = worldTransform.position;
      if (
        pos &&
        pos.x >= bounds.x &&
        pos.x <= bounds.x + bounds.width &&
        pos.y >= bounds.y &&
        pos.y <= bounds.y + bounds.height
      ) {
        results.push(node);
      }
    }
    return results.sort((a, b) => b.zIndex - a.zIndex); // Top to bottom
  }

  /**
   * Hit test for interactive elements
   */
  hitTest(x: number, y: number): SceneNode | null {
    const renderOrder = this.getRenderOrder().reverse(); // Top to bottom
    for (const node of renderOrder) {
      if (!node.interactive) {
        continue;
      }
      const worldTransform = node.getWorldTransform();
      const pos = worldTransform.position;
      // Simple point-in-bounds test (can be enhanced with actual bounds)
      if (pos && Math.abs(pos.x - x) < 50 && Math.abs(pos.y - y) < 50) {
        return node;
      }
    }
    return null;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.nodeMap.clear();
  }
}
