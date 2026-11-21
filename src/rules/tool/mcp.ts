import { register } from '../../register.js';

register({
  tech: 'mcp',
  name: 'Model Context Protocol SDK',
  type: 'tool',
  dependencies: [
    { type: 'npm', name: '@modelcontextprotocol/sdk' },
    { type: 'python', name: 'mcp' },
    { type: 'ruby', name: 'mcp' },
    { type: 'npm', name: '@modelcontextprotocol/client' },
    { type: 'npm', name: '@modelcontextprotocol/server' },
  ],
});
