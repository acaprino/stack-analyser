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

## Registry port

A service registry can hold recognition signs that no rule here has: package names, expressions, variables, hosts and file names, and some are the work of hand rather than of an older release of these rules. `port-registry.mjs` settles every one of them against the built package in `dist/`: the package recognises it already, it becomes a rule, or it is a difference with a reason. It reads a registry of schema `daodan/service-registry/v1` and never runs anything.

```sh
npm run build
node benchmarks/port-registry.mjs ../daodan/daodan/data/service-registry.json           # prints the report, writes nothing
node benchmarks/port-registry.mjs ../daodan/daodan/data/service-registry.json --write   # writes the rules, src/types/techs.ts and the report
npm run build   # regenerates the index files; then run the script again: a second run changes nothing
```

Without `--write` the script prints the report on stdout and what is left to do on stderr. The exit code is 0 only when every sign is a rule or a difference, and the dry run counts what `--write` would still add as left to do. `registry-port.json` is that report:

- `registry` is the sha256 of the registry file that was read.
- `new` lists the ids that became a rule file, `extended` the signs added to a rule that already existed, by id, and `renamed` the registry ids that are the same technology as a rule of the fork and join it under the id it has. A registry entry is a duplicate of a rule when they have the same name, without case and punctuation, or a package in common; of the two ids the one release 1.27.6 already had stays, and otherwise the registry's.
- `differences` is written by hand and kept by the script. Each entry is `{ id, sign, reason }` for a sign of the registry that is not a rule. `src/rules/registryPort.test.ts` checks that the rule still does not take it for the package signs (9), the file names (8) and the variable (1), and that every difference has a reason of its own. The 49 `pattern:` expressions and the 8 `source:` signs have no such check: for those the reason is the only record, and a rule could take the expression without a test failing.

A sign reads `<type>:<name>` for a package of that dependency type (`npm:vite`, `maven:org.mongodb:mongodb-driver-sync`), and `pattern:<type>:<expression>`, `env:<name>`, `host:<name>`, `file:<name>` or `source:<kind>:<name>`. The registry writes a directory without the slash that marks it in a rule, so `.github` is covered by `.github/`; it writes package names without regard to case and in lower case, so a rule that spells the name as published (`github.com/DataDog/dd-trace-go`) covers it. A sign that the fork already recognises under another technology is a difference, never a second owner for the package.

Where a registry id is the same technology as a rule of the fork, it joins that rule instead of becoming a second one (`renamed`): `kafka` joins `apache_kafka`, `vault` joins `hashicorp_vault`, and `react-email` joins `reactemail`. Four pairs of ids are near-duplicates at the level of the vendor, and the port keeps each pair as two ids, because the registry has them as two entries: `saas/perplexity` and `ai/perplexityai`, `saas/jira-software` and `collaboration/atlassian.jira`, `db/cockroach-labs` and `db/cockroachdb`, and `saas/langchain-corporate` and `framework/langchain` (the paths are the rule files under `src/rules`). Each rule of a pair has its own packages.

The registry's additions also name signs they declare wrong. The fork holds none of them, except eight Gradle plugin ids (`com.android.application` and seven more): the additions declare them wrong as packages and hold the same anchored expression, which the fork has too. Dropping `postman-collection` from postman is the one accepted loss: `postman` is no longer recognised on the recorded project `real-app-hoppscotch`, whose expected labels do not include Postman.

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

