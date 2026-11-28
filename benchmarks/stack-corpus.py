#!/usr/bin/env python3
"""Daodan's `stack` step on the project-model corpus, for two or more built packages of the fork.

    python3 benchmarks/stack-corpus.py fetch CORPUS TREES
        The checkout of every fixture with a `source.json`, at its pinned commit, depth 1, into TREES/<fixture>. No
        hook, no LFS object, nothing of the project runs.
    python3 benchmarks/stack-corpus.py compare CORPUS TREES PACKAGE_DIR[,PACKAGE_DIR...] REPORT.json
        Each package's `dist/cli.mjs` on each fixture of Daodan's record (`results/daodan_stack.json`), scored as Daodan
        scores `frameworks_by_name`.

CORPUS is Daodan's `benchmarks/project-model`. The step is approximated: the snapshot leaves out what Linguist's path
expressions of Daodan's catalogue call vendored or documentation (not what a `.gitattributes` says), and the perimeter is
then Daodan's (`stack_recognition.perimeter`). Evidence counts only on a file of the snapshot and never of kind
`extension`, an id whose only evidence is a variable is a mention, the registry gives each id its name and category (an
id it lacks keeps the id as its name and is a framework), and Daodan's own `score.score` and `score._bare` count the
names. Host mentions and the pre-map add nothing to a framework and are left out.
"""
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path, PurePosixPath


def fetch(corpus, trees):
    failed = []
    for source in sorted((corpus / "fixtures").glob("*/source.json")):
        pin = json.loads(source.read_text())
        dest = trees / source.parent.name
        if (dest / ".fetched").exists():
            continue
        dest.mkdir(parents=True, exist_ok=True)
        env = {**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"}
        git = ["git", "-c", "core.hooksPath=/dev/null", "-c", "advice.detachedHead=false", "-C", str(dest)]
        subprocess.run(["git", "init", "-q", str(dest)], check=True)
        subprocess.run(git + ["remote", "add", "origin", pin["repo"]], check=False, capture_output=True)
        # A busy remote or proxy fails one fetch now and then: try again, then leave the fixture out and go on.
        for attempt in range(1, 4):
            fetched = subprocess.run(git + ["fetch", "-q", "--depth", "1", "origin", pin["commit"]], env=env).returncode == 0
            if fetched:
                break
            time.sleep(5 * attempt)
        if not fetched or subprocess.run(git + ["checkout", "-q", "FETCH_HEAD"], env=env).returncode != 0:
            failed.append(source.parent.name)
            print("failed", source.parent.name, flush=True)
            continue
        (dest / ".fetched").touch()
        print("fetched", source.parent.name, flush=True)
    if failed:
        raise SystemExit(f"not fetched: {', '.join(failed)}")


def category(entry):
    return entry.get("category") or ("service" if entry.get("kind") == "service" else "framework")


def inventory(root, local):
    files = []
    for folder, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d != ".git" and not os.path.islink(os.path.join(folder, d)))
        rel_folder = os.path.relpath(folder, root)
        for name in names:
            rel = name if rel_folder == "." else PurePosixPath(rel_folder, name).as_posix()
            if os.path.islink(os.path.join(folder, name)) or (local and rel in ("expected.json", "source.json")):
                continue
            files.append(rel)
    return files


def perimeter(root, files, excluded):
    """Daodan's `stack_recognition.perimeter`, without the names the tool refuses and the secret names."""
    live = {"."} | {parent.as_posix() for rel in files for parent in PurePosixPath(rel).parents}
    names = {PurePosixPath(folder).name for folder in live}
    skip, ignore, pending = set(), set(excluded), ["."]
    while pending:
        folder = pending.pop()
        try:
            listing = list(os.scandir(root / folder))
        except OSError:
            continue
        for item in listing:
            rel = (PurePosixPath(folder) / item.name).as_posix()
            if item.is_symlink():
                ignore.add(rel)
            elif not item.is_dir(follow_symlinks=False):
                continue
            elif rel in live:
                pending.append(rel)
            elif item.name in names:
                ignore.add(rel)
            else:
                skip.add(item.name)
    return sorted(skip), sorted(ignore)


