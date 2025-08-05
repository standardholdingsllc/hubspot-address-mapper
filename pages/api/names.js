import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const namesPath = path.join(process.cwd(), 'names.json');

  if (req.method === 'GET') {
    try {
      const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
      res.status(200).json({ success: true, names });
    } catch (error) {
      console.error('Error reading names:', error);
      res.status(500).json({ error: 'Failed to read excluded names' });
    }
  } else if (req.method === 'POST') {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Valid username is required' });
      }

      // Read existing names
      let names = [];
      try {
        names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
      } catch (error) {
        // If file doesn't exist, start with empty array
        console.log('Creating new names file');
      }

      // Check if username already exists
      if (names.includes(username.toLowerCase())) {
        return res.status(400).json({ error: 'Username already in exclusion list' });
      }

      // Add new username (convert to lowercase for consistency)
      names.push(username.toLowerCase());
      names.sort(); // Keep the list sorted

      // Write back to file
      fs.writeFileSync(namesPath, JSON.stringify(names, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'Username added to exclusion list',
        username: username.toLowerCase()
      });

    } catch (error) {
      console.error('Error adding username:', error);
      res.status(500).json({ error: 'Failed to add username' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Read existing names
      const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));

      const filteredNames = names.filter(name => name !== username.toLowerCase());

      if (filteredNames.length === names.length) {
        return res.status(404).json({ error: 'Username not found in exclusion list' });
      }

      // Write back to file
      fs.writeFileSync(namesPath, JSON.stringify(filteredNames, null, 2));

      res.status(200).json({ 
        success: true, 
        message: 'Username removed from exclusion list'
      });

    } catch (error) {
      console.error('Error deleting username:', error);
      res.status(500).json({ error: 'Failed to delete username' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 