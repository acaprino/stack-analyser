import { register } from '../../register.js';

register({
  tech: 'protobuf',
  name: 'Protocol Buffers',
  type: 'tool',
  dependencies: [
    { type: 'python', name: 'protobuf' },
    { type: 'rust', name: 'prost' },
    { type: 'rust', name: 'prost-types' },
    { type: 'rust', name: 'protobuf' },
    { type: 'golang', name: 'google.golang.org/protobuf' },
    { type: 'npm', name: '@bufbuild/protobuf' },
    { type: 'maven', name: 'com.google.protobuf:com.google.protobuf.gradle.plugin' },
    { type: 'maven', name: 'com.google.protobuf:protobuf-java' },
    { type: 'maven', name: 'com.google.protobuf:protoc' },
    { type: 'maven', name: /^com\.google\.protobuf$/, example: 'com.google.protobuf' },
  ],
});