def run(package, root, skip, ignore):
    with tempfile.TemporaryDirectory() as tmp:
        perim, out = Path(tmp, "perimeter.json"), Path(tmp, "out.json")
        perim.write_text(json.dumps({"skipDirs": skip, "ignore": ignore}))
        done = subprocess.run(["node", str(Path(package, "dist/cli.mjs")), str(root), "--output", str(out),
                               "--perimeter", str(perim)], cwd=tmp, capture_output=True, text=True, timeout=900)
        if done.returncode != 0 or not out.exists():
            raise RuntimeError(f"{package} on {root}: exit {done.returncode}: {done.stderr[-500:]}")
        return json.loads(out.read_text())


def technologies(payload, snapshot):
    """Each id with the kinds of its evidence on files of the snapshot."""
    kinds, pending = {}, [payload]
    while pending:
        component = pending.pop()
        pending.extend(component.get("childs") or [])
        for item in component.get("evidence") or []:
            tech, kind = item.get("tech"), item.get("kind")
            where = (item.get("path") or "").removeprefix("/")
            if tech and kind != "extension" and where in snapshot:
                kinds.setdefault(tech, set()).add(kind)
    return kinds


def compare(corpus, trees, packages, output):
    daodan = corpus.parents[1]
    sys.path.insert(0, str(corpus))
    import score  # Daodan's scorer, from the corpus

    catalog = json.loads((daodan / "daodan/data/linguist-catalog.json").read_text())
    excluded_by = [re.compile(p) for p in catalog["vendor"] + catalog["documentation"]]
    registry = {e["id"]: e for e in json.loads((daodan / "daodan/data/service-registry.json").read_text())["entries"]}
    record = json.loads((corpus / "results/daodan_stack.json").read_text())["fixtures"]

    def evaluate(fixture):
        local = not (corpus / "fixtures" / fixture / "source.json").exists()
        root = corpus / "fixtures" / fixture if local else trees / fixture
        files = inventory(root, local)
        excluded = [rel for rel in files if any(p.search(rel) for p in excluded_by)]
        kept = sorted(set(files) - set(excluded))
        skip, ignore = perimeter(root, kept, excluded)
        if local:
            ignore = sorted(set(ignore) | ({"expected.json", "source.json"} & set(os.listdir(root))))
        expected = json.loads((corpus / "fixtures" / fixture / "expected.json").read_text())
        result = {}
        for package in packages:
            kinds = technologies(run(package, root, skip, ignore), set(kept))
            declared = sorted(tech for tech, found in kinds.items() if found != {"env"})
            names = [{"name": registry.get(tech, {}).get("name") or tech} for tech in declared
                     if category(registry.get(tech, {"id": tech, "name": tech})) != "service"]
            named = score.score({"frameworks": score._bare(expected.get("frameworks"))},
                                {"frameworks": score._bare(names)})["frameworks"]
            result[package] = {"ids": declared, "expected": named["expected"], "found": named["found"],
                               "missed": named["missed"]}
        return fixture, result

    fixtures = sorted(name for name, item in record.items()
                      if (item.get("score") or {}).get("frameworks_by_name", {}).get("given"))
    report = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for fixture, result in pool.map(evaluate, fixtures):
            report[fixture] = result
    totals = {package: {"expected": sum(r[package]["expected"] for r in report.values()),
                        "found": sum(r[package]["found"] for r in report.values())} for package in packages}
    output.write_text(json.dumps({"packages": packages, "totals": totals, "fixtures": report}, indent=1) + "\n")
    print(json.dumps(totals, indent=1))


if __name__ == "__main__":
    command, args = sys.argv[1], sys.argv[2:]
    if command == "fetch":
        fetch(Path(args[0]), Path(args[1]))
    elif command == "compare":
        compare(Path(args[0]), Path(args[1]), args[2].split(","), Path(args[3]))
    else:
        raise SystemExit("Expected fetch CORPUS TREES or compare CORPUS TREES PACKAGE_DIR[,PACKAGE_DIR...] REPORT.json")
