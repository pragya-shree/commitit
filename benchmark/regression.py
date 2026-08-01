"""
CommitIt AI Benchmark & Evaluation Suite - Regression Detection Engine.

Compares benchmark results across versions (Version A -> Version B) to detect:
- Improved answers
- Worse answers (regressions)
- New hallucinations
- Missing evidence
- Better reasoning

Generates structured markdown report: `benchmark/reports/regression_report.md`.
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


def detect_regressions(
    current_summaries: Dict[str, Any],
    output_base_dir: Path,
) -> Dict[str, Any]:
    """Compare current benchmark results against baseline/previous run and write regression report."""
    reports_dir = output_base_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    results_dir = output_base_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    baseline_file = results_dir / "previous_run.json"
    baseline_data: Optional[Dict[str, Any]] = None

    if baseline_file.exists():
        try:
            with open(baseline_file, "r", encoding="utf-8") as f:
                baseline_data = json.load(f)
        except Exception as exc:
            print(f"  [Regression Warning] Could not read baseline file ({exc}). Establishing new baseline...")

    improved_answers = []
    worse_answers = []
    new_hallucinations = []
    missing_evidence = []
    better_reasoning = []

    version_a_total = 0.0
    version_b_total = 0.0
    total_compared = 0

    if baseline_data and "summaries" in baseline_data:
        old_summaries = baseline_data["summaries"]

        for slug, current_repo in current_summaries.items():
            old_repo = old_summaries.get(slug)
            if not old_repo:
                continue

            old_results_map = {item["question"]: item for item in old_repo.get("results", [])}
            curr_results = current_repo.get("results", [])

            for item in curr_results:
                q_text = item["question"]
                old_item = old_results_map.get(q_text)
                if not old_item:
                    continue

                curr_eval = item.get("evaluation", {})
                old_eval = old_item.get("evaluation", {})

                c_score = curr_eval.get("total_score", 0)
                o_score = old_eval.get("total_score", 0)

                version_a_total += o_score
                version_b_total += c_score
                total_compared += 1

                score_delta = c_score - o_score

                c_metrics = curr_eval.get("metrics", {})
                o_metrics = old_eval.get("metrics", {})

                if score_delta >= 1:
                    improved_answers.append({
                        "repo": current_repo["repository_name"],
                        "question": q_text,
                        "old_score": o_score,
                        "new_score": c_score,
                        "delta": f"+{score_delta}",
                    })
                elif score_delta <= -1:
                    worse_answers.append({
                        "repo": current_repo["repository_name"],
                        "question": q_text,
                        "old_score": o_score,
                        "new_score": c_score,
                        "delta": f"{score_delta}",
                    })

                # Check hallucination risk drop
                if c_metrics.get("hallucination_risk", 5) < o_metrics.get("hallucination_risk", 5):
                    new_hallucinations.append({
                        "repo": current_repo["repository_name"],
                        "question": q_text,
                        "detail": "Hallucination risk increased (lower precision score)",
                    })

                # Check evidence drop
                if c_metrics.get("evidence_quality", 5) < o_metrics.get("evidence_quality", 5):
                    missing_evidence.append({
                        "repo": current_repo["repository_name"],
                        "question": q_text,
                        "detail": "Fewer code citations or tool calls in response",
                    })

                # Check reasoning boost
                if c_metrics.get("completeness", 0) > o_metrics.get("completeness", 0) or c_metrics.get("correctness", 0) > o_metrics.get("correctness", 0):
                    better_reasoning.append({
                        "repo": current_repo["repository_name"],
                        "question": q_text,
                        "detail": "Enhanced architectural trace and detail",
                    })

    # Save current run snapshot as new baseline for future comparisons
    with open(baseline_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "summaries": current_summaries,
            },
            f,
            indent=2,
        )

    # Format Regression Report Markdown
    version_a_avg = round((version_a_total / (total_compared * 30.0)) * 100, 1) if total_compared else 100.0
    version_b_avg = round((version_b_total / (total_compared * 30.0)) * 100, 1) if total_compared else 100.0
    overall_delta = round(version_b_avg - version_a_avg, 1)
    delta_str = f"+{overall_delta}%" if overall_delta >= 0 else f"{overall_delta}%"

    report_lines = [
        "# CommitIt AI Benchmark Regression Report",
        "",
        f"- **Executed At**: `{time.strftime('%Y-%m-%d %H:%M:%S')}`",
        f"- **Version Baseline**: `{version_a_avg}%`",
        f"- **Version Current**: `{version_b_avg}%`",
        f"- **Overall Change**: `{delta_str}`",
        "",
        "## Summary of Changes",
        "",
        f"- **Improved Answers**: {len(improved_answers)}",
        f"- **Worse Answers (Regressions)**: {len(worse_answers)}",
        f"- **New Hallucinations**: {len(new_hallucinations)}",
        f"- **Missing Evidence**: {len(missing_evidence)}",
        f"- **Better Reasoning**: {len(better_reasoning)}",
        "",
        "---",
        "",
        "### Improved Answers",
    ]

    if improved_answers:
        for item in improved_answers:
            report_lines.append(f"- **[{item['repo']}]** *{item['question']}*: {item['old_score']}/30 → {item['new_score']}/30 ({item['delta']})")
    else:
        report_lines.append("• No answer score improvements detected.")

    report_lines.extend(["", "### Regressions (Worse Answers)"])
    if worse_answers:
        for item in worse_answers:
            report_lines.append(f"- ⚠️ **[{item['repo']}]** *{item['question']}*: {item['old_score']}/30 → {item['new_score']}/30 ({item['delta']})")
    else:
        report_lines.append("✓ Zero regressions detected across benchmarked repositories.")

    report_lines.extend(["", "### New Hallucinations Detected"])
    if new_hallucinations:
        for item in new_hallucinations:
            report_lines.append(f"- ⚠️ **[{item['repo']}]** *{item['question']}*: {item['detail']}")
    else:
        report_lines.append("✓ Zero new hallucinations detected.")

    report_lines.extend(["", "### Missing Evidence Detected"])
    if missing_evidence:
        for item in missing_evidence:
            report_lines.append(f"- **[{item['repo']}]** *{item['question']}*: {item['detail']}")
    else:
        report_lines.append("✓ All answers maintained strong evidence grounding.")

    report_lines.extend(["", "### Better Reasoning"])
    if better_reasoning:
        for item in better_reasoning:
            report_lines.append(f"- **[{item['repo']}]** *{item['question']}*: {item['detail']}")
    else:
        report_lines.append("• Reasoning scores remained stable.")

    report_content = "\n".join(report_lines)

    # Save report to both benchmark/reports/regression_report.md and benchmark/results/regression_report.md
    for dest in [reports_dir / "regression_report.md", results_dir / "regression_report.md"]:
        with open(dest, "w", encoding="utf-8") as f:
            f.write(report_content)

    print(f"  [Regression Report] Generated at {reports_dir / 'regression_report.md'}")

    return {
        "version_a_avg": version_a_avg,
        "version_b_avg": version_b_avg,
        "overall_delta": overall_delta,
        "improved_count": len(improved_answers),
        "regressions_count": len(worse_answers),
        "hallucinations_count": len(new_hallucinations),
    }
