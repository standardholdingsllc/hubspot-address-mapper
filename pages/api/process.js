import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

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

    // Read mappings
    const mappingsPath = path.join(process.cwd(), 'data', 'address_mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

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