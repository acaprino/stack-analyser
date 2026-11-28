import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyser } from '../../analyser/index.js';
import { flatten } from '../../payload/helpers.js';
import { FakeProvider } from '../../provider/fake.js';
import '../../autoload.js';

async function scan(files: Record<string, string>) {
  const provider = new FakeProvider({
    paths: { '/': Object.keys(files) },
    files: Object.fromEntries(
      Object.entries(files).map(([name, text]) => [path.join('/', name), text])
    ),
  });
  return flatten(await analyser({ provider }), { merge: true });
}

describe('native package manifests', () => {
  it('should read SDK and hosted Pub dependencies and their direct locked versions', async () => {
    const result = await scan({
      'pubspec.yaml': [
        'name: reader',
        'dependencies:',
        '  flutter: {sdk: flutter}',
        '  local: {path: ../local}',
        '  overridden: ^1.0',
        '  in_workspace: ^1.0',
        'dev_dependencies:',
        '  flutter_test: {sdk: flutter}',
        '  test: ^1.2',
        'dependency_overrides:',
        '  overridden: {path: ../override}',
      ].join('\n'),
      'pubspec.lock': [
        'packages:',
        '  test: {source: hosted, dependency: direct dev, version: "1.25.0"}',
        '  unused: {source: hosted, dependency: transitive, version: "3.0.0"}',
        '  sibling: {source: hosted, dependency: direct main, version: "4.0.0"}',
        '  in_workspace: {source: path, dependency: direct main, version: "1.0.0"}',
      ].join('\n'),
    });

    expect(result.dependencies.sort()).toEqual([
      ['pub', 'flutter', 'sdk:flutter'],
      ['pub', 'flutter_test', 'sdk:flutter'],
      ['pub', 'test', '1.25.0'],
    ]);
    expect(result.techs).toContain('flutter-test');
  });

  it('should read explicit NuGet references, SDKs and direct pins, excluding central-only and local references', async () => {
    const result = await scan({
      'Service.csproj':
        '<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>' +
        '<PackageReference Include="xunit"/><PackageReference Include="MudBlazor"><Version>8.0.0</Version></PackageReference>' +
        '<PackageReference Include="Serilog"/><PackageReference Update="UpdatedOnly" Version="9"/><ProjectReference Include="../Local.csproj"/>' +
        '<!-- <PackageReference Include="Comment"/> --></ItemGroup></Project>',
      'Directory.Packages.props':
        '<Project><ItemGroup><PackageVersion Include="CentralOnly" Version="1"/>' +
        '<PackageVersion Include="Serilog" Version="4.2.0"/></ItemGroup></Project>',
      'packages.lock.json': JSON.stringify({
        version: 1,
        dependencies: {
          net8: {
            Xunit: { type: 'Direct', resolved: '2.9.0' },
            Other: { type: 'Transitive', resolved: '1.0' },
          },
        },
      }),
    });

    expect(result.dependencies.sort()).toEqual([
      ['nuget', 'MudBlazor', '8.0.0'],
      ['nuget', 'Serilog', '4.2.0'],
      ['nuget', 'xunit', '2.9.0'],
    ]);
    expect(result.techs).toContain('aspnetcore');
    expect(result.techs).toContain('xunit');
  });

  it('should attribute an unconditional WinUI opt-in to its own project', async () => {
    const windowsSdk =
      '<ItemGroup><PackageReference Include="Microsoft.WindowsAppSDK" Version="2.6.5"/></ItemGroup>';
    const on = '<PropertyGroup><UseWinUI>true</UseWinUI></PropertyGroup>';
    const result = await scan({
      'Desktop.csproj': '<Project>' + on + windowsSdk + '</Project>',
      'Console.csproj':
        '<Project><PropertyGroup><UseWinUI>false</UseWinUI></PropertyGroup>' +
        windowsSdk +
        '</Project>',
      'SdkOnly.csproj': '<Project>' + windowsSdk + '</Project>',
      'Conditional.csproj':
        '<Project><PropertyGroup Condition="42 == 42"><UseWinUI>true</UseWinUI></PropertyGroup></Project>',
      'Computed.csproj':
        '<Project><PropertyGroup><UseWinUI>$(EnableDesktop)</UseWinUI></PropertyGroup></Project>',
      'Conflicting.csproj':
        '<Project>' +
        on +
        '<Choose><When Condition="42 == 42"><PropertyGroup>' +
        '<UseWinUI>false</UseWinUI></PropertyGroup></When></Choose></Project>',
      'ConditionalProperty.csproj':
        '<Project><PropertyGroup><UseWinUI Condition="42 == 42">true</UseWinUI></PropertyGroup></Project>',
    });

    expect(
      result.childs.filter((child) => child.techs.has('winui')).map((child) => child.name)
    ).toEqual(['Desktop']);
    expect(result.toJson().reason.filter((reason) => reason.includes('UseWinUI'))).toEqual([
      'MSBuild UseWinUI=true in Desktop.csproj',
    ]);
  });

  it('should read Hex aliases and locked versions, keeping examples and local packages out', async () => {
    const result = await scan({
      'mix.exs': [
        'defmodule Demo.MixProject do',
        '  def project, do: [app: :demo, deps: deps()]',
        '  defp deps do',
        '    [{:phoenix, "~> 1.7"}, {:db, "~> 3.0", hex: :ecto_sql}, {:local, path: "../local"}]',
        '  end',
        '  defp unrelated, do: [{:not_a_dependency, "1"}]',
        'end',
      ].join('\n'),
      'mix.lock':
        '%{"phoenix": {:hex, :phoenix, "1.7.15", [], []}, "other": {:hex, :other, "2.0", [], []}}',
      'test_helper.exs': '# ExUnit.configuration()\n~S"ExUnit.start()"\nExUnit.start()\n',
    });

    expect(result.dependencies.sort()).toEqual([
      ['hex', 'ecto_sql', '~> 3.0'],
      ['hex', 'phoenix', '1.7.15'],
    ]);
    expect(result.techs).toContain('exunit');
    expect(result.toJson().reason.filter((r) => r.startsWith('ExUnit.'))).toEqual([
      'ExUnit.start at test_helper.exs:3',
    ]);
    expect(result.techs).toContain('ecto');
  });

  it('should read SwiftPM remote identities and source SDK imports, leaving package and module names distinct', async () => {
    const result = await scan({
      'Package.swift': [
        'import PackageDescription',
        'let package = Package(name: "Mobile", dependencies: [',
        '  .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.0.0"),',
        '  .package(path: "../Local"), .package(url: fetchedURL, from: "1.0.0")])',
      ].join('\n'),
      'Package.resolved': JSON.stringify({
        version: 3,
        pins: [
          {
            identity: 'firebase-ios-sdk',
            kind: 'remoteSourceControl',
            state: { version: '10.1.0' },
          },
          { identity: 'transitive', kind: 'remoteSourceControl', state: { revision: 'abc' } },
        ],
      }),
      'ContentView.swift':
        '/* nested /* import UIKit */ import Flutter */\n' +
        'let note = #"import FirebaseMessaging"#\nimport SwiftUI\nimport struct MapKit.MKMapRect\n',
    });

    expect(result.dependencies).toEqual([['swiftpm', 'firebase-ios-sdk', '10.1.0']]);
    expect(result.techs).toContain('swiftui');
    expect(result.techs).toContain('mapkit');
    expect(result.techs).toContain('firebase');
    expect(result.techs).not.toContain('uikit');
    expect(result.techs).not.toContain('flutter');
    expect(result.toJson().reason.filter((r) => r.startsWith('Swift import'))).toEqual([
      'Swift import SwiftUI at ContentView.swift:3',
      'Swift import MapKit at ContentView.swift:4',
    ]);
  });

  it('should not interpret strings, comments or similarly named modules as SDK use', async () => {
    const result = await scan({
      'App.swift':
        '// import UIKit\nlet note = "import SwiftUI"\nlet demo = "\\(render("import UIKit"))"\nimport SwiftUIExtras\n',
      'test_helper.exs':
        '# ExUnit.start()\n~r/ExUnit.start()/\n~S{literal {nested} ExUnit.start()}\n' +
        '"#{inspect("ExUnit.start()")}"\nExample.ExUnit.start()\n',
      'Package.swift':
        'let p = Package(name: "Local", dependencies: [.package(url: "https://github.com/other/firebase-ios-sdk", from: "1")])',
    });

    expect(result.techs).not.toContain('uikit');
    expect(result.techs).not.toContain('swiftui');
    expect(result.techs).not.toContain('exunit');
    expect(result.techs).not.toContain('firebase');
  });
});
