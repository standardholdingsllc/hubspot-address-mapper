import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const mappingsPath = path.join(process.cwd(), 'data', 'address_mappings.json');

  if (req.method === 'GET') {
    try {
      const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
      res.status(200).json({ success: true, mappings });
    } catch (error) {
      console.error('Error reading mappings:', error);
      res.status(500).json({ error: 'Failed to read mappings' });
    }
  } else if (req.method === 'POST') {
    try {
      const { addressStreet, company, companyName } = req.body;

      if (!addressStreet || !company || !companyName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Read existing mappings
      let mappings = {};
      try {
        mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
      } catch (error) {
        // If file doesn't exist, start with empty mappings
        console.log('Creating new mappings file');
      }

      // Add new mapping
      mappings[addressStreet] = {
        Company: company,
        'Company Name': companyName
      };

      // Write back to file
      fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'Mapping added successfully',
        mapping: mappings[addressStreet]
      });

    } catch (error) {
      console.error('Error adding mapping:', error);
      res.status(500).json({ error: 'Failed to add mapping' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { addressStreet } = req.body;

      if (!addressStreet) {
        return res.status(400).json({ error: 'Address street is required' });
      }

      // Read existing mappings
      const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

      if (!mappings[addressStreet]) {
        return res.status(404).json({ error: 'Mapping not found' });
      }

      // Delete mapping
      delete mappings[addressStreet];

      // Write back to file
      fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'Mapping deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting mapping:', error);
      res.status(500).json({ error: 'Failed to delete mapping' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 