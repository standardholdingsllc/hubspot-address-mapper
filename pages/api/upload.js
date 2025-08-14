import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// In-memory storage for serverless environments
let runtimeNames = null;

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

// Function to get names from GitHub, local file, or in-memory storage
async function getNames() {
  // First, try to get from GitHub if persistence is enabled
  if (ENABLE_GITHUB_PERSISTENCE && GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
    try {
      const filePath = 'web-app/names.json';
      const getFileUrl = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
      
      console.log(`Fetching excluded names from GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${filePath}`);
      
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
        const names = JSON.parse(content);
        console.log(`Successfully loaded ${names.length} excluded names from GitHub`);
        return names;
      } else {
        console.log(`GitHub names file not found or error: ${response.status}`);
      }
    } catch (error) {
      console.log('Error fetching excluded names from GitHub:', error.message);
    }
  }

  // Fallback to local file system (for development)
  if (!isServerless()) {
    try {
      const namesPath = path.join(process.cwd(), 'names.json');
      const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
      console.log(`Successfully loaded ${names.length} excluded names from local file`);
      return names;
    } catch (error) {
      console.log('Could not read local names.json:', error.message);
    }
  }

  // Final fallback to in-memory storage
  if (runtimeNames) {
    console.log(`Using in-memory excluded names: ${runtimeNames.length} entries`);
    return runtimeNames;
  }

  // Return empty array as last resort
  console.log('No excluded names found, starting with empty list');
  return [];
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read and validate the Excel file
    const workbook = XLSX.readFile(file.filepath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Empty file' });
    }

    // Check for AddressStreet column
    const sampleRow = data[0];
    const hasAddressStreet = Object.keys(sampleRow).some(key => 
      key.toLowerCase().includes('addressstreet')
    );

    if (!hasAddressStreet) {
      return res.status(400).json({ error: 'AddressStreet column not found' });
    }

    // Find the exact AddressStreet column name
    const addressStreetColumn = Object.keys(sampleRow).find(key => 
      key.toLowerCase().includes('addressstreet')
    );

    // Create new data with the three new columns inserted after AddressStreet
    const processedData = data.map(row => {
      const newRow = {};
      const originalKeys = Object.keys(row);
      const addressIndex = originalKeys.indexOf(addressStreetColumn);

      // Add columns before AddressStreet
      for (let i = 0; i <= addressIndex; i++) {
        const key = originalKeys[i];
        newRow[key] = row[key];
      }

      // Insert the three new columns right after AddressStreet
      newRow['Company'] = '';
      newRow['Company Name'] = '';
      newRow['Lifestyle Stage'] = '';

      // Add remaining original columns
      for (let i = addressIndex + 1; i < originalKeys.length; i++) {
        const key = originalKeys[i];
        newRow[key] = row[key];
      }

      return newRow;
    });

    // Create new workbook with the modified structure
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(processedData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    // Store file info in session/temp storage
    const fileId = Date.now().toString();
    const tempFilePath = path.join('/tmp', `${fileId}.xlsx`);
    XLSX.writeFile(newWorkbook, tempFilePath);

    // Clean up original uploaded file
    fs.unlinkSync(file.filepath);

    // Apply user filtering immediately after upload
    try {
      // Read excluded names using GitHub integration
      let excludedNames = [];
      let filterData = { success: true, removedCount: 0 };
      
      try {
        excludedNames = await getNames();
        
        if (excludedNames.length > 0) {
          // Filter the processed data
          const columns = Object.keys(processedData[0]);
          const usernameColumn = columns[0]; // First column (Column A)
          
          const originalCount = processedData.length;
          const filteredData = processedData.filter(row => {
            const username = row[usernameColumn];
            if (!username) return true;
            return !excludedNames.includes(username.toString().toLowerCase());
          });
          
          if (filteredData.length < originalCount) {
            // Re-save the filtered file
            const newWorkbook = XLSX.utils.book_new();
            const newWorksheet = XLSX.utils.json_to_sheet(filteredData);
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
            XLSX.writeFile(newWorkbook, tempFilePath);
            
            filterData = {
              success: true,
              removedCount: originalCount - filteredData.length,
              filteredCount: filteredData.length,
              usernameColumn
            };
          }
        }
      } catch (namesError) {
        console.log('No excluded names file found, skipping user filtering');
      }
      
      if (filterData.success && filterData.removedCount > 0) {
        res.status(200).json({
          success: true,
          fileId,
          fileName: file.originalFilename,
          rowCount: filterData.filteredCount,
          originalRowCount: processedData.length,
          addressStreetColumn,
          columnsAdded: ['Company', 'Company Name', 'Lifestyle Stage'],
          message: 'File uploaded and prepared with new columns',
          filteringApplied: true,
          usersRemoved: filterData.removedCount,
          usernameColumn: filterData.usernameColumn
        });
      } else {
        res.status(200).json({
          success: true,
          fileId,
          fileName: file.originalFilename,
          rowCount: processedData.length,
          addressStreetColumn,
          columnsAdded: ['Company', 'Company Name', 'Lifestyle Stage'],
          message: 'File uploaded and prepared with new columns',
          filteringApplied: false
        });
      }
    } catch (filterError) {
      console.error('User filtering failed:', filterError);
      // Continue without filtering if it fails
      res.status(200).json({
        success: true,
        fileId,
        fileName: file.originalFilename,
        rowCount: processedData.length,
        addressStreetColumn,
        columnsAdded: ['Company', 'Company Name', 'Lifestyle Stage'],
        message: 'File uploaded and prepared with new columns (user filtering skipped due to error)',
        filteringApplied: false
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
} 
