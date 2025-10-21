// Complete automated workflow: Generate images → Upload to Cloudinary → Update Google Sheet
// Run with: node scripts/automated-workflow.js

require('dotenv').config({ path: '.env.local' });
const { generateImages } = require('./generate-story-images');
const { processImages } = require('./upload-to-cloudinary');

async function runCompleteWorkflow() {
  console.log('🚀 Starting complete TTS Books automation workflow...\n');
  
  try {
    // Step 1: Generate images with OpenAI
    console.log('📸 Step 1: Generating images with OpenAI DALL-E...');
    const generatedImages = await generateImages();
    
    if (generatedImages.length === 0) {
      console.log('❌ No images generated. Stopping workflow.');
      return;
    }
    
    console.log(`✅ Generated ${generatedImages.length} images\n`);
    
    // Step 2: Upload to Cloudinary
    console.log('☁️ Step 2: Uploading images to Cloudinary...');
    const uploadedImages = await processImages();
    
    if (uploadedImages.length === 0) {
      console.log('❌ No images uploaded. Stopping workflow.');
      return;
    }
    
    console.log(`✅ Uploaded ${uploadedImages.length} images to Cloudinary\n`);
    
    // Step 3: Generate Google Sheet update data
    console.log('📊 Step 3: Generating Google Sheet update data...');
    generateSheetUpdateData(uploadedImages);
    
    console.log('\n🎉 Complete workflow finished!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy the Google Apps Script from scripts/google-apps-script.js');
    console.log('2. Paste it into your Google Sheet (script.google.com)');
    console.log('3. Run the "Update Image URLs" function in your sheet');
    console.log('4. Your TTS app will now use Cloudinary images!');
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  }
}

function generateSheetUpdateData(uploadedImages) {
  console.log('\n📋 Google Sheet Update Data:');
  console.log('Copy these URLs to your Google Sheet image column:\n');
  
  uploadedImages.forEach(result => {
    console.log(`Scene ${result.scene}: ${result.cloudinaryUrl}`);
  });
  
  // Generate CSV format
  const csvData = uploadedImages.map(result => 
    `Scene ${result.scene},${result.cloudinaryUrl}`
  ).join('\n');
  
  console.log('\n📄 CSV Format (copy to your sheet):');
  console.log('Scene,Image URL');
  console.log(csvData);
}

// Run if called directly
if (require.main === module) {
  runCompleteWorkflow().catch(console.error);
}

module.exports = { runCompleteWorkflow };
