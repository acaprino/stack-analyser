import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { cdnPackage, pageReferences } from './index.js';
import { analyser } from '../../../analyser/index.js';
import { flatten } from '../../../payload/helpers.js';
import { FakeProvider } from '../../../provider/fake.js';
import '../../../autoload.js';

describe('pages that load a package from a CDN', () => {
  it.each([
    [
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
      'bootstrap',
      '5.3.2',
    ],
    [
      'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js',
      '@popperjs/core',
      '2.11.8',
    ],
    ['//fastly.jsdelivr.net/npm/htmx.org/dist/htmx.min.js', 'htmx.org', ''],
    [
      'https://unpkg.com/bootstrap-material-design@4.1.1/dist/css/bootstrap-material-design.min.css',
      'bootstrap-material-design',
      '4.1.1',
    ],
    ['https://unpkg.com/react@18/umd/react.production.min.js', 'react', '18'],
    ['http://code.jquery.com/jquery-3.1.0.min.js', 'jquery', '3.1.0'],
    ['https://code.jquery.com/jquery-3.2.1.slim.min.js', 'jquery', '3.2.1'],
    ['https://code.jquery.com/ui/1.13.2/jquery-ui.min.js', 'jquery-ui', '1.13.2'],
    ['https://ajax.googleapis.com/ajax/libs/angularjs/1.6.7/angular.js', 'angular', '1.6.7'],
    ['//code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css', 'ionicons', '2.0.1'],
  ])('should read %s as %s', (...[address, name, version]) => {
    expect(cdnPackage(address)).toStrictEqual({ name, version });
  });

  it.each([
    'https://cdn.jsdelivr.net/gh/user/repo@1.0/file.js',
    'https://code.jquery.com/jquery-migrate-3.4.1.min.js',
    'https://ajax.googleapis.com/ajax/libs/unknown/1.0/x.js',
    'https://cdn.example.com/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://unpkg.com/',
    'static/js/bootstrap.min.js',
    "{{ url_for('static', filename='bootstrap.css') }}",
    'javascript:void(0)',
  ])('should read no package from %s', (address) => {
    expect(cdnPackage(address)).toBeUndefined();
  });

  it('should take the source of a script and the target of a link, with their lines, and skip comments', () => {
    expect(
      pageReferences(
        [
          '<html><head>',
          '<!-- <script src="https://unpkg.com/vue@3"></script>',
          '-->',
          '<link rel="stylesheet"',
          '      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">',
          "<script data-src='x' src='https://code.jquery.com/jquery-3.7.1.min.js'></script>",
          '<a href="https://unpkg.com/react@18">not loaded</a><img src="https://unpkg.com/vue@3">',
        ].join('\n')
      )
    ).toStrictEqual([
      {
        address: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
        line: 5,
      },
      { address: 'https://code.jquery.com/jquery-3.7.1.min.js', line: 6 },
    ]);
  });

  it('should give the technology of each package a page or a template loads, in the module of its folder', async () => {
    const files: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'site', dependencies: {} }),
      'index.html':
        '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">\n' +
        '<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>',
      'templates/base.jinja2':
        '<!-- <link href="//code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css"> -->\n' +
        '<script src="https://unpkg.com/left-pad@1.3.0/index.js"></script>',
      'notes.txt': '<script src="https://cdn.jsdelivr.net/npm/vue@3"></script>',
    };
    const provider = new FakeProvider({
      paths: {
        '/': ['package.json', 'index.html', 'notes.txt', 'templates'],
        '/templates': ['base.jinja2'],
      },
      files: Object.fromEntries(
        Object.entries(files).map(([name, text]) => [path.join('/', name), text])
      ),
    });
    const result = flatten(await analyser({ provider }), { merge: true });

    expect(result.techs).toContain('bootstrap');
    expect(result.techs).toContain('angularjs');
    expect(result.techs).not.toContain('ionicons');
    expect(result.techs).not.toContain('vue');
    expect(
      result
        .toJson('/')
        .evidence.filter((item) => ['bootstrap', 'angularjs'].includes(item.tech))
        .map(({ tech, kind, value, path: where, line }) => [tech, kind, value, where, line])
    ).toStrictEqual([
      ['angularjs', 'package', 'angular', 'index.html', 2],
      ['bootstrap', 'package', 'bootstrap', 'index.html', 1],
    ]);
  });
});
