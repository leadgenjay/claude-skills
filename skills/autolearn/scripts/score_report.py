#!/usr/bin/env python3
"""
Score Report — Reads loop-log.json and prints a summary of the auto-improvement run.

Usage:
    python3 score_report.py <workspace-path>

Example:
    python3 score_report.py .claude/skills/kinetic-text-ad-workspace/
"""

import json
import sys
from pathlib import Path


def load_log(workspace_path: str) -> dict:
    log_path = Path(workspace_path) / "loop-log.json"
    if not log_path.exists():
        print(f"Error: No loop-log.json found at {log_path}")
        sys.exit(1)
    with open(log_path) as f:
        return json.load(f)


def print_header(log: dict):
    print(f"\n{'='*60}")
    print(f"  Auto-Skill-Improver Report: {log['skill_name']}")
    print(f"  Domain: {log['domain']}")
    print(f"{'='*60}\n")


def print_scores(log: dict):
    baseline = log.get("baseline_score", 0)
    initial = log.get("initial_score", 0)
    final = log.get("final_score", 0)

    print(f"  Baseline (no skill):  {baseline:.0%}")
    print(f"  Initial (with skill): {initial:.0%}")
    print(f"  Final:                {final:.0%}")

    improvement = final - initial
    if improvement > 0:
        print(f"  Improvement:          +{improvement:.0%}")
    elif improvement == 0:
        print(f"  Improvement:          (no change)")
    else:
        print(f"  Improvement:          {improvement:.0%}")
    print()


def print_iteration_stats(log: dict):
    iterations = log.get("iterations", [])
    total = log.get("total_iterations", len(iterations))
    commits = log.get("total_commits", sum(1 for i in iterations if i.get("action") == "committed"))
    reverts = log.get("total_reverts", sum(1 for i in iterations if i.get("action") == "reverted"))

    print(f"  Iterations: {total}")
    print(f"  Committed:  {commits}")
    print(f"  Reverted:   {reverts}")
    print(f"  Stop reason: {log.get('stop_reason', 'unknown')}")
    print()


def print_progression(log: dict):
    iterations = log.get("iterations", [])
    if not iterations:
        print("  No iterations recorded.\n")
        return

    print("  Score Progression:")
    print(f"  {'Iter':<6} {'Score':<8} {'Action':<10} {'Mutation'}")
    print(f"  {'-'*6} {'-'*8} {'-'*10} {'-'*30}")

    for it in iterations:
        n = it.get("iteration", "?")
        score = it.get("score_after", 0)
        action = it.get("action", "?")
        summary = it.get("mutation_summary", "")[:40]
        marker = "+" if action == "committed" else "x"
        print(f"  {n:<6} {score:<8.0%} {marker} {action:<9} {summary}")
    print()


def print_chart(log: dict):
    iterations = log.get("iterations", [])
    if not iterations:
        return

    print("  Score Chart:")
    bar_width = 40

    initial = log.get("initial_score", 0)
    print(f"  [start] {'#' * int(initial * bar_width):<{bar_width}} {initial:.0%}")

    for it in iterations:
        n = it.get("iteration", "?")
        score = it.get("score_after", 0)
        action = it.get("action", "?")
        marker = "+" if action == "committed" else "x"
        bar = "#" * int(score * bar_width)
        print(f"  [{n:>5}] {bar:<{bar_width}} {score:.0%} {marker}")
    print()


def print_remaining_failures(log: dict):
    iterations = log.get("iterations", [])
    if not iterations:
        return

    last = iterations[-1]
    new_failures = last.get("new_failures", [])
    if not new_failures:
        # Check if there are any unfixed failures from earlier iterations
        all_fixed = set()
        for it in iterations:
            all_fixed.update(it.get("failures_fixed", []))

        if log.get("final_score", 0) < 1.0:
            print("  Remaining failures: (check latest grading.json for details)")
        else:
            print("  All assertions passing.")
    else:
        print("  Remaining Failures:")
        for f in new_failures:
            print(f"  - {f}")
    print()


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 score_report.py <workspace-path>")
        print("Example: python3 score_report.py .claude/skills/kinetic-text-ad-workspace/")
        sys.exit(1)

    log = load_log(sys.argv[1])
    print_header(log)
    print_scores(log)
    print_iteration_stats(log)
    print_progression(log)
    print_chart(log)
    print_remaining_failures(log)


if __name__ == "__main__":
    main()