After the port the package registers 1,218 technologies, 142 more than the 1,076 before it. The new ones are 142 rules with 187 packages, 132 existing rules gained 154 packages and 1 expression, and 80 signs are differences. Three registry ids (`kafka`, `react-email`, `vault`) join the rules `apache_kafka`, `reactemail` and `hashicorp_vault`, and the rule `jinja2`, born in this branch, is now `jinja`, the registry's id. The 80 differences are 41 expressions the fork already holds in a stricter form (anchored, or ending the name), 13 packages that the fork gives to another rule (a test fixes most of them), 11 signs that its readers recognise (Dockerfile, Compose files, Swift imports and ExUnit calls), 7 signs it dropped or narrowed on purpose (the App Service resources of Static Web Apps, `jenkins-docker`, `mongoose` for MongoDB, `^io.quarkus:`, the scope `@trayio-app`), 6 misspellings in the registry or in the older release, and the two Jekyll files `_config.yml` and `_config.yaml`, which are not signs of GitHub Pages. Release 1.27.6-daodan.4 took `^io.quarkus:` back from the differences, which are now 79: the rule quarkus holds `/^io\.quarkus:/` and `/^io\.quarkus\.platform:/`, so an extension that is a technology of its own (`io.quarkus:quarkus-rest-qute`) gives that one and quarkus. Release 1.27.6-daodan.5 took back four more, so the differences are now 75: the Spring Boot starters for AMQP, MongoDB and Redis give RabbitMQ, MongoDB and Redis as well, since each brings the client of its server, and `socialiteproviders/okta` gives okta as well as okta.oauth. Beyond the registry, the starters for Elasticsearch, Cassandra, Neo4j and Couchbase and the reactive starters for MongoDB, Redis, Cassandra and Couchbase give their server too; they are not registry signs, so `registry-port.json` does not list them. The JPA, JDBC and R2DBC starters name no server and give none. Where a difference stays because the registry's form would also accept what is not the technology, the rule now takes what that form found that is: `mongoose` is also mongodb, the redistributions of fifteen images are named (Bitnami, CircleCI, Canonical, Elastic, Confluent, Oracle, Red Hat, distroless and others), cats-core's Scala.js and Scala Native builds, the Gradle plugin id `io.gatling.gradle`, `google_container_azure_client`, three Datadog log shippers, `sequelize-auto` and `@nestjs/sequelize`; and a Compose file that only includes other Compose files gives docker. The replay below was not run again for either release.

| Replay before and after the port | Before | After | Lost |
| --- | ---: | ---: | ---: |
| Frameworks, libraries and tools | 478 / 569 | 478 / 569 | 0 |
| Services | 219 / 518 | 219 / 518 | 1 |

No expected name is gained: 51 detections on 20 of the 178 recorded projects gain an id (`ruff`, `gunicorn`, `jinja` and a few other Python tools; none completes an expected name). An emulation of the registry's own matching on the same declarations (names without regard to case, every expression, the same scoring of names) reaches no expected name that the fork misses. The services total is 219 here; an earlier estimate of at least 232 came from a different scorer. No id recognised before is lost, except `jinja2` (renamed `jinja`) and `postman` on `real-app-hoppscotch`, the accepted loss above; no expected name is lost. The names left unmatched are the ones of the table above, with one fewer unknown name among the services:

| Why expected labels remain unmatched after the port | Frameworks, libraries and tools | Services |
| --- | ---: | ---: |
| The product has a package rule, but none of its known packages matched | 85 | 162 |
| The product has no package rule | 6 | 35 |
| No registered product name or known alias matched the expected name | 0 | 102 |

```sh
node benchmarks/replay-declarations.mjs . . ../daodan/benchmarks/project-model coverage-after.json
node benchmarks/port-registry.mjs ../daodan/daodan/data/service-registry.json
```

## Ecosystem coverage

This rule decides which frameworks of an ecosystem the fork must recognise. It was written and committed before any list was fetched.

1. **List.** For each of the nine ecosystems the fork reads from manifests — npm (the web), PyPI, Go modules, crates.io, NuGet, Maven Central, Packagist, RubyGems and pub.dev — the 1,000 packages that the most public repositories depend on, as packages.ecosyste.ms counts them (`/api/v1/registries/<registry>/packages?sort=dependent_repos_count&order=desc`). The count is the same in all nine: Go modules and Maven Central publish no download counts, and a repository that declares a package is what the fork reads. The list is fetched once; the table gives its date.
2. **Framework.** A package of the list is kept when it is an application framework, one that gives the structure of a whole web, server, mobile or desktop application or site (a web or API server framework, a full-stack or front-end framework, a static site generator, a mobile or desktop application framework), or a user-interface framework (a toolkit of UI components or widgets, a GUI toolkit, a CSS framework). Left out: a library for one concern (an HTTP client, a router, an ORM, a driver, state, logging, validation, serialization), test, build, lint and type tools, and a framework's plugins, adapters, internal packages and type definitions, which count with the framework. A first pass keeps the packages whose description or keywords on ecosyste.ms hold `framework`, `gui`, `ui`, `user interface`, `widget`, `toolkit`, `component`, `web server`, `http server` or `css`; each of those is then read and decided by hand, and the table records the decision.
3. **Threshold.** Every framework of the list is widespread and must have a rule: the fork's dependency matcher (`dependencies.detect`, as in the replay) gives a technology for its name in its ecosystem. One it misses gets a rule, under the id of Daodan's registry when the registry has the technology. Nothing outside the 1,000 gets a rule from this measurement.
4. **Before and after.** `replay-declarations.mjs` and a full stack run on Daodan's corpus show the names each build finds and loses.

