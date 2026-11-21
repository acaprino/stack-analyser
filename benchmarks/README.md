# Stack detection checks

`verify-manifests.mjs` runs the published CLI entry point from two built package directories. It creates small Maven, Gradle, NuGet, npm, Dart, Python and Rust projects, checks the extended analyser’s output, and prints which requested technology IDs each version emitted. The fixtures include a Maven artifact with the wrong group, an unused managed dependency, plain Vite and a similarly named npm package. All manifests are inert. The script never installs an application dependency or invokes its build.

```sh
node benchmarks/verify-manifests.mjs ../stack-analyser-upstream .
```

An optional third argument points to a workspace containing the Daodan and Imago checkouts. The verifier copies only the application and development-tool manifests listed in `workspace-manifests.json`, byte for byte, into separate temporary trees. It runs each CLI both on the complete manifest tree and on each manifest in isolation. A named product counts for that module only when both runs emit its technology ID. Multiple packages belonging to one product count once per manifest. The first-party explorer probes count separately from the application. Cargo workspace members, TypeScript declaration packages and the SDK implicit in a .NET project are excluded from the external-product counts.

```sh
node benchmarks/verify-manifests.mjs ../stack-analyser-upstream . /path/to/workspace
```

`replay-declarations.mjs` accepts a project-model corpus with `fixtures/*/expected.json` and `results/premap-runs/*.json.gz`. It passes identifiers from successful archived Renovate extractions to each build’s native `dependencies.detect` API after normal rule autoloading. Each registry receives the same evidence. It excludes files classified in the recording as generated, vendored, documentation or binary. A Gradle plugin’s published marker coordinates are available when Renovate recorded them in `packageName`. A missing archive or a failed extraction is counted separately.

```sh
node benchmarks/replay-declarations.mjs ../stack-analyser-upstream . ../daodan/benchmarks/project-model coverage.json
```

The report counts each expected product name once per project and facet. It compares both IDs and display names, with the same explicit spelling equivalences on both sides. It also lists every emitted ID, gained and lost names, and outstanding labels per project. This measurement isolates package rules. Whole-project traversal, manifest extraction, files, source references, URLs and module ownership require a separate analyser run.

## Measured results

The baseline was upstream release 1.27.6, commit `14b97f27855679ec02bfae28ed8aa2af03704547`, with 743 registered technologies. The extension had 1,066. The CLI checks used unchanged manifests from Daodan `ca89d6387` and Imago `1e1a48ce`. The expected product IDs for each manifest are recorded in `workspace-manifests.json`.

The offline run used Node 24.14.1, TypeScript 5.9.3, Vitest 5.1.0 and yaml 2.8.3 from the local cache for both builds. A clean install with the exact dependency versions in the upstream lockfile remains unverified.

| Native CLI on real manifests | Manifests | Upstream | Extended |
| --- | ---: | ---: | ---: |
| Daodan application and development tools | 6 | 7 / 26 | 26 / 26 |
| Daodan explorer probes | 2 | 3 / 7 | 7 / 7 |
| Imago including the demo | 4 | 6 / 13 | 13 / 13 |

An additional direct CLI run on the Daodan viewer checkout confirmed 4 to 7 of 7 expected products. The checkout run on Imago confirmed 6 to 13 of 13 expected product–module pairs.

The separate seven-project CLI check found Spring Boot in the Maven and Gradle positives only with the extension. Both builds left out Spring Boot in the project that declares an unrelated Maven group and merely manages a genuine starter's version. The extended CLI distinguished Vite from Vite+, recognized the official Redis image in Compose and the Valkey base in a multistage Dockerfile, and rejected unrelated private-registry images with similar names.

| Native dependency matcher on recorded package identifiers | Upstream | Extended | Gained | Lost |
| --- | ---: | ---: | ---: | ---: |
| Frameworks, libraries and tools | 190 / 569 | 478 / 569 | 288 | 0 |
| Services | 102 / 518 | 218 / 518 | 116 | 0 |

On 178 recorded projects, 90 gained at least one expected product and 63 still had unmatched labels. All seven projects labeling Spring Boot gained it. The two remaining projects in the 180-project corpus, Jellyfin and Kuvasz, have no recording for this replay.

| Why expected labels remain unmatched on archived declarations | Frameworks, libraries and tools | Services |
| --- | ---: | ---: |
| The product has a package rule, but none of its known packages matched | 85 | 162 |
| The product has no package rule | 6 | 35 |
| No registered product name or known alias matched the expected name | 0 | 103 |

Maestro can be identified by a flow file and SwiftUI by a Swift import. An integration can also call an endpoint directly over HTTP. SMTP appears as a service in 23 projects. A protocol label alone cannot identify a particular mail provider.
