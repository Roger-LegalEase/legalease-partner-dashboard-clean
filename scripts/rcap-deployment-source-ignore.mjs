// The deployment policy deliberately permits only root-relative directory
// exclusions. Refuse richer gitignore syntax instead of approximating it.
export function deploymentExcludedDirectories(source) {
  return source.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('#')).map(entry => {
      if (!/^\/?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\/$/.test(entry)) {
        throw new Error(`Unsupported deployment exclusion: ${entry}`);
      }
      const directory = entry.replace(/^\//, '').replace(/\/$/, '');
      if (directory.split('/').some(part => part === '.' || part === '..')) {
        throw new Error(`Invalid deployment exclusion: ${entry}`);
      }
      // In gitignore syntax a single unanchored directory name matches at
      // every depth. Internal slashes already anchor multi-segment patterns.
      if (!entry.startsWith('/') && !directory.includes('/')) {
        throw new Error(`Unanchored deployment exclusion matches nested directories: ${entry}`);
      }
      return directory;
    }).sort();
}

export function deploymentPathExcluded(relativePath, directories) {
  return directories.some(directory => relativePath === directory || relativePath.startsWith(`${directory}/`));
}