**Amendment of 28 November 2026, before the table.** The lists fetched at 16:31 UTC show two faults of the rule as written. The rank misplaces the threshold: ecosyste.ms counts the dependencies of lockfiles, so in npm the 1,000th package (`type-detect`) has 1,341,557 dependent repositories and no framework reaches it (`jquery` 998,742, `vue` 902,397, `bootstrap` 874,564, `@angular/core` 768,558), while in NuGet the 1,000th has 53. And the words of the first pass miss frameworks whose description does not use them: `starlette` ("The little ASGI library that shines."), `sinatra`, `jekyll`, `spring-webmvc`, `jersey-server`, `axum`, `warp`. So the rule changes in three points, and nothing else:

- The threshold is no longer the 1,000th package: it is 1% of the dependent repositories of the ecosystem's most depended-on package, and the list goes down to it.
- The first pass also takes the words `web`, `app`, `application`, `server`, `http`, `mvc`, `rest`, `api`, `router`, `routing`, `site`, `static`, `asgi`, `wsgi`, `rack`, `sass`, `less`, `theme`, `style`, `desktop`, `mobile`, `native`, `react`, `vue`, `angular`, `flutter` and `bootstrap`. A package whose description says none of them (`Vert.x 5 Parent pom`, `Apache Struts`) still escapes it.
- Only the candidates that the fork's matcher does not recognise are decided by hand: the others are covered whatever the decision.

```sh
node benchmarks/ecosystem-coverage.mjs fetch lists.json
node benchmarks/ecosystem-coverage.mjs candidates lists.json
node benchmarks/ecosystem-coverage.mjs check lists.json benchmarks/ecosystem-frameworks.json ../stack-analyser-baseline
node benchmarks/ecosystem-coverage.mjs check lists.json benchmarks/ecosystem-frameworks.json .
```

`ecosystem-frameworks.json` holds the decisions: each framework the matcher of release 1.27.6-daodan.6 missed, with the candidates that came closest to being one and why they are not. `check` refuses a framework that is not in the list or that the first pass did not keep.

### Results of 28 November 2026

The lists were fetched at 16:40:30 UTC. Recognised counts the candidates of the first pass for which release 1.27.6-daodan.6 gives a technology, whatever they are; the last column names, by rank, the frameworks of the list it missed.

| Ecosystem | Threshold (dependent repositories) | Packages | Candidates | Recognised | Frameworks missed |
| --- | ---: | ---: | ---: | ---: | --- |
| npm | 57,652 | 4,775 | 931 | 96 | `connect`, `react-bootstrap`, `@material-ui/core`, `reveal.js`, `reactstrap`, `bootstrap-sass`, `element-ui`, `@nestjs/core`, `ink`, `bulma`, `@ng-bootstrap/ng-bootstrap` |
| PyPI | 6,799 | 616 | 115 | 23 | `tornado`, `starlette`, `dash`, `bottle`, `twisted` |
| Go modules | 2,989 | 1,522 | 160 | 19 | `github.com/emicklei/go-restful` and `/v3`, `github.com/zenazn/goji`, `github.com/labstack/echo` (before `/v4`), `github.com/go-martini/martini`, `github.com/kataras/iris/v12` |
| crates.io | 1,244 | 1,601 | 170 | 11 | `rocket`, `warp`, `bevy`, `egui`, `tui` |
| NuGet | 1,404 | 46 | 26 | 2 | `bootstrap`, `knockoutjs`, `angularjs` |
| Maven Central | 15,837 | 279 | 83 | 19 | `org.springframework:spring-web`, `io.netty:netty-all`, `com.sun.jersey:jersey-server` |
| Packagist | 7,775 | 415 | 114 | 10 | `livewire/livewire`, `components/bootstrap`, `silex/silex`, `zendframework/zendframework` |
| RubyGems | 14,128 | 525 | 178 | 15 | `bootstrap-sass`, `compass`, `jquery-ui-rails`, `bootstrap`, `twitter-bootstrap-rails`, `stimulus-rails`, `middleman`, `middleman-core` |
| pub.dev | 2,401 | 294 | 127 | 1 | `shelf` |

All 46 have a rule now. Eleven join a rule that already existed (bootstrap, angularjs, nestjs, materialui, echo, stimulus); the other 35 are 33 new technologies, none of which Daodan's registry has yet: `connect-node`, `revealjs`, `element-ui`, `bulma`, `reactstrap`, `react-bootstrap`, `ng-bootstrap`, `ink`, `knockout`, `jquery-ui`, `tornado`, `starlette`, `dash`, `bottle`, `twisted`, `goji`, `martini`, `iris`, `go-restful`, `rocket`, `warp`, `bevy`, `egui`, `tui-rs`, `spring-framework`, `netty`, `jersey`, `livewire`, `silex`, `zend-framework`, `compass`, `middleman` and `shelf`. Reactstrap, React Bootstrap and ng-bootstrap give Bootstrap as well, since they need its CSS.

