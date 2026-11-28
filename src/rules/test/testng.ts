import { register } from '../../register.js';

// The Gradle reader also gives it for a test task that calls useTestNG().
register({
  tech: 'testng',
  name: 'TestNG',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-testng' },
    { type: 'maven', name: 'org.testng:testng' },
  ],
});
