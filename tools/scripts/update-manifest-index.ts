#!/usr/bin/env node

/**
 * Update the manifest index by scanning the manifests directory
 */

import * as fs from 'fs';
import * as path from 'path';

const MONOREPO_ROOT = path.resolve(__dirname, '../..');
const MANIFESTS_DIR = path.join(MONOREPO_ROOT, 'data/manifests');
const COMPONENTS_DIR = path.join(MANIFESTS_DIR, 'components');
const LIBRARIES_DIR = path.join(MANIFESTS_DIR, 'libraries');
const INDEX_PATH = path.join(MANIFESTS_DIR, 'index.json');

interface ManifestIndex {
  version: string;
  lastUpdated: string;
  components: string[];
  libraries: string[];
}

function scanDirectory(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir);
  const ids: string[] = [];

  for (const file of files) {
    if (file.endsWith('.json') && file !== 'index.json') {
      try {
        const filePath = path.join(dir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (content.id) {
          ids.push(content.id);
        } else {
          console.warn(`⚠️  Warning: Manifest ${file} missing 'id' field`);
        }
      } catch (error) {
        console.error(`❌ Error parsing ${file}:`, error);
      }
    }
  }

  return ids.sort();
}

function main() {
  console.log('\n🔍 Scanning manifests directory...\n');

  // Scan components
  const components = scanDirectory(COMPONENTS_DIR);
  console.log(`✅ Found ${components.length} component(s):`);
  components.forEach(id => console.log(`   - ${id}`));

  // Scan libraries
  const libraries = scanDirectory(LIBRARIES_DIR);
  console.log(`\n✅ Found ${libraries.length} library(ies):`);
  libraries.forEach(id => console.log(`   - ${id}`));

  // Create index
  const index: ManifestIndex = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    components,
    libraries
  };

  // Ensure manifests directory exists
  if (!fs.existsSync(MANIFESTS_DIR)) {
    fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  }

  // Write index
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\n✅ Manifest index updated: ${INDEX_PATH}\n`);

  // Summary
  console.log('📊 Summary:');
  console.log(`   Components: ${components.length}`);
  console.log(`   Libraries: ${libraries.length}`);
  console.log(`   Last Updated: ${index.lastUpdated}\n`);
}

main();
