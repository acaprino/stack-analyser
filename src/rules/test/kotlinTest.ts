import { register } from '../../register.js';

register({
  tech: 'kotlin-test',
  name: 'kotlin.test',
  type: 'test',
  dependencies: [
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test' },
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-annotations-common' },
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-common' },
    // The variant of each JVM test framework, which brings that framework with it.
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-junit' },
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-junit5' },
    { type: 'maven', name: 'org.jetbrains.kotlin:kotlin-test-testng' },
  ],
});
