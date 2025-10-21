// Google Apps Script for TTS Books - Automated Image URL Updates
// Copy this script into Google Apps Script (script.google.com)

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('TTS Books')
    .addItem('Update Image URLs', 'updateImageUrls')
    .addItem('Generate Cloudinary URLs', 'generateCloudinaryUrls')
    .addToUi();
}

function updateImageUrls() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Update image URLs to Cloudinary format
  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const imageCol = findColumnIndex(data[0], 'image');
    
    if (imageCol !== -1 && row[imageCol]) {
      const currentUrl = row[imageCol];
      
      // Check if it's already a Cloudinary URL
      if (!currentUrl.includes('cloudinary.com')) {
        // Generate Cloudinary URL based on book and scene
        const bookName = getBookNameFromSheet();
        const sceneNumber = extractSceneNumber(currentUrl);
        
        if (bookName && sceneNumber) {
          const cloudinaryUrl = `https://res.cloudinary.com/dvdkhdvhg/image/upload/v1760474874/tts-books/tts-books/${bookName}/scene-${sceneNumber}.jpg`;
          sheet.getRange(i + 1, imageCol + 1).setValue(cloudinaryUrl);
        }
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('Image URLs updated to Cloudinary!');
}

function generateCloudinaryUrls() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const bookName = getBookNameFromSheet();
  
  if (!bookName) {
    SpreadsheetApp.getUi().alert('Please set the book name in cell A1');
    return;
  }
  
  // Generate URLs for all scenes
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const imageCol = findColumnIndex(data[0], 'image');
    
    if (imageCol !== -1) {
      const sceneNumber = i; // Use row number as scene number
      const cloudinaryUrl = `https://res.cloudinary.com/dvdkhdvhg/image/upload/v1760474874/tts-books/tts-books/${bookName}/scene-${sceneNumber}.jpg`;
      sheet.getRange(i + 1, imageCol + 1).setValue(cloudinaryUrl);
    }
  }
  
  SpreadsheetApp.getUi().alert(`Generated Cloudinary URLs for ${bookName}!`);
}

function findColumnIndex(headers, columnName) {
  return headers.findIndex(header => 
    header.toLowerCase().includes(columnName.toLowerCase())
  );
}

function getBookNameFromSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const bookName = sheet.getRange('A1').getValue();
  return bookName || 'cave-adventure'; // Default fallback
}

function extractSceneNumber(url) {
  const match = url.match(/scene-(\d+)/);
  return match ? match[1] : null;
}

// Function to be called from external apps
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Convert to story format
  const story = {};
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    
    if (id) {
      const scene = {
        id: id.toString(),
        text: row[1] || '',
        choices: [],
        image: row[2] || ''
      };
      
      // Add choices
      for (let j = 3; j < row.length; j += 2) {
        if (row[j] && row[j + 1]) {
          scene.choices.push({
            label: row[j],
            goto: row[j + 1]
          });
        }
      }
      
      story[id] = scene;
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ nodes: story }))
    .setMimeType(ContentService.MimeType.JSON);
}
