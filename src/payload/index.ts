import path from 'node:path';

import { cleanPath } from '../common/helpers.js';
import { detectLang } from '../common/languages.js';
import { nid } from '../common/nid.js';
import { rulesComponents } from '../loader.js';
import { matchAllFilesWithEvidence } from '../matchAllFiles.js';
import { evidenceKind, matchDependenciesWithNames } from '../matchDependencies.js';
import { findHostMentions } from '../rules/spec/hosts/index.js';
import { IGNORED_DIVE_PATHS } from '../provider/base.js';
import { listIndexed } from '../register.js';
import { compareEvidence, evidenceKey, findHosting, findImplicitComponent, mentionKey, toEvidence } from './helpers.js';
import { detectInDotEnv } from '../rules/spec/dotenv/index.js';

import type { BaseProvider } from '../provider/base.js';
import type { Analyser, AnalyserJson, Dependency, Evidence, EvidenceItem, HostMention } from '../types/index.js';
import type { SupportedDeps } from '../types/rule.js';
import type { AllowedLicenses } from '../types/licenses.js';
import type { AllowedKeys } from '../types/techs.js';
import type { TechMatch } from '../matchAllFiles.js';

export class Payload implements Analyser {
  public id;
  public name;
  public path;
  public tech;
  public languages: Analyser['languages'];
  public licenses: Analyser['licenses'];
  public childs: Analyser['childs'];
  public techs: Analyser['techs'];
  public inComponent: Analyser['inComponent'];
  public dependencies: Analyser['dependencies'];
  public edges: Analyser['edges'];
  public parent?: null | Payload;
  public reason: Set<string>;
  public evidence: Analyser['evidence'] = [];
  /** The key of every item in `evidence`: it is kept with the array, so that a merge does not have to build it again. */
  #evidenceKeys = new Set<string>();
  public mentions: HostMention[] = [];

  constructor({
    id,
    name,
    folderPath,
    parent,
    tech,
    dependencies,
    reason,
    evidence,
  }: {
    id?: Analyser['id'];
    name: Analyser['name'];
    folderPath: Set<string> | string;
    parent?: null | Payload;
    tech?: Analyser['tech'];
    dependencies?: Analyser['dependencies'];
    reason?: string | string[];
    /** Evidence for `tech`: it is only kept when this Payload has a tech. */
    evidence?: EvidenceItem[];
  }) {
    this.id = id || nid();
    this.name = name;
    this.path = new Set(typeof folderPath === 'string' ? [folderPath] : folderPath);
    this.tech = tech || null;
    this.inComponent = null;
    this.childs = [];
    this.techs = new Set();
    this.languages = {};
    this.licenses = new Set();
    this.dependencies = dependencies || [];
    this.reason = Array.isArray(reason)
      ? new Set(reason)
      : new Set(typeof reason === 'string' ? [reason] : []);

    this.parent = parent;
    this.edges = [];
    if (this.tech && evidence) {
      this.addEvidence(this.tech, evidence);
    }
  }

  /**
   * Analyze a folder recursively.
   * It will modify the current Payload.
   */
  async recurse(provider: BaseProvider, filePath: string): Promise<void> {
    const files = await provider.listDir(filePath);

    const modules = new Set<Payload>();
    for (const rule of rulesComponents) {
      const res = await rule(files, provider);
      if (res === false) {
        continue;
      }

      const resArray = Array.isArray(res) ? res : [res];
      for (const pl of resArray) {
        if (pl.name === 'virtual') {
          for (const child of pl.childs) {
            this.addChild(child);
          }
          this.combine(pl);
        } else {
          modules.add(this.addChild(pl));
        }
      }
    }

    // When several manifests share a directory, a generic source or endpoint cannot be
    // assigned to one of them by detector registration order. Keep the evidence at their parent.
    const ctx = modules.size === 1 ? modules.values().next().value! : this;
    const dotenv = await detectInDotEnv(files, provider);
    if (dotenv !== false) {
      for (const child of dotenv.childs) {
        this.addChild(child);
      }
      this.combine(dotenv);
    }

    // Detect Tech
    const matched = matchAllFilesWithEvidence(files, provider.basePath, filePath);
    ctx.addTechs(matched);
    if (modules.size === 1 || (!modules.size && filePath === provider.basePath)) findHosting(ctx, matched);
    ctx.mentions.push(...(await findHostMentions(files, provider)));

    // Recursively dive in folders
    const skipDirs = provider.skipDirs ?? IGNORED_DIVE_PATHS;
    for (const file of files) {
      if (file.type === 'file') {
        ctx.detectLang(file.name);
        continue;
      }
      if (skipDirs.includes(file.name)) {
        continue;
      }

      const fp = path.join(filePath, file.name);

      await ctx.recurse(provider, fp);
    }
  }

