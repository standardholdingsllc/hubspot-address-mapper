import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({ error: 'File name required' });
    }

    const filePath = path.join('/tmp', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);

    // Clean up file after sending
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }, 1000);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
} 