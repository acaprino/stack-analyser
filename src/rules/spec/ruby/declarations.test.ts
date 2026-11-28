import { describe, expect, it } from 'vitest';

import '../../../autoload.js';
import { analyser } from '../../../analyser/index.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';

async function scan(files: Record<string, string>) {
  const provider = new FakeProvider({
    paths: { '/': Object.keys(files) },
    files: Object.fromEntries(Object.entries(files).map(([name, source]) => ['/' + name, source])),
  });
  return flatten(await analyser({ provider }), { merge: true });
}

const lock = `GEM
  remote: https://rubygems.org/
  specs:
    rails (8.0.2)
      elasticsearch (>= 1)
    elasticsearch (9.0.0)
    redis (5.1.0)

DEPENDENCIES
  rails
  redis
  private_name!
`;

describe('ruby package evidence', () => {
  it('should read literal Bundler declarations, versions and nested groups', async () => {
    const data = await scan({
      Gemfile: `gem 'rails'
group :development do
  gem("redis", ">= 4", "< 6")
end
gem %q[pg]
`,
      'Gemfile.lock': lock,
    });

    expect(data.dependencies).toStrictEqual(
      expect.arrayContaining([
        ['ruby', 'rails', '8.0.2'],
        ['ruby', 'redis', '>= 4, < 6'],
        ['ruby', 'pg', 'latest'],
      ])
    );
    expect(data.techs.has('rails')).toBe(true);
  });

  it('should not read quoted examples, comments, non-registry overrides or known inactive declarations', async () => {
    const data = await scan({
      Gemfile: [
        '# gem "rails", "8"',
        'template = %q{example',
        'gem "rails", "8"',
        '}',
        "text = <<~'README'",
        '  gem "rails", "8"',
        '  README',
        'description = "example',
        "gem 'rails'",
        '"',
        '=begin',
        'gem "rails", "8"',
        '=end',
        'gem "redis", path: "../redis"',
        "gem 'rails' + '-extra'",
        "gem 'rails' if false",
        'unless true',
        "  gem 'rails'",
        'end',
        'tool.gem "rails"',
        "gem 'pg'",
        '__END__',
        'gem "rails", "8"',
      ].join('\n'),
    });

    expect(data.dependencies).toStrictEqual([['ruby', 'pg', 'latest']]);
  });

  it('should read development and runtime dependencies from the gemspec receiver', async () => {
    const data = await scan({
      Gemfile: 'gemspec',
      'example.gemspec': `Gem::Specification.new do |spec|
  spec.name = 'example'
  unrelated.add_dependency 'wrong'
  spec.add_runtime_dependency('rails', '>= 7')
  spec.add_development_dependency 'rspec'
  spec.add_dependency 'redis', '~> 5'
end
spec.add_dependency 'after_block'
`,
    });

    expect(data.dependencies.map(([, name]) => name).sort()).toStrictEqual([
      'rails',
      'redis',
      'rspec',
    ]);
    expect(data.techs.has('rails')).toBe(true);
  });

  it('should ignore stale and transitive lock entries when a manifest is present', async () => {
    const data = await scan({ Gemfile: "gem 'pg'", 'Gemfile.lock': lock });

    expect(data.dependencies).toStrictEqual([['ruby', 'pg', 'latest']]);
    expect(data.techs.has('rails')).toBe(false);
  });

  it('should limit a standalone lock to direct registry dependencies', async () => {
    const data = await scan({ 'Gemfile.lock': lock });

    expect(data.dependencies).toStrictEqual([
      ['ruby', 'rails', '8.0.2'],
      ['ruby', 'redis', '5.1.0'],
    ]);
    expect(data.techs.has('bundler')).toBe(true);
  });
});
