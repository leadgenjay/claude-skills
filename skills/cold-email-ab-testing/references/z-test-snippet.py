"""Two-proportion z-test for A/B variant comparison in cold email campaigns.
Use with the python_repl MCP tool or inline in analysis."""

import math

def ab_significance(sent_a, replies_a, sent_b, replies_b, confidence=0.95):
    """Compare two A/B variants by reply rate.

    Args:
        sent_a: Number of emails sent for variant A
        replies_a: Number of replies for variant A
        sent_b: Number of emails sent for variant B
        replies_b: Number of replies for variant B
        confidence: Confidence level (default 0.95 = 95%)

    Returns:
        dict with z_score, p_value, significant (bool), verdict (str)
    """
    if sent_a < 100 or sent_b < 100:
        return {
            "z_score": 0, "p_value": 1, "significant": False,
            "verdict": f"Need more data (A:{sent_a}, B:{sent_b} — need 100+ each)"
        }

    p_a = replies_a / sent_a
    p_b = replies_b / sent_b
    p_pool = (replies_a + replies_b) / (sent_a + sent_b)

    if p_pool == 0 or p_pool == 1:
        return {
            "z_score": 0, "p_value": 1, "significant": False,
            "verdict": "Cannot compute (zero or 100% reply rate in both)"
        }

    se = math.sqrt(p_pool * (1 - p_pool) * (1/sent_a + 1/sent_b))
    if se == 0:
        return {"z_score": 0, "p_value": 1, "significant": False, "verdict": "Identical rates"}

    z = (p_a - p_b) / se
    p_value = 1 - math.erf(abs(z) / math.sqrt(2))

    alpha = 1 - confidence
    significant = p_value < alpha

    if not significant:
        verdict = f"No significant difference (p={p_value:.4f})"
    elif p_a > p_b:
        verdict = f"Variant A wins (p={p_value:.4f}, {p_a*100:.1f}% vs {p_b*100:.1f}%)"
    else:
        verdict = f"Variant B wins (p={p_value:.4f}, {p_b*100:.1f}% vs {p_a*100:.1f}%)"

    return {
        "z_score": round(z, 4),
        "p_value": round(p_value, 4),
        "significant": significant,
        "verdict": verdict
    }
