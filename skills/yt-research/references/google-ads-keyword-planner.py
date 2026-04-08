#!/usr/bin/env python3
"""
Google Ads Keyword Planner — Reusable script for any skill.

Usage:
    python3 google-ads-keyword-planner.py "cold email" "AI lead generation" "cold email automation"
    python3 google-ads-keyword-planner.py --json "cold email" "AI lead generation"

Output: JSON array of keyword ideas with volume, competition, CPC.
"""

import sys
import json
import os

# Add the marketing-director lib to path
sys.path.insert(0, os.path.expanduser(
    "~/Documents/Tech & Dev/Studio Apps/Archive/marketing-director"
))

from lib.google_ads.auth import get_client, get_customer_id


def get_keyword_ideas(keywords: list[str], language_id: str = "1000", geo_id: str = "2840") -> list[dict]:
    """
    Get search volume and competition data for keywords via Google Ads Keyword Planner.

    Args:
        keywords: List of keyword strings to research
        language_id: Language constant ID (1000 = English)
        geo_id: Geo target constant ID (2840 = United States)

    Returns:
        List of dicts with keyword data
    """
    client = get_client()
    customer_id = get_customer_id()

    keyword_plan_idea_service = client.get_service("KeywordPlanIdeaService")
    keyword_plan_network = client.enums.KeywordPlanNetworkEnum.GOOGLE_SEARCH

    request = client.get_type("GenerateKeywordIdeasRequest")
    request.customer_id = customer_id
    request.language = f"languageConstants/{language_id}"
    request.geo_target_constants.append(f"geoTargetConstants/{geo_id}")
    request.keyword_plan_network = keyword_plan_network

    # Use keyword_seed for direct keyword lookup
    request.keyword_seed.keywords.extend(keywords)

    results = []
    try:
        response = keyword_plan_idea_service.generate_keyword_ideas(request=request)

        for idea in response:
            metrics = idea.keyword_idea_metrics

            # Extract monthly search volumes history
            monthly_volumes = []
            if metrics.monthly_search_volumes:
                for mv in metrics.monthly_search_volumes:
                    monthly_volumes.append({
                        "year": mv.year,
                        "month": mv.month.name if hasattr(mv.month, 'name') else str(mv.month),
                        "searches": mv.monthly_searches
                    })

            results.append({
                "keyword": idea.text,
                "avg_monthly_searches": metrics.avg_monthly_searches,
                "competition": metrics.competition.name if hasattr(metrics.competition, 'name') else str(metrics.competition),
                "competition_index": metrics.competition_index,
                "low_top_of_page_bid_cents": metrics.low_top_of_page_bid_micros / 10000 if metrics.low_top_of_page_bid_micros else 0,
                "high_top_of_page_bid_cents": metrics.high_top_of_page_bid_micros / 10000 if metrics.high_top_of_page_bid_micros else 0,
                "monthly_volumes": monthly_volumes[-6:] if monthly_volumes else []  # Last 6 months
            })

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Google Ads Keyword Planner lookup")
    parser.add_argument("keywords", nargs="+", help="Keywords to research")
    parser.add_argument("--json", action="store_true", help="Output raw JSON (default: formatted table)")
    parser.add_argument("--lang", default="1000", help="Language ID (default: 1000 = English)")
    parser.add_argument("--geo", default="2840", help="Geo target ID (default: 2840 = US)")

    args = parser.parse_args()

    results = get_keyword_ideas(args.keywords, args.lang, args.geo)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        # Formatted table output
        print(f"\n{'Keyword':<45} {'Vol/mo':>8} {'Competition':>13} {'CPC Low':>8} {'CPC High':>9}")
        print("-" * 90)
        for r in sorted(results, key=lambda x: x["avg_monthly_searches"], reverse=True):
            cpc_lo = f"${r['low_top_of_page_bid_cents']:.2f}" if r['low_top_of_page_bid_cents'] else "N/A"
            cpc_hi = f"${r['high_top_of_page_bid_cents']:.2f}" if r['high_top_of_page_bid_cents'] else "N/A"
            print(f"{r['keyword']:<45} {r['avg_monthly_searches']:>8,} {r['competition']:>13} {cpc_lo:>8} {cpc_hi:>9}")
        print(f"\nTotal: {len(results)} keywords")
