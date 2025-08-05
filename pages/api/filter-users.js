import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, beforeProcessing = true } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    // Read the file
    const inputFilePath = path.join('/tmp', `${fileId}.xlsx`);
    if (!fs.existsSync(inputFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read excluded names
    const namesPath = path.join(process.cwd(), 'names.json');
    let excludedNames = [];
    try {
      excludedNames = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
    } catch (error) {
      console.log('No excluded names file found, skipping user filtering');
      return res.status(200).json({ 
        success: true, 
        message: 'No excluded names found, no filtering applied',
        removedCount: 0
      });
    }

    // Process the Excel file
    const workbook = XLSX.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Empty file' });
    }

    // Find username column (assuming it's column A or first column)
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    const usernameColumn = columns[0]; // First column (Column A)

    console.log(`Using column "${usernameColumn}" as username column`);

    const originalCount = data.length;

    // Filter out excluded usernames
    const filteredData = data.filter(row => {
      const username = row[usernameColumn];
      if (!username) return true; // Keep rows with no username
      
      const usernameStr = username.toString().toLowerCase();
      return !excludedNames.includes(usernameStr);
    });

    const removedCount = originalCount - filteredData.length;

    // Create new workbook with filtered data
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    // Save the filtered file
    XLSX.writeFile(newWorkbook, inputFilePath);

    res.status(200).json({
      success: true,
      message: `Filtered out ${removedCount} excluded user${removedCount !== 1 ? 's' : ''}`,
      originalCount,
      filteredCount: filteredData.length,
      removedCount,
      usernameColumn
    });

  } catch (error) {
    console.error('User filtering error:', error);
    res.status(500).json({ error: 'User filtering failed' });
  }
} 