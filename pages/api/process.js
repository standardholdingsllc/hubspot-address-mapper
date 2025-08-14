import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// In-memory storage for serverless environments
let runtimeMappings = null;

// GitHub API integration for persistent storage
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ENABLE_GITHUB_PERSISTENCE = process.env.ENABLE_GITHUB_PERSISTENCE === 'true';

// Helper function to determine if we're in a serverless environment
function isServerless() {
  return process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
}

// Function to get mappings from GitHub, local file, or in-memory storage
async function getMappings() {
  // First, try to get from GitHub if persistence is enabled
  if (ENABLE_GITHUB_PERSISTENCE && GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
    try {
      const filePath = 'web-app/data/address_mappings.json';
      const getFileUrl = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
      
      console.log(`Fetching mappings from GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${filePath}`);
      
      const response = await fetch(getFileUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HubSpot-Address-Mapper'
        }
      });

      if (response.ok) {
        const fileData = await response.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const mappings = JSON.parse(content);
        console.log(`Successfully loaded ${Object.keys(mappings).length} mappings from GitHub`);
        return mappings;
      } else {
        console.log(`GitHub file not found or error: ${response.status}`);
      }
    } catch (error) {
      console.log('Error fetching from GitHub:', error.message);
    }
  }

  // Fallback to local file system (for development)
  if (!isServerless()) {
    try {
      const mappingsPath = path.join(process.cwd(), 'data', 'address_mappings.json');
      const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
      console.log(`Successfully loaded ${Object.keys(mappings).length} mappings from local file`);
      return mappings;
    } catch (error) {
      console.log('Could not read local address_mappings.json:', error.message);
    }
  }

  // Final fallback to in-memory storage
  if (runtimeMappings) {
    console.log(`Using in-memory mappings: ${Object.keys(runtimeMappings).length} entries`);
    return runtimeMappings;
  }

  // Return empty mappings as last resort
  console.log('No mappings found, starting with empty mappings');
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    // Read the uploaded file
    const inputFilePath = path.join('/tmp', `${fileId}.xlsx`);
    if (!fs.existsSync(inputFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read mappings using the new GitHub-integrated function
    const mappings = await getMappings();

    // Process the Excel file
    const workbook = XLSX.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Find the AddressStreet column name (case-insensitive)
    const sampleRow = data[0];
    const addressStreetColumn = Object.keys(sampleRow).find(key => 
      key.toLowerCase().includes('addressstreet')
    );

    if (!addressStreetColumn) {
      return res.status(400).json({ error: 'AddressStreet column not found in uploaded file' });
    }

    // Apply mappings to fill the pre-created empty columns
    const processedData = data.map(row => {
      const addressStreet = row[addressStreetColumn] || '';
      const mapping = mappings[addressStreet] || {};
      
      // Update the existing empty columns with mapping data
      const newRow = { ...row };
      newRow.Company = mapping.Company || '';
      newRow['Company Name'] = mapping['Company Name'] || '';
      newRow['Lifestyle Stage'] = mapping.Company ? 'Worker' : '';
      
      return newRow;
    });

    // Create new workbook with processed data
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(processedData);
    
    // Apply styling for unmatched rows (orange highlighting)
    // Note: XLSX styling is limited, so we'll focus on data processing
    // The highlighting will be mentioned in the response for user awareness

    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Processed Data');

    // Generate output file
    const outputFileName = `processed_${fileId}.xlsx`;
    const outputFilePath = path.join('/tmp', outputFileName);
    XLSX.writeFile(newWorkbook, outputFilePath);

    // Count matched and unmatched rows
    const matchedCount = processedData.filter(row => row.Company).length;
    const unmatchedCount = processedData.length - matchedCount;

    res.status(200).json({
      success: true,
      outputFileName,
      totalRows: processedData.length,
      matchedCount,
      unmatchedCount,
      note: 'Unmatched rows have empty Company fields. Consider using Excel conditional formatting to highlight these rows.'
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'File processing failed' });
  }
} 
