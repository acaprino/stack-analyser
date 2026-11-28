export interface ProviderFile {
  name: string;
  type: 'dir' | 'file';
  fp: string;
}

export interface BaseProvider {
  basePath: string;
  listDir: (pathRelative: string) => Promise<ProviderFile[]>;
  /** The text of a file, or `null`. With `maxBytes`, a larger file is `null` too, without being read. */
  open: (path: string, maxBytes?: number) => Promise<null | string>;
  stat: (path: string) => Promise<{ size: number } | null>;
  /** Folder names that are not entered, at any depth. When present it replaces `IGNORED_DIVE_PATHS`; empty skips nothing. */
  readonly skipDirs?: readonly string[];
}

export const IGNORED_DIVE_PATHS = [
  'node_modules',
  'dist',
  'build',
  '_build',
  '.build',
  '.dart_tool',
  'obj',
  'Pods',
  'bin',
  'static',
  'public',
  'vendor',
  'terraform.tfstate.d',
  'migrations',
  'tests',
  'e2e',
  '__fixtures__',
  '__snapshots__',
  'tmp',

  // -- Dot folder
  '.artifacts',
  '.assets',
  '.azure',
  '.azure-pipelines',
  '.bundle',
  '.cache',
  '.changelog',
  '.devcontainer',
  '.docker',
  '.dynamodb',
  '.fusebox',
  '.git',
  // needed to detect github actions
  // '.github',
  '.gitlab',
  '.gradle',
  '.log',
  '.metadata',
  '.npm',
  '.nuxt',
  '.react-email',
  '.release',
  '.semgrep',
  '.serverless',
  '.svn',
  '.terraform',
  '.vercel',
  '.vscode',
  '.vuepress',
];
