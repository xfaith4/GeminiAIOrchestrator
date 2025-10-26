// A simple, unauthenticated GitHub API client.
// Note: This will be subject to the rate limits for unauthenticated requests.

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_FILES_TO_FETCH = 5;

interface RepoInfo {
  owner: string;
  repo: string;
}

function parseRepoUrl(url: string): RepoInfo {
  const match = url.match(/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-._]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL.');
  }
  return { owner: match[1], repo: match[2] };
}

interface TreeFile {
    path: string;
    type: 'blob' | 'tree';
}

export async function getRepoTree({ repoUrl }: { repoUrl: string }): Promise<TreeFile[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    // Using `recursive=1` to get all files in the repo.
    const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/main?recursive=1`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
    }
    const data = await response.json();
    
    // We only care about files ('blobs'), not directories ('trees')
    return data.tree.filter((node: any) => node.type === 'blob');
}

interface FileContent {
    path: string;
    content: string;
}

export async function getFilesContent({ repoUrl, paths }: { repoUrl: string, paths: string[] }): Promise<FileContent[]> {
    if (paths.length > MAX_FILES_TO_FETCH) {
        throw new Error(`Cannot fetch more than ${MAX_FILES_TO_FETCH} files at a time.`);
    }

    const { owner, repo } = parseRepoUrl(repoUrl);

    const promises = paths.map(async (path) => {
        // Construct the URL for the raw file content
        const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
            console.warn(`Could not fetch content for ${path}: ${response.statusText}`);
            return { path, content: `Error: Could not fetch content for this file.` };
        }
        const content = await response.text();
        return { path, content };
    });

    return Promise.all(promises);
}