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
npx @specfy/stack-analyser <PATH> [--output=<filename>]
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

### Filesystem provider

`FSProvider` accepts two optional settings.

```ts
new FSProvider({
  path: '/my/repository/path/',
  // Names relative to `path`, or regular expressions. Ignoring a directory excludes everything below it.
  ignorePaths: ['generated', /^packages\/[^/]+\/dist$/],
  // Largest single file the analyser reads, in bytes. The default is 32 MiB.
  maxFileBytes: 64 * 1024 * 1024,
});
```

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
      "dependencies": []
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
      ]
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
