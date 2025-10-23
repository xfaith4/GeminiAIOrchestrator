export async function getRepoTree({ repoUrl }: { repoUrl: string }) {
    console.log(`MOCK: getRepoTree called with ${repoUrl}`);
    return Promise.resolve([
        { path: 'src/index.js', type: 'blob' as const },
        { path: 'src/App.js', type: 'blob' as const },
        { path: 'package.json', type: 'blob' as const },
        { path: 'README.md', type: 'blob' as const },
        { path: 'src/components/Button.js', type: 'blob' as const },
    ]);
}

export async function getFilesContent({ repoUrl, paths }: { repoUrl: string, paths: string[] }) {
    console.log(`MOCK: getFilesContent called with ${repoUrl} and paths:`, paths);
    return Promise.resolve(
        paths.map(path => ({
            path,
            content: `/* Mock content for ${path} from ${repoUrl} */`
        }))
    );
}
