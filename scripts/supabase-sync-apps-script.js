// Google Apps Script for Supabase Sync
// Copy this script into Google Apps Script (script.google.com)
// and bind it to your story sheet

// Configuration - Update these values for your setup
const SUPABASE_ENDPOINT = 'https://your-vercel-domain.vercel.app/api/ingest/sheet';
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

function setEndpoint() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Set Supabase Endpoint', 'Enter your Vercel domain:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const endpoint = response.getResponseText();
    PropertiesService.getScriptProperties().setProperty('SUPABASE_ENDPOINT', endpoint);
    ui.alert('Endpoint set to: ' + endpoint);
  }
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
    const rows = convertSheetToJSON(data);
    
    if (rows.length === 0) {
      ui.alert('❌ No valid story data found');
      return;
    }

    // Send to Supabase
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${token}` },
      payload: JSON.stringify({ storySlug, rows })
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
  // Try to get from cell A1 first
  const cellA1 = sheet.getRange('A1').getValue();
  if (cellA1 && typeof cellA1 === 'string' && cellA1.length > 0) {
    return cellA1.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  
  // Fall back to sheet name
  const sheetName = sheet.getName();
  return sheetName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function convertSheetToJSON(data) {
  const headers = data[0];
  const rows = [];

  // Find column indices
  const nodeKeyCol = findColumnIndex(headers, 'node_key') || findColumnIndex(headers, 'id');
  const textCol = findColumnIndex(headers, 'text_md') || findColumnIndex(headers, 'text') || findColumnIndex(headers, 'tekst');
  const imageCol = findColumnIndex(headers, 'image_url') || findColumnIndex(headers, 'image');
  const diceCol = findColumnIndex(headers, 'dice_check') || findColumnIndex(headers, 'check');
  const choicesCol = findColumnIndex(headers, 'choices');

  if (nodeKeyCol === -1 || textCol === -1) {
    console.log('Required columns not found');
    return [];
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nodeKey = row[nodeKeyCol];
    const text = row[textCol];

    if (!nodeKey || !text) continue;

    const jsonRow = {
      node_key: nodeKey.toString(),
      text_md: text.toString(),
      sort_index: i - 1
    };

    // Add optional fields
    if (imageCol !== -1 && row[imageCol]) {
      jsonRow.image_url = row[imageCol].toString();
    }

    if (diceCol !== -1 && row[diceCol]) {
      jsonRow.dice_check = row[diceCol].toString();
    }

    if (choicesCol !== -1 && row[choicesCol]) {
      jsonRow.choices = row[choicesCol].toString();
    } else {
      // Try to build choices from individual choice columns
      const choices = buildChoicesFromColumns(row, headers);
      if (choices.length > 0) {
        jsonRow.choices = JSON.stringify(choices);
      }
    }

    rows.push(jsonRow);
  }

  return rows;
}

function buildChoicesFromColumns(row, headers) {
  const choices = [];
  let choiceIndex = 1;

  while (true) {
    const labelCol = findColumnIndex(headers, `valg${choiceIndex}_label`) || 
                     findColumnIndex(headers, `choice${choiceIndex}_label`);
    const gotoCol = findColumnIndex(headers, `valg${choiceIndex}_goto`) || 
                    findColumnIndex(headers, `choice${choiceIndex}_goto`);

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
