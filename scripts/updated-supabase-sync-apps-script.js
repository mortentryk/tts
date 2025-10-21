// Google Apps Script for Supabase Sync - Updated for your exact format
// Copy this script into Google Apps Script (script.google.com)
// and bind it to your story sheet

// Configuration - Update these values for your setup
const SUPABASE_ENDPOINT = 'https://thebook-lac.vercel.app/api/ingest/sheet';
const INGEST_TOKEN = 'supabase-sync-token-2024'; // Must match your Vercel INGEST_TOKEN

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Supabase Sync')
    .addItem('📤 Sync to Supabase', 'syncToSupabase')
    .addItem('🔗 Test Connection', 'testConnection')
    .addItem('⚙️ Setup Configuration', 'setupConfiguration')
    .addItem('📋 View Current Config', 'viewConfiguration')
    .addToUi();
}

function setupConfiguration() {
  const ui = SpreadsheetApp.getUi();
  
  // Get Vercel domain
  const domainResponse = ui.prompt(
    '🚀 Setup Configuration', 
    'Enter your Vercel domain (e.g., your-app.vercel.app):', 
    ui.ButtonSet.OK_CANCEL
  );
  
  if (domainResponse.getSelectedButton() === ui.Button.OK) {
    const domain = domainResponse.getResponseText().trim();
    const endpoint = `https://${domain}/api/ingest/sheet`;
    
    // Get ingest token
    const tokenResponse = ui.prompt(
      '🔐 Security Token', 
      'Enter your INGEST_TOKEN (from Vercel environment variables):', 
      ui.ButtonSet.OK_CANCEL
    );
    
    if (tokenResponse.getSelectedButton() === ui.Button.OK) {
      const token = tokenResponse.getResponseText().trim();
      
      // Save configuration
      PropertiesService.getScriptProperties().setProperties({
        'SUPABASE_ENDPOINT': endpoint,
        'INGEST_TOKEN': token
      });
      
      ui.alert('✅ Configuration saved!\n\n' +
               'Endpoint: ' + endpoint + '\n' +
               'Token: ' + token.substring(0, 10) + '...\n\n' +
               'You can now test the connection and sync your stories!');
    }
  }
}

function viewConfiguration() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  
  const endpoint = props.getProperty('SUPABASE_ENDPOINT') || 'Not set';
  const token = props.getProperty('INGEST_TOKEN') || 'Not set';
  
  ui.alert('📋 Current Configuration\n\n' +
           'Endpoint: ' + endpoint + '\n' +
           'Token: ' + (token !== 'Not set' ? token.substring(0, 10) + '...' : 'Not set') + '\n\n' +
           'If not configured, use "Setup Configuration" first.');
}

function testConnection() {
  const ui = SpreadsheetApp.getUi();
  const endpoint = PropertiesService.getScriptProperties().getProperty('SUPABASE_ENDPOINT') || SUPABASE_ENDPOINT;
  
  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${INGEST_TOKEN}` },
      payload: JSON.stringify({ 
        storySlug: 'test-connection', 
        rows: [{ node_key: '1', text_md: 'Test connection' }] 
      })
    });
    
    if (response.getResponseCode() === 200) {
      ui.alert('✅ Connection successful!');
    } else {
      ui.alert('❌ Connection failed: ' + response.getResponseCode());
    }
  } catch (error) {
    ui.alert('❌ Connection error: ' + error.toString());
  }
}

function syncToSupabase() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Check configuration first
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('SUPABASE_ENDPOINT');
  const token = props.getProperty('INGEST_TOKEN');
  
  if (!endpoint || !token) {
    ui.alert('❌ Configuration not set!\n\n' +
             'Please use "⚙️ Setup Configuration" first to set your Vercel domain and token.');
    return;
  }
  
  if (data.length < 2) {
    ui.alert('❌ No data found. Please add story data to the sheet.');
    return;
  }

  // Get story slug from sheet name or cell A1
  const storySlug = getStorySlug(sheet);
  if (!storySlug) {
    ui.alert('❌ Please set story slug in cell A1 or sheet name');
    return;
  }

  try {
    // Show progress
    ui.alert(`🚀 Syncing story: ${storySlug}\n\nProcessing ${data.length - 1} rows...`);
    
    // Convert sheet data to JSON format
    const { rows, metadata } = convertSheetToJSON(data);
    
    if (rows.length === 0) {
      ui.alert('❌ No valid story data found');
      return;
    }

    // Send to Supabase with metadata
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${token}` },
      payload: JSON.stringify({ 
        storySlug, 
        rows,
        metadata: metadata || {}
      })
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const result = JSON.parse(responseText);
      ui.alert(`✅ Story synced successfully!\n\n` +
               `📚 Story: ${storySlug}\n` +
               `📄 Nodes: ${result.nodesCount}\n` +
               `🔗 Choices: ${result.choicesCount}\n\n` +
               `Your story is now live in Supabase! 🎉`);
    } else {
      ui.alert(`❌ Sync failed (${responseCode}):\n${responseText}\n\n` +
               `Check your configuration and try again.`);
    }

  } catch (error) {
    ui.alert('❌ Sync error: ' + error.toString() + '\n\n' +
             'Make sure your Vercel app is deployed and the endpoint is correct.');
  }
}

