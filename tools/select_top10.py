#!/usr/bin/env python3
"""Select top 10 issues from backlog/issues.yaml based on priority/impact/estimate."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    import yaml  # type: ignore
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Missing dependency: install PyYAML (pip install pyyaml)") from exc

DEFAULT_PRIORITY = "P3"
DEFAULT_IMPACT = "Low"
DEFAULT_ESTIMATE = "M"

PRIORITY_ORDER = {"P1": 3, "P2": 2, "P3": 1}
IMPACT_ORDER = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
ESTIMATE_ORDER = {"XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5}


def _normalise_priority(issue: Dict[str, Any]) -> str:
    priority = issue.get("priority")
    if isinstance(priority, str):
        return priority.upper()

    for label in issue.get("labels", []) or []:
        if not isinstance(label, str):
            continue
        lower = label.lower()
        if lower.startswith("priority:"):
            return label.split(":", 1)[1].upper()

    return DEFAULT_PRIORITY


def _normalise_impact(issue: Dict[str, Any]) -> str:
    impact = issue.get("impact")
    if isinstance(impact, str):
        return impact.upper()
    for label in issue.get("labels", []) or []:
        if not isinstance(label, str):
            continue
        lower = label.lower()
        if lower.startswith("impact:"):
            return label.split(":", 1)[1].upper()
    return DEFAULT_IMPACT.upper()


def _normalise_estimate(issue: Dict[str, Any]) -> str:
    estimate = issue.get("estimate")
    if isinstance(estimate, str):
        return estimate.upper()
    return DEFAULT_ESTIMATE


def _sort_key(issue: Dict[str, Any], index: int) -> Tuple[int, int, int, int]:
    priority = _normalise_priority(issue)
    impact = _normalise_impact(issue)
    estimate = _normalise_estimate(issue)

    priority_score = PRIORITY_ORDER.get(priority, PRIORITY_ORDER[DEFAULT_PRIORITY])
    impact_score = IMPACT_ORDER.get(impact, IMPACT_ORDER[DEFAULT_IMPACT.upper()])
    estimate_score = ESTIMATE_ORDER.get(estimate, ESTIMATE_ORDER[DEFAULT_ESTIMATE])

    return (-priority_score, -impact_score, estimate_score, index)


def select_top_issues(source: Path, target: Path, limit: int = 10) -> None:
    data = yaml.safe_load(source.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "issues" not in data:
        raise SystemExit("Input YAML must contain a top-level 'issues' sequence")

    issues = data.get("issues")
    if not isinstance(issues, list):
        raise SystemExit("'issues' must be a list")

    enumerated = list(enumerate(issues))
    sorted_issues = [issue for _, issue in sorted(
        enumerated, key=lambda item: _sort_key(item[1], item[0])
    )]

    limited = sorted_issues[:limit]
    result = {"issues": limited}
    target.write_text(
        yaml.safe_dump(result, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )


def main(argv: List[str]) -> int:
    if len(argv) != 3:
        print("Usage: python tools/select_top10.py <input_yaml> <output_yaml>", file=sys.stderr)
        return 1

    source = Path(argv[1])
    target = Path(argv[2])

    if not source.exists():
        print(f"Input file not found: {source}", file=sys.stderr)
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)

    select_top_issues(source, target)
    print(f"Top issues written to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
