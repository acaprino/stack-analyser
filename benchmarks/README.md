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

## GitHub review

The `github-review-*` scripts compare two built packages on pinned public repositories. They read files and
never run repository code. `github-review-projects.json` pins 112 repositories by commit, tree and file
count: 14 each for JavaScript, TypeScript and Python, and 7 each for Java, Kotlin, Go, Rust, PHP, Ruby,
Elixir, Dart, C# and Swift. Each one is marked `development` (80) or `holdout` (32).

Run the four steps in this order. The labels must exist before anyone looks at a scan result.

1. **Fetch the snapshots.** Each commit is fetched at depth 1 into a temporary bare repository and its blobs
   are written out directly, so no checkout filter or hook runs. Every blob is verified against the tree.
   A snapshot lands in `SNAPSHOTS/owner--repo`, and `--inventory` records the path, hash, size and mode of
   every file.

   ```sh
   node benchmarks/github-review-fetch.mjs ../snapshots --jobs 4 --inventory ../inventory.json
   ```

2. **Derive the labels.** This step reads the original manifests and configuration files and loads neither
   package nor its rules. `github-review-panel.json` lists, per package registry, the packages that identify
   each product. A product counts once per project, preferring a manifest over source and the shallowest
   path. Eligible projects also get one CI system that is verifiably absent, as a negative control. Files
   the script could not parse are listed under `oracleWarnings`.

   ```sh
   node benchmarks/github-review-labels.mjs ../snapshots benchmarks/github-review-projects.json ../labelled.json ../inventory.json
   ```

3. **Run both CLIs.** The runner re-verifies each snapshot against its pin, runs `dist/cli.js` from the
   baseline and from the candidate, and scores every label as `tp`, `fn`, `fp`, `tn` or `unscored`. A
   detection without a label is left unjudged. The report records a hash of both builds and fails if either
   changed during the run. Raw graphs go to `--raw-dir`, by default `review-runs` next to the snapshots.
   The exit code is 1 when any project failed on either side.

   ```sh
   node benchmarks/github-review-runner.mjs ../stack-analyser-upstream . ../snapshots ../labelled.json ../report.json --jobs 4 --timeout-ms 120000
   ```

4. **Sample predictions for manual review.** This prints up to 60 repository and technology pairs from the
   candidate, spread across technology groups and languages in a fixed pseudo-random order. Expected labels
   and detection reasons play no part in the selection.

   ```sh
   node benchmarks/github-review-sample.mjs ../report.json . > ../review-sheet.json
   ```

No results from this review are recorded here yet.

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

## Startup

`startup.mjs` runs one CLI five times on one project and prints the five times and their median, in milliseconds, each measured from spawn to exit of the whole process. It exits with 1 when the median is above `--max-ms`. Every run happens in an empty temporary folder, so the CLI's output file never lands in the repository, and a run that fails or writes no output is an error (exit 2), never a fast time.

`npm run build` writes two entry points. `dist/cli.js` is the compiled modules, more than a thousand small files that Node has to find, read and parse on every start. `dist/cli.mjs` is the same CLI, every rule and every dependency in one file made by esbuild (`src/scripts/bundle.ts`). Only `@cdktf/hcl2json` stays outside it: it reads its WebAssembly file by a path relative to its own module. The two give the same output, which `src/cli.test.ts` checks on `tests/__fixtures__`.

```sh
node benchmarks/startup.mjs dist/cli.js ../daodan/benchmarks/project-model/fixtures/py-fastapi-compose
node benchmarks/startup.mjs dist/cli.mjs ../daodan/benchmarks/project-model/fixtures/py-fastapi-compose --max-ms 1000
```

The CLI used to wait 500 ms after starting its spinner, before the analysis began. That pause did no work and is removed: it was 52 to 68 percent of the bundle's previous median (500 of 966 to 736 ms). The figures below are measured without it.

Measured on 21 November 2026 on Windows 11 with Node 24.14.1 and 22 logical cores, on the `py-fastapi-compose` fixture of the project-model corpus. The machine was not quiet: unrelated work from other sessions kept the CPU between 35 and 96 percent busy during every measurement, so the figures are noisy, and `dist/cli.js` suffers from that far more than the bundle does.

| Entry point | Five runs (ms) | Median (ms) |
| --- | --- | ---: |
| `dist/cli.js` | 3611, 7449, 2943, 5887, 3972 | 3972 |
| `dist/cli.mjs` | 561, 667, 609, 611, 607 | 609 |

Two other pairs taken minutes apart gave medians of 7885 and 4519 ms for `dist/cli.js` and 746 and 526 ms for `dist/cli.mjs`. Before the pause was removed, runs on a less loaded machine gave medians between 1978 and 2428 ms for `dist/cli.js` and between 736 and 881 ms for `dist/cli.mjs`. Every median of the bundle was under 1,000 ms. A run of `node dist/cli.mjs --version`, which loads the whole bundle and registers every rule, takes about 190 ms on a less loaded machine, against about 2,200 ms for `dist/cli.js`, and an empty Node process takes about 50 ms.

A `node --cpu-prof` run of the bundle with the pause still in place (764 ms of profile) spent 432 ms idle in it. Of the rest, about 32 ms went to compiling the bundle, about 23 ms to decompressing the Terraform WebAssembly that `@cdktf/hcl2json` loads as soon as it is imported (plus about 15 ms of WebAssembly start), and the remainder to reading files and the analysis, none of it above 10 ms per function. Cutting the time further means loading `@cdktf/hcl2json` only when a Terraform file is found.
