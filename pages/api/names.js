import fs from 'fs';
import path from 'path';

// In-memory storage for serverless environments
let runtimeNames = null;

// GitHub API integration for persistent storage
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ENABLE_GITHUB_PERSISTENCE = process.env.ENABLE_GITHUB_PERSISTENCE === 'true';

async function updateGitHubFile(names) {
  if (!ENABLE_GITHUB_PERSISTENCE || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.log('GitHub persistence not configured or disabled');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const filePath = 'web-app/names.json';
    const content = JSON.stringify(names, null, 2);
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
    const updatePayload = {
      message: `Update excluded usernames list (${names.length} usernames)`,
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

function getNames() {
  if (runtimeNames !== null) {
    return runtimeNames;
  }
  
  try {
    const namesPath = path.join(process.cwd(), 'names.json');
    const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
    runtimeNames = [...names];
    return runtimeNames;
  } catch (error) {
    console.log('Could not read names.json, starting with empty list:', error.message);
    runtimeNames = [];
    return runtimeNames;
  }
}

function isServerless() {
  return process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const names = getNames();
      res.status(200).json({ 
        success: true, 
        names,
        serverless: isServerless(),
        githubEnabled: ENABLE_GITHUB_PERSISTENCE && !!GITHUB_TOKEN,
        totalNames: names.length,
        note: ENABLE_GITHUB_PERSISTENCE && GITHUB_TOKEN ? 'GitHub persistence enabled' : 'GitHub persistence not configured'
      });
    } catch (error) {
      console.error('Error reading names:', error);
      res.status(500).json({ error: 'Failed to read excluded names' });
    }
  } else if (req.method === 'POST') {
    try {
      const { username } = req.body;
      console.log('Attempting to add username:', username);

      if (!username || typeof username !== 'string') {
        console.log('Invalid username provided:', username);
        return res.status(400).json({ error: 'Valid username is required' });
      }

      const cleanUsername = username.trim().toLowerCase();
      
      if (!cleanUsername) {
        console.log('Username is empty after trimming');
        return res.status(400).json({ error: 'Username cannot be empty' });
      }

      const names = getNames();
      console.log('Successfully loaded', names.length, 'existing names');

      if (names.includes(cleanUsername)) {
        console.log('Username already exists:', cleanUsername);
        return res.status(400).json({ error: 'Username already in exclusion list' });
      }

      names.push(cleanUsername);
      names.sort();
      runtimeNames = names;

      console.log('Updated names list, attempting GitHub save...');

      // Try to persist to GitHub
      const githubResult = await updateGitHubFile(names);

      if (githubResult.success) {
        console.log('Successfully saved to GitHub!');
        res.status(200).json({ 
          success: true, 
          message: `Username "${cleanUsername}" added and saved to GitHub repository`,
          username: cleanUsername,
          persistent: true,
          totalNames: names.length,
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
          message: `Username "${cleanUsername}" added to session only`,
          username: cleanUsername,
          persistent: false,
          totalNames: names.length,
          warning: errorMessage,
          suggestion: suggestion,
          githubError: githubResult.error
        });
      }

    } catch (error) {
      console.error('Error adding username:', error);
      res.status(500).json({ error: `Failed to add username: ${error.message}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const names = getNames();
      const filteredNames = names.filter(name => name !== cleanUsername);

      if (filteredNames.length === names.length) {
        return res.status(404).json({ error: 'Username not found in exclusion list' });
      }

      runtimeNames = filteredNames;

      // Try to persist to GitHub
      const githubResult = await updateGitHubFile(filteredNames);

      if (githubResult.success) {
        res.status(200).json({ 
          success: true, 
          message: `Username "${cleanUsername}" removed and saved to GitHub repository`,
          persistent: true,
          totalNames: filteredNames.length,
          commit: githubResult.commit,
          commitUrl: githubResult.url
        });
      } else {
        res.status(200).json({ 
          success: true, 
          message: `Username "${cleanUsername}" removed from session only`,
          persistent: false,
          totalNames: filteredNames.length,
          warning: 'GitHub save failed - changes are temporary'
        });
      }

    } catch (error) {
      console.error('Error deleting username:', error);
      res.status(500).json({ error: 'Failed to delete username' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}