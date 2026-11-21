# Stack Analyser

[![Main](https://github.com/specfy/stack-analyser/actions/workflows/ci.yaml/badge.svg)](https://github.com/specfy/stack-analyser/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/specfy/stack-analyser/branch/main/graph/badge.svg?token=6L5O79P9UI)](https://codecov.io/gh/specfy/stack-analyser)

This library provide a simple way to extract from any repository: dependencies, languages, infrastructure, SaaS, databases, etc.

Detect more than **1,000 technologies** in your codebase.

- **Full Support:** NodeJS, Docker, Typescript, PHP, Github Actions, Python, Ruby, Rust, Golang
- Partial Support: Deno, Terraform, Zig, Clojure, c, c++, c#, dart, elixir, java

See the [catalog of supported technologies](./src/rules) and the [detection benchmarks](./benchmarks/README.md).

---

The library dives into any folders, read package.json, docker-compose.yml, go.mod, etc. Determines relationship between folders and services, and output a comprehensive list of dependencies, services and the link between them. The set of rules inside this repos allows the detection of specific technology or saas used.

It is directly used by [getstack.dev](https://getstack.dev) to create an exhaustive map of all technologies used in the open-source world.
It can be helpful for other to get all dependencies or SaaS used in a given git repository.

## CLI

```bash
npx @specfy/stack-analyser <PATH> [--output=<filename>] [--flat] [--declarations=<file>] [--skip-dirs=<names>] [--ignore=<paths>]
```

```sh
npx @specfy/stack-analyser /my/folder
```

To run the rules from this checkout, build the package and invoke its CLI directly.

```sh
npm ci
npm run build
node dist/cli.js /my/project --flat --output=stack.json
```

The CLI reads Maven, Gradle, NuGet, Pub, Hex and SwiftPM manifests alongside the existing package readers.
For example, a Maven module declaring `org.springframework.boot:spring-boot-starter-web` or a Gradle module
applying the Spring Boot plugin gets the technology ID `spring-boot`. A version listed only in Maven dependency
management or a Gradle plugin declared with `apply false` does not establish module use. The scanner reads static
declarations without invoking project builds. In the JSON, `techs` contains detected technologies and an optional
`mentions` array records known service endpoints with the source file and line.

### Declarations read by other tools

Another tool may already have read packages, images or actions from the project. `--declarations <FILE>` takes
a JSON array of them, and they are recognised with the same rules as the manifests the analyser reads itself.

```sh
node dist/cli.js /my/project --declarations declarations.json
```

```json
[
  { "type": "python", "name": "requests", "version": ">=2", "path": "setup.cfg", "line": 4, "source": "python-build" },
  { "type": "npm", "name": "react", "path": "package.json", "source": "renovate" }
]
```

| Field     | Required | Meaning                                                                                      |
| --------- | -------- | -------------------------------------------------------------------------------------------- |
| `type`    | yes      | One of `deno`, `docker`, `githubAction`, `golang`, `hex`, `maven`, `npm`, `nuget`, `php`, `pub`, `python`, `ruby`, `rust`, `swiftpm`, `terraform`, `terraform.resource` |
| `name`    | yes      | The package, image repository or action, as the rules of that `type` expect it               |
| `path`    | yes      | The file that declares it, relative to the analysed folder and inside it                     |
| `source`  | yes      | Who read it. It is reported as is in the `source` of the evidence                            |
| `version` | no       | The declared version                                                                         |
| `line`    | no       | A positive line number in `path`                                                             |

The technologies and their evidence go on the root component, with the `path`, `line` and `source` of the declaration.
A name that no rule knows adds nothing. When the analyser reads the same package itself, both pieces of evidence are
kept, each with its own `source`; what the analyser reads has the source `stack-analyser`. The CLI exits with code 1,
prints the number of the entry and writes no output when the file is not a JSON array, when an entry has an unknown
`type` or a missing field, or when a `path` is absolute or leaves the analysed folder. It exits with code 1 and
writes no output too when the value of `--declarations` is empty. A UTF-8 byte order mark at the start of the file
is ignored.

### Choosing which folders are skipped

By default the analyser does not enter the folders in the list under [Filesystem provider](#filesystem-provider),
such as `tests`, `public`, `bin`, `vendor` and `migrations`, at any depth. The caller decides what is left out.

- `--skip-dirs <NAMES>` takes comma-separated folder names and uses them **instead of** the default list. A name is
  compared with the name of a folder at any depth, so write `tests`, not `src/tests`. An entry that holds a `/` or
  a `\` is a path, not a name: the CLI names it, exits with code 1 and analyses nothing. An empty value, as in
  `--skip-dirs ""`, skips no folder at all.
- `--ignore <PATHS>` takes comma-separated paths relative to the analysed folder. A path leaves out that folder or
  file and everything below it. It applies on top of `--skip-dirs` or of the default list. A leading `/` or `./` and
  a trailing `/` are dropped, so `/gen`, `./gen`, `gen/` and `gen` mean the same folder. An entry that is absolute
  with a drive letter, such as `C:/gen`, or that has a `..` in it, is not inside the analysed folder: the CLI names
  it, exits with code 1 and analyses nothing.

Spaces around an entry and empty entries are dropped.

```sh
# enter every folder, including tests and vendor
node dist/cli.js /my/project --skip-dirs ""

# skip only these two names, wherever they are
node dist/cli.js /my/project --skip-dirs "node_modules,dist"

# leave out two paths of the analysed folder
node dist/cli.js /my/project --ignore "docs/examples,packages/legacy"
```

## Programmatic Usage

```ts
npm install -E @specfy/stack-analyser
```

```ts
import { analyser, FSProvider, flatten, rules } from "@specfy/stack-analyser"

// /!\ Load default rules
// without this no rules will be enabled by default
import '@specfy/stack-analyser/dist/autoload';

// Analyze a folder
const result = await analyser({
  provider: new FSProvider({
    path: '/my/repository/path/',
  }),
});

// Output to JSON
const json = result.toJson();

// De-nest the output and deduplicate childs
const flat = flatten(result);
```

`flatten` returns a new graph and leaves `result` untouched, so it can be called more than once.

`analyser` also accepts `declarations`, the packages, images and actions that another tool already read from the
project (see [Declarations read by other tools](#declarations-read-by-other-tools)). The `Declaration` type is exported.

```ts
import { analyser, FSProvider, type Declaration } from "@specfy/stack-analyser"

const declarations: Declaration[] = [
  { type: 'npm', name: 'react', path: 'package.json', line: 12, source: 'renovate' },
];

const result = await analyser({
  provider: new FSProvider({ path: '/my/repository/path/' }),
  declarations,
});
```

The promise rejects with an error that starts with `declaration <index>` when an entry has a `type` that is not a
supported one, a missing field, or a `path` that is absolute or outside the project.

### Filesystem provider

`FSProvider` accepts three optional settings.

```ts
new FSProvider({
  path: '/my/repository/path/',
  // Names relative to `path` (a leading `/` or `./` and a trailing `/` are dropped), or regular expressions.
  // Ignoring a directory excludes everything below it.
  ignorePaths: ['generated', /^packages\/[^/]+\/dist$/],
  // Largest single file the analyser reads, in bytes. The default is 32 MiB.
  maxFileBytes: 64 * 1024 * 1024,
  // Folder names that are not entered, at any depth. It replaces the default list below;
  // `[]` skips nothing. Leave it out to keep the default list.
  skipDirs: ['node_modules', 'dist'],
});
```

The default list of skipped folders, used when `skipDirs` is not given:

- Build and dependency output: `node_modules`, `dist`, `build`, `_build`, `.build`, `.dart_tool`, `obj`, `Pods`, `bin`,
  `static`, `public`, `vendor`, `terraform.tfstate.d`, `tmp`
- Tests and generated data: `migrations`, `tests`, `e2e`, `__fixtures__`, `__snapshots__`
- Tool folders: `.artifacts`, `.assets`, `.azure`, `.azure-pipelines`, `.bundle`, `.cache`, `.changelog`,
  `.devcontainer`, `.docker`, `.dynamodb`, `.fusebox`, `.git`, `.gitlab`, `.gradle`, `.log`, `.metadata`, `.npm`,
  `.nuxt`, `.react-email`, `.release`, `.semgrep`, `.serverless`, `.svn`, `.terraform`, `.vercel`, `.vscode`,
  `.vuepress`

`.github` is not in the list, because the analyser reads GitHub Actions from it. With a custom `skipDirs`, only the
names you give are skipped, so add `.github` there if you want it left out. `FakeProvider` takes the same `skipDirs`
setting.

The provider reads only inside `path`. A path that resolves outside it, directly or through a symbolic link,
is reported as missing. A symbolic link to a file inside the repository is read as a file. A symbolic link to
a directory is not followed. A file larger than `maxFileBytes` is skipped with a warning, so raise the limit
for a repository with an unusually large lockfile.

### How evidence is assigned

- **Hosting.** A module is placed in a hosting component (`inComponent`) only when its directory contains that
  platform's deployment configuration, such as `vercel.json`. A cloud SDK in the dependencies adds the
  technology to `techs` without making it the host. When two deployment configurations match, none is chosen.
- **Shared directories.** When one directory holds a single manifest, the technologies and endpoint mentions
  found there belong to that module. When it holds several, for example `package.json` next to `Cargo.toml`,
  they stay on the parent, because nothing in the directory says which module owns them.
- **Files.** Rules match regular files and, where a rule names one, directories. A symbolic link never counts
  as evidence, and neither does a directory whose name looks like a file extension.

## GitHub Actions

```yaml
- name: Stack Analyser
  uses: specfy/stack-analyser@v__VERSION__
```

## Output

> Example of output when running the CLI against ./tests/**fixtures**

The exact types `AnalyserJson` can be found [here](./src/types/index.ts)

Every technology of a component has at least one `evidence` item: the `kind` of what was found (`package`,
`image`, `action`, `terraform`, `file`, `extension`, `env` or `source`), its `value`, the `path` where it was found
and, when the reader knows it, the `line`. The `reason` sentences are unchanged and stay next to the evidence.

<details>
  <summary>Output</summary>

```json
{
  "id": "44xNl6ZWgpp1",
  "name": "flatten",
  "path": ["/"],
  "tech": null,
  "edges": [],
  "inComponent": null,
  "techs": [],
  "languages": {},
  "dependencies": [],
  "childs": [
    {
      "id": "XAPpH2jgrRQq",
      "name": "@fake/api",
      "path": [
        "pkgs/api/package.json"
      ],
      "tech": null,
      "edges": [
        {
          "target": "0ijEqmU6TTVP",
          "read": true,
          "write": true
        }
      ],
      "inComponent": null,
      "childs": [],
      "techs": [ "datadog", "fastify", "nodejs", "prisma", "typescript" ],
      "languages": {
        "JSON": 1
      },
      "dependencies": [
        [ "npm","dd-trace","1.0.1" ],
        [ "npm", "fastify", "4.17.0" ],
        [ "npm", "prisma", "4.13.0" ],
        [ "npm", "typescript", "5.0.4" ]
      ],
      "evidence": [
        { "tech": "datadog", "kind": "package", "value": "dd-trace", "path": "/pkgs/api/package.json", "source": "stack-analyser" },
        { "tech": "fastify", "kind": "package", "value": "fastify", "path": "/pkgs/api/package.json", "source": "stack-analyser" },
        { "tech": "nodejs", "kind": "file", "value": "package.json", "path": "/pkgs/api/package.json", "source": "stack-analyser" },
        { "tech": "prisma", "kind": "package", "value": "prisma", "path": "/pkgs/api/package.json", "source": "stack-analyser" },
        { "tech": "typescript", "kind": "package", "value": "typescript", "path": "/pkgs/api/package.json", "source": "stack-analyser" }
      ]
    },
    {
      "id": "KDaUcHH5fbvW",
      "name": "@fake/app",
      "path": [
        "pkgs/app/package.json"
      ],
      "tech": null,
      "edges": [
        {
          "target": "XAPpH2jgrRQq",
          "read": true,
          "write": true
        }
      ],
      "inComponent": "MXFXwFMcCeaa",
      "childs": [],
      "techs": [ "html", "nodejs", "react", "scss", "typescript", "vercel", "vite" ],
      "languages": {
        "JSON": 1,
        "HTML": 1,
        "SCSS": 1
      },
      "dependencies": [
        [ "npm", "@fake/api", "1.0.0" ],
        [ "npm", "react", "4.17.0" ],
        [ "npm", "typescript", "5.0.4" ],
        [ "npm", "vite", "4.3.3" ]
      ],
      "evidence": [
        { "tech": "nodejs", "kind": "file", "value": "package.json", "path": "/pkgs/app/package.json", "source": "stack-analyser" },
        { "tech": "react", "kind": "package", "value": "react", "path": "/pkgs/app/package.json", "source": "stack-analyser" },
        { "tech": "scss", "kind": "extension", "value": ".scss", "path": "/pkgs/app/src", "source": "stack-analyser" },
        { "tech": "typescript", "kind": "package", "value": "typescript", "path": "/pkgs/app/package.json", "source": "stack-analyser" },
        { "tech": "vercel", "kind": "file", "value": ".vercel", "path": "/pkgs/app/.vercel", "source": "stack-analyser" },
        { "tech": "vite", "kind": "package", "value": "vite", "path": "/pkgs/app/package.json", "source": "stack-analyser" }
      ]
    },
    {
      "id": "GiMSHgVZxp0w",
      "name": "GCP",
      "path": [
        "terraform/.terraform.lock.hcl"
      ],
      "tech": "gcp",
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [],
      "languages": {},
      "dependencies": [
        [ "terraform", "registry.terraform.io/hashicorp/google", "4.61.0" ]
      ],
      "evidence": [
        { "tech": "gcp", "kind": "terraform", "value": "registry.terraform.io/hashicorp/google", "path": "/terraform/.terraform.lock.hcl", "source": "stack-analyser" }
      ]
    },
    {
      "id": "0ijEqmU6TTVP",
      "name": "datadog",
      "path": [
        "pkgs/api/package.json"
      ],
      "tech": "datadog",
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [],
      "languages": {},
      "dependencies": [],
      "evidence": [
        { "tech": "datadog", "kind": "package", "value": "dd-trace", "path": "/pkgs/api/package.json", "source": "stack-analyser" }
      ]
    },
    {
      "id": "PLIJw7dSPiYm",
      "name": "db",
      "path": [
        "docker-compose.yml"
      ],
      "tech": "postgresql",
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [],
      "languages": {},
      "dependencies": [
        [ "docker", "postgres", "14.5-alpine" ]
      ],
      "evidence": [
        { "tech": "postgresql", "kind": "image", "value": "postgres", "path": "/docker-compose.yml", "source": "stack-analyser" }
      ]
    },
    {
      "id": "qx9C1IK1eyqQ",
      "name": "fake",
      "path": [
        "package.json"
      ],
      "tech": null,
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [ "docker", "eslint", "nodejs", "prettier", "terraform", "typescript" ],
      "languages": {
        "YAML": 1,
        "JSON": 1,
        "HCL": 1
      },
      "dependencies": [
        [ "npm", "@typescript-eslint/eslint-plugin", "5.57.1" ],
        [ "npm", "@typescript-eslint/parser", "5.57.1" ],
        [ "npm", "eslint", "8.39.0" ],
        [ "npm", "prettier", "2.8.7" ],
        [ "npm", "typescript", "4.9.5" ]
      ],
      "evidence": [
        { "tech": "docker", "kind": "file", "value": "docker-compose.yml", "path": "/docker-compose.yml", "source": "stack-analyser" },
        { "tech": "eslint", "kind": "package", "value": "eslint", "path": "/package.json", "source": "stack-analyser" },
        { "tech": "nodejs", "kind": "file", "value": "package.json", "path": "/package.json", "source": "stack-analyser" },
        { "tech": "prettier", "kind": "package", "value": "prettier", "path": "/package.json", "source": "stack-analyser" },
        { "tech": "terraform", "kind": "file", "value": ".terraform.lock.hcl", "path": "/terraform/.terraform.lock.hcl", "source": "stack-analyser" },
        { "tech": "typescript", "kind": "package", "value": "typescript", "path": "/package.json", "source": "stack-analyser" }
      ]
    },
    {
      "id": "Z7w2sPVvm4uv",
      "name": "redis",
      "path": [
        "docker-compose.yml"
      ],
      "tech": "redis",
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [],
      "languages": {},
      "dependencies": [
        [ "docker", "redis", "7.0.4-alpine" ]
      ],
      "evidence": [
        { "tech": "redis", "kind": "image", "value": "redis", "path": "/docker-compose.yml", "source": "stack-analyser" }
      ]
    },
    {
      "id": "UNzMqaOoqExN",
      "name": "unknown",
      "path": [
        "docker-compose.yml"
      ],
      "tech": null,
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [],
      "languages": {},
      "dependencies": [
        [ "docker", "unknown", "7.17.5" ]
      ],
      "evidence": []
    },
    {
      "id": "MXFXwFMcCeaa",
      "name": "vercel",
      "path": [
        "pkgs/app/package.json",
        "terraform/.terraform.lock.hcl"
      ],
      "tech": "vercel",
      "edges": [],
      "inComponent": null,
      "childs": [],
      "techs": [ "vercel"],
      "languages": {},
      "dependencies": [
        [ "terraform", "registry.terraform.io/vercel/vercel", "4.61.0" ]
      ],
      "evidence": [
        { "tech": "vercel", "kind": "file", "value": ".vercel", "path": "/pkgs/app/.vercel", "source": "stack-analyser" },
        { "tech": "vercel", "kind": "terraform", "value": "registry.terraform.io/vercel/vercel", "path": "/terraform/.terraform.lock.hcl", "source": "stack-analyser" }
      ]
    }
  ]
}
```

</details>

## Contributing

Every contribution is welcome. Check our [Contributing](./CONTRIBUTING.md) guide.

## Versioning

There are 2 things versioned in this package:

- the API
- the Data extraction.

The **API is following semver**:

- Breaking changes in the API will result in a new MAJOR.
- Anything else will result in a MINOR `feat`, or a PATCH `fix`

The **Data is following semver without MAJOR**:

- Breaking changes in the Data will result in a new MINOR. A breaking change can be: removal of a tech, change in the tech category, removal of pattern for a tech, new data sources. `feat(rules)`
- Anything else will result in a PATCH `fix(rules)`
