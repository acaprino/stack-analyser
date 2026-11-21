import { register } from '../../register.js';

register({
  tech: 'playwright',
  name: 'Playwright',
  type: 'automation',
  files: ['playwright.config.ts', 'playwright.config.cjs', 'playwright.config.cts', 'playwright.config.js', 'playwright.config.mjs', 'playwright.config.mts'],
  dependencies: [
    { type: 'npm', name: 'playwright' },
    { type: 'npm', name: '@playwright/test' },
    { type: 'githubAction', name: 'microsoft/playwright-github-action' },
    { type: 'docker', name: 'mcr.microsoft.com/playwright' },
    { type: 'python', name: 'pytest-playwright' },
    { type: 'maven', name: 'io.quarkiverse.playwright:quarkus-playwright' },
    { type: 'nuget', name: 'Microsoft.Playwright' },
    { type: 'python', name: 'playwright' },
  ],
});
