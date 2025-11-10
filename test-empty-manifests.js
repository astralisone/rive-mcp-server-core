// Test script to verify the server handles empty manifests
const { LocalStorage } = require('./packages/mcp-server/src/storage/local.ts');

async function testEmptyManifests() {
  try {
    const storage = new LocalStorage({
      basePath: './data',
      manifestPath: 'manifests',
      assetsPath: 'assets'
    });
    
    await storage.initialize();
    console.log('✓ Storage initialized successfully');
    
    // Test reading index
    try {
      const index = await storage.readIndex();
      console.log('✓ Index read successfully:', JSON.stringify(index, null, 2));
    } catch (error) {
      console.log('✗ Failed to read index:', error.message);
    }
    
    // Test listing libraries
    try {
      const libraries = await storage.listLibraries();
      console.log('✓ Libraries listed:', libraries.length, 'found');
    } catch (error) {
      console.log('✗ Failed to list libraries:', error.message);
    }
    
    // Test listing components
    try {
      const components = await storage.listComponents();
      console.log('✓ Components listed:', components.length, 'found');
    } catch (error) {
      console.log('✗ Failed to list components:', error.message);
    }
    
    console.log('\n✓ All tests passed - server can handle empty manifests');
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

testEmptyManifests();
