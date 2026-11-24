import { detectRubyLockfile } from './lockfile.js';
import { register } from '../../../register.js';

register({
  tech: 'ruby',
  name: 'Ruby',
  type: 'language',
  files: ['Gemfile', 'Rakefile'],
  extensions: ['.rb', '.rbx', '.ru', '.ruby'],
  dependencies: [
    { type: 'docker', name: /^ruby(?:\/|$)/, example: 'ruby' },
    { type: 'docker', name: 'bitnami/ruby' },
    { type: 'docker', name: 'circleci/ruby' },
    { type: 'docker', name: 'cimg/ruby' },
    // JRuby runs Ruby code on the JVM.
    { type: 'docker', name: 'jruby' },
    // Red Hat's Ruby images.
    {
      type: 'docker',
      name: /^(?:registry\.access\.redhat\.com|registry\.redhat\.io)\/ubi\d+\/ruby-\d+$/,
      example: 'registry.access.redhat.com/ubi8/ruby-30',
    },
    { type: 'githubAction', name: 'ruby/setup-ruby' },
  ],
  detect: detectRubyLockfile,
});
