import type { AllowedKeys, TechType } from './techs.js';
import type { MaybePromise } from './utils.js';
import type { Payload } from '../payload/index.js';
import type { BaseProvider, ProviderFile } from '../provider/base.js';

export type SupportedDeps =
  | 'deno'
  | 'docker'
  | 'githubAction'
  | 'golang'
  | 'hex'
  | 'maven'
  | 'npm'
  | 'nuget'
  | 'php'
  | 'pub'
  | 'python'
  | 'ruby'
  | 'rust'
  | 'swiftpm'
  | 'terraform.resource'
  | 'terraform';

export type RuleDependency = {
  type: SupportedDeps;
} & (
  | { name: RegExp; example: string }
  | {
      name: string;
    }
);

export type Rule = {
  tech: AllowedKeys;
  name: string;
  type: TechType;
  /** Exact HTTP(S) endpoint hostnames; a reference alone does not establish a dependency. */
  hosts?: string[];
  /** Matching one of this rule's files identifies a deployment target for the owning module. */
  deploymentConfig?: boolean;
  /** Variable names. A trailing underscore declares a namespace. */
  dotenv?: string[];
  dependencies?: RuleDependency[];
  detect?: ComponentMatcher | ComponentMatcher[];
  extensions?: string[];
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
} & (never | RuleFiles);

export type RuleFiles =
  | {
      files: RegExp;
      example: string;
    }
  | {
      /** Literal filenames or directory names with a trailing slash. */
      files: string[];
    }
  | {
      files?: never;
    }
  | {
      matchFullPath: boolean;
      files: RegExp;
      example: string;
    };

export type RuleWithFile = Pick<Rule, 'tech'> & RuleFiles;
export type RuleWithDotEnv = { dotenv: string[] } & Pick<Rule, 'tech'>;

export type ComponentMatcher = (
  files: ProviderFile[],
  provider: BaseProvider
) => MaybePromise<false | Payload | Payload[]>;

export type TechMatcher = (files: ProviderFile[], basePath?: string) => [Rule, string] | false;
export type ExtensionMatcher = (list: Set<string>) => [Rule, string] | false;
export type DotEnvMatcher = (variables: readonly string[]) => [Rule, string] | false;
