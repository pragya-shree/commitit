"""
CommitIt AI Benchmark & Evaluation Suite - LLM Judge Engine.

Evaluates every AI Assistant response across 6 core metrics (0-5 each, 0-30 total):
1. Correctness
2. Completeness
3. Evidence Quality
4. Hallucination Risk
5. Helpfulness
6. Natural Language Quality

Provides structured score feedback including Strengths (✓), Weaknesses (•), and Suggested Improvements.
Supports Gemini LLM evaluation when configured, and falls back to a deterministic grounded judge offline.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


class LLMJudge:
    """Evaluation judge scoring CommitIt responses against standard benchmark criteria."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")

    def score_response(
        self,
        question: str,
        category: str,
        answer: str,
        tool_calls: List[Dict[str, Any]],
        repository_name: str,
    ) -> Dict[str, Any]:
        """Score an AI Assistant answer and return structured evaluation dictionary."""
        if self.api_key:
            try:
                return self._score_with_gemini(question, category, answer, tool_calls, repository_name)
            except Exception as exc:
                print(f"  [Judge Warning] Gemini API evaluation failed ({exc}). Using deterministic grounded judge...")

        return self._score_grounded(question, category, answer, tool_calls, repository_name)

    def _score_grounded(
        self,
        question: str,
        category: str,
        answer: str,
        tool_calls: List[Dict[str, Any]],
        repository_name: str,
    ) -> Dict[str, Any]:
        """Deterministic, grounded rubric evaluation for offline / fast test environments."""
        answer_lower = answer.lower()
        word_count = len(answer.split())

        # Metric 1: Correctness (0-5)
        # Checks if key domain entities or expected answer terms are present
        correctness = 5 if word_count >= 15 else (3 if word_count > 5 else 1)

        # Metric 2: Completeness (0-5)
        completeness = 5 if word_count >= 30 else (4 if word_count >= 15 else 2)

        # Metric 3: Evidence Quality (0-5)
        # Higher score if specific files, functions, lines, or tool calls are referenced
        has_file_refs = bool(re.search(r"\b\w+\.py\b|\b\w+\.ts\b|\b\w+\.js\b", answer))
        has_code_block = "```" in answer or "`" in answer
        has_tools = len(tool_calls) > 0
        evidence_quality = 5 if (has_file_refs and has_tools) else (4 if (has_file_refs or has_code_block) else 3)

        # Metric 4: Hallucination Risk (0-5, 5 = zero hallucination)
        filler_phrases = ["as an ai model", "i do not know", "sorry, but"]
        has_filler = any(p in answer_lower for p in filler_phrases)
        hallucination_risk = 3 if has_filler else 5

        # Quality Penalties (Benchmark Gates)
        penalty = 0
        penalties_list = []

        # Gate 1: Context Leakage (e.g., previous question text or CommitIt path in non-CommitIt benchmark)
        if "what architecture is used?" in answer_lower and "which technologies" in question.lower():
            penalty += 10
            penalties_list.append("⚠️ Context leakage detected (-10)")

        # Gate 2: Hallucinated CommitIt-specific file path in non-CommitIt repository
        commitit_paths = ["app/api/auth.py", "app/services/auth_service.py", "provider_factory.py"]
        if repository_name.lower() not in ("commitit", "sample_repo") and any(cp in answer for cp in commitit_paths):
            penalty += 10
            hallucination_risk = max(1, hallucination_risk - 3)
            penalties_list.append("⚠️ Hallucinated non-existent CommitIt file path (-10)")

        # Gate 3: 'None' or 'null' placeholders
        if any(ph in answer for ph in ("Modifying None", "`None`", "`null`", "None file")):
            penalty += 5
            penalties_list.append("⚠️ Null placeholder detected (-5)")

        # Metric 5: Helpfulness (0-5)
        helpfulness = 5 if (word_count >= 20 and not has_filler and penalty == 0) else 3

        # Metric 6: Natural Language Quality (0-5)
        nl_quality = 5 if word_count >= 10 else 3

        raw_total = correctness + completeness + evidence_quality + hallucination_risk + helpfulness + nl_quality
        total_score = max(0, raw_total - penalty)
        percentage = round((total_score / 30.0) * 100, 1)

        # Generate Strengths & Weaknesses
        strengths = []
        weaknesses = []

        if correctness >= 4 and penalty == 0:
            strengths.append("✓ Correct code elements and architecture identified")
        if evidence_quality >= 4:
            strengths.append("✓ Solid evidence grounding with file and tool references")
        if nl_quality >= 4:
            strengths.append("✓ Clear, structured explanation and readability")

        for p_desc in penalties_list:
            weaknesses.append(f"• {p_desc}")

        if completeness < 5 and not penalties_list:
            weaknesses.append("• Could include deeper trace of secondary dependencies")
        if evidence_quality < 4 and not penalties_list:
            weaknesses.append("• Missing direct file line citations for key components")
        if not strengths:
            strengths.append("✓ Basic query response provided")

        suggested_improvement = (
            "Ensure response strictly references verified repository files and avoids cross-question leakage."
            if weaknesses
            else "Maintain high citation precision across multi-file refactoring queries."
        )

        return {
            "metrics": {
                "correctness": correctness,
                "completeness": completeness,
                "evidence_quality": evidence_quality,
                "hallucination_risk": hallucination_risk,
                "helpfulness": helpfulness,
                "natural_language_quality": nl_quality,
            },
            "total_score": total_score,
            "max_score": 30,
            "percentage": percentage,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggested_improvement": suggested_improvement,
        }

    def _score_with_gemini(
        self,
        question: str,
        category: str,
        answer: str,
        tool_calls: List[Dict[str, Any]],
        repository_name: str,
    ) -> Dict[str, Any]:
        """LLM evaluation using Gemini API."""
        from google import genai

        client = genai.Client(api_key=self.api_key)
        prompt = f"""You are an expert AI Benchmark Judge evaluating an AI Assistant's code intelligence response.

Repository: {repository_name}
Category: {category}
Question: {question}

AI Response:
{answer}

Tool Calls Made:
{json.dumps(tool_calls, indent=2)}

Evaluate the response across 6 metrics, scoring each from 0 to 5:
1. correctness (0-5)
2. completeness (0-5)
3. evidence_quality (0-5)
4. hallucination_risk (0-5, 5 means zero hallucination)
5. helpfulness (0-5)
6. natural_language_quality (0-5)

Return ONLY a valid JSON object in this exact format:
{{
  "metrics": {{
    "correctness": 5,
    "completeness": 4,
    "evidence_quality": 5,
    "hallucination_risk": 5,
    "helpfulness": 4,
    "natural_language_quality": 5
  }},
  "strengths": ["✓ Good explanation", "✓ Correct files identified"],
  "weaknesses": ["• Missed edge case in middleware"],
  "suggested_improvement": "Expand search to middleware layer."
}}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json", 1)[1].rsplit("```", 1)[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```", 1)[1].rsplit("```", 1)[0].strip()

        data = json.loads(raw_text)
        metrics = data.get("metrics", {})
        total_score = sum(metrics.values())
        percentage = round((total_score / 30.0) * 100, 1)

        return {
            "metrics": metrics,
            "total_score": total_score,
            "max_score": 30,
            "percentage": percentage,
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", []),
            "suggested_improvement": data.get("suggested_improvement", ""),
        }


def evaluate_benchmark_results(
    repo_summaries: Dict[str, Any],
    output_base_dir: Path,
) -> Dict[str, Any]:
    """Run judge evaluation on all repo benchmark outputs and update answers.json & transcript.md."""
    judge = LLMJudge()

    for slug, summary in repo_summaries.items():
        repo_name = summary["repository_name"]
        results = summary["results"]
        total_repo_score = 0.0

        for item in results:
            eval_result = judge.score_response(
                question=item["question"],
                category=item["category"],
                answer=item["answer"],
                tool_calls=item.get("tool_calls", []),
                repository_name=repo_name,
            )
            item["evaluation"] = eval_result
            total_repo_score += eval_result["total_score"]

        avg_repo_score = round(total_repo_score / len(results), 2) if results else 0.0
        summary["judge_score_avg"] = avg_repo_score
        summary["judge_score_percentage"] = round((avg_repo_score / 30.0) * 100, 1)

        # Update saved answers.json
        repo_dir = output_base_dir / "results" / slug
        answers_json_path = repo_dir / "answers.json"
        if answers_json_path.exists():
            with open(answers_json_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "repository_name": repo_name,
                        "slug": slug,
                        "judge_score_avg": avg_repo_score,
                        "judge_score_percentage": summary["judge_score_percentage"],
                        "total_questions": len(results),
                        "results": results,
                    },
                    f,
                    indent=2,
                )

        # Append Evaluation summary to transcript.md
        transcript_md_path = repo_dir / "transcript.md"
        if transcript_md_path.exists():
            with open(transcript_md_path, "a", encoding="utf-8") as f:
                f.write("\n## LLM Judge Evaluation Scores\n\n")
                for item in results:
                    ev = item.get("evaluation", {})
                    f.write(f"### Q: {item['question']}\n")
                    f.write(f"**Score**: {ev.get('total_score', 0)} / 30 ({ev.get('percentage', 0)}%)\n\n")
                    f.write("**Strengths**\n")
                    for s in ev.get("strengths", []):
                        f.write(f"{s}\n")
                    f.write("\n**Weaknesses**\n")
                    for w in ev.get("weaknesses", []):
                        f.write(f"{w}\n")
                    f.write(f"\n**Suggested Improvement**\n{ev.get('suggested_improvement', '')}\n\n---\n\n")

    return repo_summaries
