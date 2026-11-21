import { register } from '../../register.js';

register({
  tech: 'sqlite',
  name: 'SQLite',
  type: 'db',
  files: ['schema.sqlite'],
  dependencies: [
    { type: 'npm', name: 'sqlite' },
    { type: 'npm', name: 'better-sqlite3' },
    { type: 'npm', name: 'sqlite3' },
    { type: 'rust', name: 'sqlite' },
    { type: 'rust', name: 'rusqlite' },
    { type: 'rust', name: 'libsqlite3-sys' },
    { type: 'ruby', name: 'sqlite3' },
    {
      type: 'deno',
      name: /^https:\/\/deno\.land\/x\/sqlite3(?:@[^/?#]+)?\//,
      example: 'https://deno.land/x/sqlite3@1.3.5/lib/shim.ts',
    },
    { type: 'npm', name: '@sqlite.org/sqlite-wasm' },
    { type: 'golang', name: 'github.com/glebarez/go-sqlite' },
    { type: 'golang', name: 'github.com/glebarez/sqlite' },
    { type: 'golang', name: 'github.com/mattn/go-sqlite3' },
    { type: 'golang', name: 'github.com/ncruces/go-sqlite3' },
    { type: 'golang', name: 'modernc.org/sqlite' },
    { type: 'nuget', name: 'CommunityToolkit.Aspire.Hosting.SQLite' },
    { type: 'nuget', name: 'Microsoft.EntityFrameworkCore.Sqlite' },
    { type: 'php', name: 'ext-pdo_sqlite' },
  ],
});
