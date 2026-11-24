import { register } from '../../register.js';

register({
  tech: 'gatling',
  name: 'Gatling',
  type: 'test',
  dependencies: [
    // An artifact of a Gatling group, or a group alone as a Gradle plugin id: io.gatling.gradle.
    {
      type: 'maven',
      name: /^io\.gatling(?:\.[a-z0-9_-]+)*(?::[a-z0-9_.-]+)?$/,
      example: 'io.gatling.highcharts:gatling-charts-highcharts',
    },
  ],
});