function getStorySlug(sheet) {
  // Always use sheet name as the story slug
  const sheetName = sheet.getName();
  const slug = sheetName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  console.log(`Using sheet name "${sheetName}" as story slug: "${slug}"`);
  return slug;
}

function convertSheetToJSON(data) {
  const headers = data[0];
  const rows = [];
  let metadata = {};

  // Find column indices for your exact format
  const idCol = findColumnIndex(headers, 'id');
  const textCol = findColumnIndex(headers, 'text');
  const imageCol = findColumnIndex(headers, 'image');
  const checkStatCol = findColumnIndex(headers, 'check_stat');
  const checkDcCol = findColumnIndex(headers, 'check_dc');
  const checkSuccessCol = findColumnIndex(headers, 'check_success');
  const checkFailCol = findColumnIndex(headers, 'check_fail');

  // Look for metadata columns
  const titleCol = findColumnIndex(headers, 'story_title');
  const descCol = findColumnIndex(headers, 'story_description');
  const lengthCol = findColumnIndex(headers, 'length');
  const ageCol = findColumnIndex(headers, 'age');
  const authorCol = findColumnIndex(headers, 'author');
  const frontImageCol = findColumnIndex(headers, 'front_screen_image');

  if (idCol === -1 || textCol === -1) {
    console.log('Required columns not found');
    return { rows: [], metadata: {} };
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[idCol];
    const text = row[textCol];

    // Check if this is a metadata row
    if (id && id.toString().toLowerCase() === 'metadata') {
      // Extract metadata
      if (titleCol !== -1 && row[titleCol]) metadata.title = row[titleCol].toString();
      if (descCol !== -1 && row[descCol]) metadata.description = row[descCol].toString();
      if (lengthCol !== -1 && row[lengthCol]) metadata.estimated_time = row[lengthCol].toString();
      if (ageCol !== -1 && row[ageCol]) metadata.difficulty = row[ageCol].toString();
      if (authorCol !== -1 && row[authorCol]) metadata.author = row[authorCol].toString();
      if (frontImageCol !== -1 && row[frontImageCol]) metadata.cover_image_url = row[frontImageCol].toString();
      continue;
    }

    if (!id || !text) continue;

    const jsonRow = {
      node_key: id.toString(),
      text_md: text.toString(),
      sort_index: i - 1
    };

    // Add image if available and not empty
    if (imageCol !== -1 && row[imageCol] && row[imageCol].toString().trim() !== '') {
      jsonRow.image_url = row[imageCol].toString();
    } else {
      jsonRow.image_url = null; // Explicitly set to null for empty values
    }

    // Build dice check from your format
    if (checkStatCol !== -1 && checkDcCol !== -1 && checkSuccessCol !== -1 && checkFailCol !== -1) {
      const checkStat = row[checkStatCol];
      const checkDc = row[checkDcCol];
      const checkSuccess = row[checkSuccessCol];
      const checkFail = row[checkFailCol];

      if (checkStat && checkDc && checkSuccess && checkFail) {
        jsonRow.dice_check = JSON.stringify({
          stat: checkStat.toString(),
          dc: parseInt(checkDc.toString()) || 8,
          success: checkSuccess.toString(),
          fail: checkFail.toString()
        });
      }
    }

    // Build choices from your valg columns
    const choices = buildChoicesFromValgColumns(row, headers);
    if (choices.length > 0) {
      jsonRow.choices = JSON.stringify(choices);
    }

    rows.push(jsonRow);
  }

  return { rows, metadata };
}

function buildChoicesFromValgColumns(row, headers) {
  const choices = [];
  let choiceIndex = 1;

  while (true) {
    const labelCol = findColumnIndex(headers, `valg${choiceIndex}_label`);
    const gotoCol = findColumnIndex(headers, `valg${choiceIndex}_goto`);

    if (labelCol === -1 || gotoCol === -1) break;

    const label = row[labelCol];
    const goto = row[gotoCol];

    if (label && goto) {
      choices.push({
        label: label.toString(),
        to: goto.toString(),
        sort_index: choiceIndex - 1
      });
    }

    choiceIndex++;
  }

  return choices;
}

function findColumnIndex(headers, columnName) {
  return headers.findIndex(header => 
    header && header.toString().toLowerCase().includes(columnName.toLowerCase())
  );
}

// Auto-sync on edit (optional)
function onEdit(e) {
  // Uncomment to enable auto-sync on every edit
  // syncToSupabase();
}
