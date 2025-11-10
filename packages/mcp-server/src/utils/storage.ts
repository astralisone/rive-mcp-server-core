/**
 * Storage utilities for accessing Rive manifests and components
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  RiveLibrary,
  RiveComponent,
  LibraryManifest,
  ComponentManifest,
} from '../types';

/**
 * Storage configuration
 */
interface StorageConfig {
  manifestsPath: string;
  assetsPath: string;
}

const defaultConfig: StorageConfig = {
  manifestsPath: process.env.MANIFESTS_PATH || path.join(process.cwd(), 'manifests'),
  assetsPath: process.env.ASSETS_PATH || path.join(process.cwd(), 'assets'),
};

/**
 * Get storage configuration
 */
export function getStorageConfig(): StorageConfig {
  return { ...defaultConfig };
}

/**
 * Set storage configuration
 */
export function setStorageConfig(config: Partial<StorageConfig>): void {
  Object.assign(defaultConfig, config);
}

/**
 * Ensure storage directories exist
 */
export async function ensureStorageDirectories(): Promise<void> {
  const config = getStorageConfig();
  await fs.mkdir(config.manifestsPath, { recursive: true });
  await fs.mkdir(config.assetsPath, { recursive: true });
}

/**
 * Get all library manifests
 */
export async function getAllLibraries(): Promise<LibraryManifest[]> {
  const config = getStorageConfig();
  const manifestsPath = config.manifestsPath;

  try {
    await ensureStorageDirectories();
    const entries = await fs.readdir(manifestsPath, { withFileTypes: true });
    const libraryManifests: LibraryManifest[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.library.json')) {
        const manifestPath = path.join(manifestsPath, entry.name);
        const content = await fs.readFile(manifestPath, 'utf-8');
        const library: RiveLibrary = JSON.parse(content);
        libraryManifests.push({
          library,
          storagePath: manifestPath,
        });
      }
    }

    return libraryManifests;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Get a specific library by ID
 */
export async function getLibraryById(libraryId: string): Promise<LibraryManifest | null> {
  const libraries = await getAllLibraries();
  return libraries.find((lib) => lib.library.id === libraryId) || null;
}

/**
 * Save a library manifest
 */
export async function saveLibrary(library: RiveLibrary): Promise<LibraryManifest> {
  const config = getStorageConfig();
  await ensureStorageDirectories();

  const fileName = `${library.id}.library.json`;
  const storagePath = path.join(config.manifestsPath, fileName);

  await fs.writeFile(storagePath, JSON.stringify(library, null, 2), 'utf-8');

  return {
    library,
    storagePath,
  };
}

/**
 * Get all components from a library
 */
export async function getComponentsByLibrary(libraryId: string): Promise<ComponentManifest[]> {
  const libraryManifest = await getLibraryById(libraryId);
  if (!libraryManifest) {
    return [];
  }

  const { library } = libraryManifest;
  return library.components.map((component) => ({
    component,
    library,
    storagePath: component.filePath,
  }));
}

/**
 * Get all components across all libraries
 */
export async function getAllComponents(): Promise<ComponentManifest[]> {
  const libraries = await getAllLibraries();
  const allComponents: ComponentManifest[] = [];

  for (const { library } of libraries) {
    const components = library.components.map((component) => ({
      component,
      library,
      storagePath: component.filePath,
    }));
    allComponents.push(...components);
  }

  return allComponents;
}

/**
 * Get a specific component by ID
 */
export async function getComponentById(componentId: string): Promise<ComponentManifest | null> {
  const allComponents = await getAllComponents();
  return allComponents.find((comp) => comp.component.id === componentId) || null;
}

/**
 * Add a component to a library
 */
export async function addComponentToLibrary(
  libraryId: string,
  component: RiveComponent
): Promise<ComponentManifest | null> {
  const libraryManifest = await getLibraryById(libraryId);
  if (!libraryManifest) {
    return null;
  }

  const { library } = libraryManifest;

  // Check if component already exists
  const existingIndex = library.components.findIndex((c) => c.id === component.id);

  if (existingIndex >= 0) {
    // Update existing component
    library.components[existingIndex] = component;
  } else {
    // Add new component
    library.components.push(component);
  }

  library.updatedAt = new Date().toISOString();

  await saveLibrary(library);

  return {
    component,
    library,
    storagePath: component.filePath,
  };
}

/**
 * Remove a component from a library
 */
export async function removeComponentFromLibrary(
  libraryId: string,
  componentId: string
): Promise<boolean> {
  const libraryManifest = await getLibraryById(libraryId);
  if (!libraryManifest) {
    return false;
  }

  const { library } = libraryManifest;
  const initialLength = library.components.length;

  library.components = library.components.filter((c) => c.id !== componentId);

  if (library.components.length === initialLength) {
    return false; // Component not found
  }

  library.updatedAt = new Date().toISOString();
  await saveLibrary(library);

  return true;
}

/**
 * Search components by name or tags
 */
export async function searchComponents(query: {
  name?: string;
  tags?: string[];
  libraryId?: string;
}): Promise<ComponentManifest[]> {
  let components = await getAllComponents();

  if (query.libraryId) {
    components = components.filter((c) => c.library.id === query.libraryId);
  }

  if (query.name) {
    const lowerQuery = query.name.toLowerCase();
    components = components.filter((c) =>
      c.component.name.toLowerCase().includes(lowerQuery)
    );
  }

  if (query.tags && query.tags.length > 0) {
    components = components.filter((c) =>
      query.tags!.some((tag) => c.component.tags?.includes(tag))
    );
  }

  return components;
}

/**
 * Get asset file path for a component
 */
export function getAssetPath(componentId: string): string {
  const config = getStorageConfig();
  return path.join(config.assetsPath, `${componentId}.riv`);
}

/**
 * Check if asset file exists for a component
 */
export async function assetExists(componentId: string): Promise<boolean> {
  const assetPath = getAssetPath(componentId);
  try {
    await fs.access(assetPath);
    return true;
  } catch {
    return false;
  }
}
