import type { AllowedLicenses } from './licenses.js';
import type { SupportedDeps } from './rule.js';
import type { AllowedKeys } from './techs.js';
import type { Modify } from './utils.js';
import type { Payload } from '../payload/index.js';

export interface GraphEdge {
  target: Payload;
  read: boolean;
  write: boolean;
}

export type Dependency = [SupportedDeps, string, string];

export interface HostMention {
  tech: AllowedKeys;
  host: string;
  /** Path relative to the analysed project. */
  path: string;
  line: number;
}

export type EvidenceKind =
  | 'action'
  | 'env'
  | 'extension'
  | 'file'
  | 'image'
  | 'package'
  | 'source'
  | 'terraform';

export interface Evidence {
  tech: AllowedKeys;
  kind: EvidenceKind;
  /** The package, image, action, resource, file, extension, variable or symbol that was found. */
  value: string;
  /** Absolute during the analysis; `toJson(root)` renders it relative to the analysed root. */
  path: string;
  line?: number;
  /** Who read it: `stack-analyser`, or the source of an incoming declaration. */
  source: string;
}

/** Evidence as a reader reports it: `tech` comes from the receiver, a missing `source` means `stack-analyser`. */
export type EvidenceItem = { source?: string } & Omit<Evidence, 'source' | 'tech'>;

/** A package, image or action that another tool has already read from the project. */
export interface Declaration {
  type: SupportedDeps;
  name: string;
  version?: string;
  /** Relative to the analysed root, with `/`. */
  path: string;
  line?: number;
  /** Who read it: reported as is in the evidence. */
  source: string;
}

export interface Analyser {
  /** Service endpoints referred to in source or configuration, with their evidence. */
  mentions?: HostMention[];
  /**
   * Structured proof of why each technology was recognised, next to the `reason` sentences.
   */
  evidence: Evidence[];
  /**
   * Unique random id for this payload
   */
  id: string;

  /**
   * Best-effort name of this payload
   */
  name: string;

  /**
   * Where this payload was found.
   * When flatten() it will contain all path that were deduplicated
   */
  path: Set<string>;

  /**
   * If this payload is a specific Technology.
   * e.g: if it's a Postgresql database, the tech will be: "postgresql"
   */
  tech: AllowedKeys | null;

  /**
   * List matched tech from the rules.
   * Computed with the dependencies and languages.
   */
  techs: Set<AllowedKeys>;

  /**
   * If this payload is hosted by another payload.
   * e.g: we found a vercel dependency at the same level, this payload will be considered in the component Vercel.
   */
  inComponent: null | Payload;

  /**
   * List all childs of this payload
   */
  childs: Payload[];

  /**
   * List all languages found in this folder.
   * This list is computed using file extensions.
   */
  languages: Record<string, number>;

  /**
   * List all languages found in this folder.
   * This list is computed using file extensions.
   */
  licenses: Set<AllowedLicenses>;

  /**
   * List all relationship from this Payload to another one.
   * e.g:
   * this is a package.json and we found a Postgresql at the same level,
   * we will add an edge from this payload to the Postgresql's one.
   */
  edges: GraphEdge[];

  /**
   * List all dependencies wether or not they matched a rule.
   */
  dependencies: Dependency[];
}

export type AnalyserJson = Modify<
  Analyser,
  {
    childs: AnalyserJson[];
    path: string[];
    techs: AllowedKeys[];
    licenses: AllowedLicenses[];
    inComponent: null | string;
    edges: Modify<GraphEdge, { target: string }>[];
    reason: string[];
  }
>;