  /**
   * Register a child to this Payload.
   * If a similar child is found at the same level, it will merge them.
   */
  addChild(service: Payload): Payload {
    const exist = service.tech ? this.childs.find((child) => child.tech === service.tech) : undefined;

    if (service.tech?.includes('.')) {
      const [host] = service.tech.split('.');
      const tech = listIndexed[host as AllowedKeys];
      if (tech?.type === 'hosting' || tech?.type === 'cloud') {
        const pl = new Payload({
          name: tech.name,
          folderPath: service.path,
          tech: tech.tech,
          reason: `implicit: ${service.tech}`,
          evidence: service.evidence,
        });
        const child = this.addChild(pl);
        service.inComponent = child;
      }
    }

    if (exist) {
      // Log all paths were it was found
      for (const p of service.path) {
        exist.path.add(p);
      }

      // Update edges to point to the initial component
      if (service.parent) {
        for (const edge of service.parent.edges) {
          if (edge.target.id !== service.id) {
            continue;
          }

          edge.target = exist;
        }
      }

      // Merge dependencies
      exist.combineDependencies(service);
      for (const reason of service.reason) exist.reason.add(reason);
      exist.mergeEvidence(service.evidence);

      return exist;
    }

    service.setParent(this);
    this.childs.push(service);
    return service;
  }

  /**
   * Register a tech.
   */
  addTechs(tech: Map<AllowedKeys, string[] | TechMatch>): void {
    for (const [key, match] of tech.entries()) {
      if (Array.isArray(match)) {
        this.addTech(key, match);
      } else {
        this.addTech(key, match.reason, match.evidence);
      }
    }
  }

  /**
   * Register the techs that declared packages, images, actions or Terraform resources point to.
   * Every name that matched is recorded as evidence, with the file that declares it.
   * `origin` is for names another tool already read: its `line` and `source` go in the evidence.
   */
  addDependencyTechs(
    names: string[],
    type: SupportedDeps,
    file: string,
    origin: { line?: number; source?: string } = {}
  ): void {
    const kind = evidenceKind(type);
    const { reasons, names: matched } = matchDependenciesWithNames(names, type);
    for (const [tech, reason] of reasons) {
      this.addTech(
        tech,
        reason,
        (matched.get(tech) ?? []).map((value) => ({ kind, value, path: file, line: origin.line, source: origin.source }))
      );
    }
  }

  /**
   * Declare this Payload has built with this tech.
   */
  addTech(tech: AllowedKeys, reason: string[], evidence?: EvidenceItem[]): void {
    this.techs.add(tech);
    for (const r of reason) {
      this.reason.add(r);
    }
    if (evidence) {
      this.addEvidence(tech, evidence);
    }

    findImplicitComponent({ pl: this, tech, reason, evidence });
  }

  /**
   * Register the evidence found for a tech, without duplicates.
   */
  addEvidence(tech: AllowedKeys, items: EvidenceItem[]): void {
    this.mergeEvidence(items.map((item) => toEvidence(tech, item)));
  }