The first pass still misses what its words do not name: `jquery` (998,742 dependent repositories, "JavaScript library for DOM operations") is not a candidate, and under rule 2 a DOM library is no framework anyway. Release 1.27.6-daodan.6 has no rule for jQuery.

### Before and after on Daodan's corpus

Both measures ran on Daodan's `develop` checkout of 28 November 2026 (`1f3934f`), release 1.27.6-daodan.6 against release 1.27.6-daodan.7, this branch. `stack-corpus.py` approximates Daodan's `stack` step on the 186 projects with the pinned checkouts: it reproduces Daodan's own record of the release within one name (585 against 586 of 645: Daodan also finds Cypress on `real-bank-of-anthos`).

| Measure | 1.27.6-daodan.6 | 1.27.6-daodan.7 | Gained | Lost |
| --- | ---: | ---: | ---: | ---: |
| Replay of the recorded declarations, frameworks, libraries and tools | 478 / 569 | 479 / 569 | 1 | 0 |
| Replay of the recorded declarations, services | 219 / 518 | 219 / 518 | 0 | 0 |
| Full stack, frameworks by name (186 projects) | 585 / 645 | 606 / 645 | 21 | 0 |

The replay sees only what Renovate recorded: no Maven dependency without a version, no page, no Gradle test task. On the full stack the 21 names are JUnit Jupiter (6), Hibernate (5), Bootstrap (3), Mockito (2), and one each of TestNG, kotlin.test, Starlette, AngularJS and Ionicons, on 15 projects; no id that the release gave is lost, and the branch gives 38 more pairs of project and id. Of the 39 names still missed, Firebase (3) and Inngest are found and classed as services by Daodan's registry; Bootstrap on two projects and AngularJS on one are a vendored or minified file that Daodan's snapshot leaves out; Docus, VitePress, Vue.js and Roq are declared under `docs/`, which the snapshot also leaves out; Bootstrap and Font Awesome on `real-auth0-go` come from BootstrapCDN's old hosts, which no documentation gives any more; jQuery (2) has no rule; the rest, Cypress on `real-bank-of-anthos` among them, are names of one project each.

```sh
python3 benchmarks/stack-corpus.py fetch ../daodan/benchmarks/project-model ../trees
python3 benchmarks/stack-corpus.py compare ../daodan/benchmarks/project-model ../trees ../stack-analyser-baseline,. stack-corpus.json
node benchmarks/replay-declarations.mjs ../stack-analyser-baseline . ../daodan/benchmarks/project-model coverage.json
```

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

## Packed package

`verify-package.mjs` proves that the package, as `npm pack` makes it, runs from an empty folder with plain Node and no `npm install`. It takes no argument and installs nothing.

```sh
npm run build
node benchmarks/verify-package.mjs
```

It runs `npm pack` in the repository, which names the file `stack-analyzer-daodan-<version>.tgz` (`stack-analyzer-daodan-1.27.6-daodan.7.tgz` for this release), unpacks the `.tgz` into a temporary folder outside it, and runs `node package/dist/cli.mjs` from there with `NODE_PATH` empty: `--catalogue catalogue.json`, which must write a non-empty JSON array whose entries all have `tech`, `name` and `type`; an analysis of `tests/__fixtures__` with `--perimeter perimeter.json` (`{"skipDirs": [], "ignore": []}`), which must write its output; and the analysis `tests/__fixtures__ --output out.json` that the checks below read. `npm pack` does not build, so run `npm run build` first or the CLI is not in the package. Before it runs anything, the script checks that no `node_modules` folder exists above the unpacked package, because Node would find from there a dependency that the `.tgz` does not carry. It needs `tar` on the path.

It exits with 1 when a command fails, when the catalogue or the perimeter run does not give what is described above, or when no component of the output has evidence of kind `terraform` (the WebAssembly file of `@cdktf/hcl2json` did not load, or `.terraform.lock.hcl` was not parsed) or of kind `package` (the `package.json` of the fixtures was not read). When it succeeds it prints the path of the `.tgz`, its sha256 and its size. The `.tgz` stays where it is, so that it can be uploaded; a failed run removes it, and the unpacked folder is always removed.
