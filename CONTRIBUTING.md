# Contributing

## Installation

```sh
git clone https://github.com/acaprino/stack-analyser-daodan.git
```

```sh
npm install
```

```sh
npm run build:watch
```

- Run the main index.js (do nothing except validate the compilation)

```sh
npm run dev
```

- Run the CLI

```sh
npm run cli
```

- Run the Test

```sh
npm run test
```

## Add a rule

- Go to folder `src/rules/`
- Pick the appropriate folder
- Create your file
- Add your rule name in `src/types/tech.ts`
- Add this file to the relative `index.ts`
- Run tests `npm run tests`
- Update the snapshots
- Commit
- Create PR named `fix(rules): add __Tech__`

### Category guidelines

- There are 13 categories (see [type](./src/types/techs.ts)). Most technology can fit more than one so pick the most appropriate or less surprising.

#### Hosting

- There is no difference between cloud and hosting.
- A compute platform is considered as hosting because technically it only hosts a container image (e.g: aws ec2, gcp gce, etc.)

#### SaaS

- SaaS can be any internet company that do not provide hosting

#### Lang folder

- Some language have their own folder (e.g: JS, PHP), it's for specific tech that only exists in those languages. For example, `phpunit` for PHP, or `Jest` for JS

### Guidelines on Rules

Provide as much dependencies as possible when creating the rule.

- Docker: <https://hub.docker.com/search?q=>
- GitHub Actions: <https://github.com/marketplace?category=&query=&type=actions&verification=>
- GO: <https://pkg.go.dev/>
- JS: <https://yarnpkg.com/search?q=>
- PHP: <https://packagist.org/>
- Python <https://pypi.org/>
- Ruby: <https://rubygems.org/>
- Rust: <https://crates.io/>
- Terraform: <https://registry.terraform.io/>

#### Fields that match evidence

- `dependencies`: a string name matches the whole package name. For `githubAction`, the `owner/repo` part
  ignores case and any path after it is case-sensitive, as on GitHub. An empty name is rejected when the
  rule is loaded.
- `files`: a list of literal names, or one regular expression. End a name with `/` to match a directory,
  e.g. `.circleci/`. With `matchFullPath`, the name is compared with the path relative to the analysed root.
  A regular expression only ever matches regular files.
- `dotenv`: variable names, compared exactly. End a name with `_` to match every variable in that
  namespace, e.g. `ANTHROPIC_` matches `ANTHROPIC_API_KEY`.
- `hosts`: exact HTTP(S) hostnames. A match is reported under `mentions` and does not add the technology.
- `deploymentConfig: true`: the rule's `files` are a deployment configuration. Only such a rule can place a
  module inside a hosting component. Set it on a platform whose file commits the project to deploying
  there, e.g. `vercel.json` or `fly.toml`.

#### Naming

A rule name should be:

- Lowercase
- Do not have a dot `.` unless it's part of an hosting platform, e.g: `aws.lambda`
- If it's part of an ecosystem use an underscore `_`, e.g: `apache_airflow`
- If it's a common word, not broadly used across many languages or could be confused, suffix the name with the lang, e.g `doctrinephp`
- If there is an open-source package and a cloud offering, it's alright if it's not possible to distinguish those. If it's possible, create a different rule.

## Add a new language / lockfile parser?

Easiest is to follow what others spec are doing; here is the generic todo list.

- Go to folder `src/rules/spec/`
- Create your folder with the appropriate name
- Add the default rule
- Add your rule name in `src/types/tech.ts`
- Add this import in `src/rules/spec/index.ts`
- If you are parsing the lockfile (e.g: `package-lock.json`, `go.mod`)
  - Create a `lockfile.ts` with a function `detect__LANG__Lockfile()`
- If you are parsing the lockfile/declaration and you will create components (e.g: `package.json`, `docker-compose.yml`)
  - Create a `component.ts` with a function `detect__LANG__Component()`
- Add some tests
- Commit
- Create PR named `feat(rules): add support for __Tech__`

## FAQ?

### Should I create a Rule that has no way to be matched?

Yes, if the Technology is broadly known, even if they do not have dependencies or recognizable files.