  /**
   * Add evidence that already has its tech and source, skipping the ones this Payload already has.
   */
  private mergeEvidence(items: Evidence[]): void {
    for (const item of items) {
      const key = evidenceKey(item);
      if (this.#evidenceKeys.has(key)) continue;
      this.#evidenceKeys.add(key);
      this.evidence.push({ ...item });
    }
  }

  /**
   * Register a relationship between this Payload and an other one.
   */
  addEdges(pl: Payload): void {
    if (pl === this || this.edges.some((edge) => edge.target.id === pl.id)) return;
    this.edges.push({
      target: pl,
      read: true,
      write: true,
    });
  }

  /**
   * Helper to add a lang entry to languages.
   */
  public addLang(name: string, count = 1): void {
    if (!this.languages[name]) {
      this.languages[name] = 0;
    }

    this.languages[name] += count;
  }

  /**
   * Register a parent of this Payload
   */
  setParent(pl: null | Payload): void {
    this.parent = pl;
  }

  /**
   * Detect language of a file at this level.
   */
  detectLang(filename: string): void {
    const lang = detectLang(filename);
    if (lang) {
      this.addLang(lang.group || lang.name);
    }
  }

  /**
   * Helper to add a licence entry
   */
  public addLicenses(names: Set<AllowedLicenses>): void {
    for (const name of names) {
      this.licenses.add(name);
    }
  }

  combineDependencies(pl: Payload): void {
    // Merge dependencies
    const dedup = new Map<string, Dependency>();
    for (const dep of this.dependencies) dedup.set(JSON.stringify(dep), dep);
    for (const dep of pl.dependencies) dedup.set(JSON.stringify(dep), dep);
    this.dependencies = [...dedup.values()];
  }

  /**
   * Merge this Payload and an other one.
   * There is no failsafe, it will merge whatever is passed even if they are not the same kind.
   * It's mostly used to flatten folders.
   */
  combine(pl: Payload): void {
    for (const reason of pl.reason) this.reason.add(reason);
    this.mergeEvidence(pl.evidence);
    // Equal by value, not by reference: the same mention can reach a payload as two objects.
    const seen = new Set(this.mentions.map((mention) => mentionKey(mention)));
    for (const mention of pl.mentions) {
      const key = mentionKey(mention);
      if (seen.has(key)) continue;
      seen.add(key);
      this.mentions.push({ ...mention });
    }
    // Log all paths were it was found
    this.path = new Set([...this.path, ...pl.path]);

    // Merge dependencies
    this.combineDependencies(pl);

    for (const [lang, count] of Object.entries(pl.languages)) {
      this.addLang(lang, count);
    }

    for (const tech of pl.techs) {
      this.techs.add(tech);
    }
    if (pl.tech) {
      this.techs.add(pl.tech);
    }
    for (const licence of pl.licenses) {
      this.licenses.add(licence);
    }
  }

  /**
   * Create a copy of this Payload.
   * It's a deep copy, meaning the childs, parent and other stuff will still point to the original references.
   */
  copy(): Payload {
    const cp = new Payload({
      id: this.id,
      name: this.name,
      folderPath: this.path,
      parent: this.parent,
      tech: this.tech,
      dependencies: this.dependencies,
    });
    cp.techs = new Set(this.techs);
    cp.reason = new Set(this.reason);
    cp.evidence = this.evidence.map((item) => ({ ...item }));
    cp.#evidenceKeys = new Set(this.#evidenceKeys);
    cp.inComponent = this.inComponent;
    cp.edges = this.edges.map((edge) => ({ ...edge }));
    cp.mentions = [...this.mentions];
    cp.path = new Set(this.path);
    cp.languages = { ...this.languages };
    cp.licenses = new Set(this.licenses);
    cp.childs = this.childs;

    return cp;
  }

  /**
   *
   */
  /**
   * Output a deep copy in JSON, free of reference.
   *
   * @param root Absolute path to remove from output
   */
  toJson(root = ''): AnalyserJson {
    return {
      id: this.id,
      name: this.name,
      path: cleanPath([...this.path], root),
      tech: this.tech,
      edges: this.edges.map((edge) => {
        return { ...edge, target: edge.target.id };
      }),
      inComponent: this.inComponent ? this.inComponent.id : null,
      childs: this.childs
        .map((service) => {
          return service.toJson(root);
        })
        .sort((a, b) => {
          return a.name > b.name ? 1 : -1;
        }),
      techs: [...this.techs].sort(),
      languages: this.languages,
      licenses: [...this.licenses.values()],
      dependencies: this.dependencies,
      reason: [...this.reason.values()],
      evidence: this.evidence
        .map((item) => ({
          tech: item.tech,
          kind: item.kind,
          value: item.value,
          // The analysed root itself is written `/`
          path: cleanPath([item.path], root)[0] || '/',
          ...(item.line !== undefined && { line: item.line }),
          source: item.source,
        }))
        .sort(compareEvidence),
      ...(this.mentions.length > 0 && { mentions: this.mentions.map((mention) => ({ ...mention })) }),
    };
  }
}
