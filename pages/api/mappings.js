import fs from 'fs';
import path from 'path';

// In-memory storage for serverless environments
let runtimeMappings = null;

// GitHub API integration for persistent storage
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ENABLE_GITHUB_PERSISTENCE = process.env.ENABLE_GITHUB_PERSISTENCE === 'true';

async function updateGitHubFile(mappings) {
  if (!ENABLE_GITHUB_PERSISTENCE || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.log('GitHub persistence not configured or disabled');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const filePath = 'web-app/data/address_mappings.json';
    const content = JSON.stringify(mappings, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');

    console.log(`Updating GitHub file: ${GITHUB_OWNER}/${GITHUB_REPO}/${filePath}`);

    // First, get the current file to get its SHA
    const getFileUrl = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    const getResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HubSpot-Address-Mapper',
      },
    });

    let sha = null;
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
      console.log('Found existing file with SHA:', sha);
    } else if (getResponse.status === 404) {
      console.log('File does not exist, will create new file');
    } else {
      const errorText = await getResponse.text();
      console.error('Error getting file:', getResponse.status, errorText);
      return { success: false, reason: 'get_file_error', error: errorText };
    }

    // Update or create the file
    const updateUrl = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    const mappingCount = Object.keys(mappings).length;
    const updatePayload = {
      message: `Update address mappings (${mappingCount} mappings)`,
      content: encodedContent,
      branch: GITHUB_BRANCH,
    };

    if (sha) {
      updatePayload.sha = sha;
    }

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'HubSpot-Address-Mapper',
      },
      body: JSON.stringify(updatePayload),
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('Successfully updated GitHub file:', result.commit.sha);
      return { success: true, commit: result.commit.sha, url: result.commit.html_url };
    } else {
      const error = await updateResponse.text();
      console.error('GitHub API error:', updateResponse.status, error);
      return { success: false, reason: 'api_error', status: updateResponse.status, error };
    }

  } catch (error) {
    console.error('Error updating GitHub file:', error);
    return { success: false, reason: 'network_error', error: error.message };
  }
}

function getMappings() {
  if (runtimeMappings !== null) {
    return runtimeMappings;
  }
  
  try {
    const mappingsPath = path.join(process.cwd(), 'data', 'address_mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    runtimeMappings = { ...mappings };
    return runtimeMappings;
  } catch (error) {
    console.log('Could not read address_mappings.json, starting with empty mappings:', error.message);
    runtimeMappings = {};
    return runtimeMappings;
  }
}

function isServerless() {
  return process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const mappings = getMappings();
      const mappingCount = Object.keys(mappings).length;
      res.status(200).json({ 
        success: true, 
        mappings,
        serverless: isServerless(),
        githubEnabled: ENABLE_GITHUB_PERSISTENCE && !!GITHUB_TOKEN,
        totalMappings: mappingCount,
        note: ENABLE_GITHUB_PERSISTENCE && GITHUB_TOKEN ? 'GitHub persistence enabled' : 'GitHub persistence not configured'
      });
    } catch (error) {
      console.error('Error reading mappings:', error);
      res.status(500).json({ error: 'Failed to read mappings' });
    }
  } else if (req.method === 'POST') {
    try {
      const { addressStreet, company, companyName } = req.body;
      console.log('Attempting to add mapping:', { addressStreet, company, companyName });

      if (!addressStreet || !company || !companyName) {
        console.log('Invalid mapping data provided');
        return res.status(400).json({ error: 'All fields (addressStreet, company, companyName) are required' });
      }

      const cleanAddressStreet = addressStreet.trim();
      
      if (!cleanAddressStreet) {
        console.log('Address street is empty after trimming');
        return res.status(400).json({ error: 'Address street cannot be empty' });
      }

      const mappings = getMappings();
      console.log('Successfully loaded', Object.keys(mappings).length, 'existing mappings');

      if (mappings[cleanAddressStreet]) {
        console.log('Mapping already exists for address:', cleanAddressStreet);
        return res.status(400).json({ error: 'Mapping already exists for this address' });
      }

      // Add new mapping
      mappings[cleanAddressStreet] = {
        Company: company.trim(),
        'Company Name': companyName.trim()
      };
      runtimeMappings = mappings;

      console.log('Updated mappings, attempting GitHub save...');

      // Try to persist to GitHub
      const githubResult = await updateGitHubFile(mappings);

      if (githubResult.success) {
        console.log('Successfully saved to GitHub!');
        res.status(200).json({ 
          success: true, 
          message: `Mapping for "${cleanAddressStreet}" added and saved to GitHub repository`,
          mapping: mappings[cleanAddressStreet],
          addressStreet: cleanAddressStreet,
          persistent: true,
          totalMappings: Object.keys(mappings).length,
          commit: githubResult.commit,
          commitUrl: githubResult.url
        });
      } else {
        console.log('GitHub save failed:', githubResult.reason);
        
        // Provide detailed error information
        let errorMessage = 'GitHub save failed';
        let suggestion = '';
        
        switch (githubResult.reason) {
          case 'not_configured':
            errorMessage = 'GitHub integration not configured';
            suggestion = 'Check environment variables';
            break;
          case 'api_error':
            errorMessage = `GitHub API error (${githubResult.status})`;
            suggestion = 'Check token permissions and repository access';
            break;
          case 'get_file_error':
            errorMessage = 'Could not access repository file';
            suggestion = 'Check repository name and token permissions';
            break;
          case 'network_error':
            errorMessage = 'Network error connecting to GitHub';
            suggestion = 'Try again in a moment';
            break;
        }

        res.status(200).json({ 
          success: true, 
          message: `Mapping for "${cleanAddressStreet}" added to session only`,
          mapping: mappings[cleanAddressStreet],
          addressStreet: cleanAddressStreet,
          persistent: false,
          totalMappings: Object.keys(mappings).length,
          warning: errorMessage,
          suggestion: suggestion,
          githubError: githubResult.error
        });
      }

    } catch (error) {
      console.error('Error adding mapping:', error);
      res.status(500).json({ error: `Failed to add mapping: ${error.message}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { addressStreet } = req.body;

      if (!addressStreet) {
        return res.status(400).json({ error: 'Address street is required' });
      }

      const cleanAddressStreet = addressStreet.trim();
      const mappings = getMappings();

      if (!mappings[cleanAddressStreet]) {
        return res.status(404).json({ error: 'Mapping not found for this address' });
      }

      // Delete mapping
      delete mappings[cleanAddressStreet];
      runtimeMappings = mappings;

      // Try to persist to GitHub
      const githubResult = await updateGitHubFile(mappings);

      if (githubResult.success) {
        res.status(200).json({ 
          success: true, 
          message: `Mapping for "${cleanAddressStreet}" removed and saved to GitHub repository`,
          persistent: true,
          totalMappings: Object.keys(mappings).length,
          commit: githubResult.commit,
          commitUrl: githubResult.url
        });
      } else {
        res.status(200).json({ 
          success: true, 
          message: `Mapping for "${cleanAddressStreet}" removed from session only`,
          persistent: false,
          totalMappings: Object.keys(mappings).length,
          warning: 'GitHub save failed - changes are temporary'
        });
      }

    } catch (error) {
      console.error('Error deleting mapping:', error);
      res.status(500).json({ error: 'Failed to delete mapping' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 