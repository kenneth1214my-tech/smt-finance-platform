export type RiskSeverity = "GOOD" | "WARNING" | "SERIOUS" | "CRITICAL";

const SEVERITY_ORDER: RiskSeverity[] = ["GOOD", "WARNING", "SERIOUS", "CRITICAL"];

export function worse(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

// A subsidiary's riskRating is a manually-set field that defaults to GOOD and often never
// gets touched — left alone, a real revenue collapse shows as "Healthy" forever. This escalates
// the displayed rating using computed YoY growth AND the current period's net margin, taking
// whichever of the three is worse, so a stale manual "GOOD" can't hide an actual decline. Net
// margin matters independently of YoY because a newly-onboarded entity with no prior-year
// baseline (yoyGrowthPct passed as 0) can still be genuinely loss-making right now — that must
// not read as "Healthy" just because there's nothing to compare it against yet. Only ever
// escalates, never downgrades an admin's own worse-than-computed judgment call.
export function effectiveRiskRating(manual: RiskSeverity, yoyGrowthPct: number, netMarginPct = 0): RiskSeverity {
  let fromYoy: RiskSeverity = "GOOD";
  if (yoyGrowthPct <= -30) fromYoy = "CRITICAL";
  else if (yoyGrowthPct <= -15) fromYoy = "SERIOUS";
  else if (yoyGrowthPct < 0) fromYoy = "WARNING";

  let fromMargin: RiskSeverity = "GOOD";
  if (netMarginPct <= -20) fromMargin = "CRITICAL";
  else if (netMarginPct <= -10) fromMargin = "SERIOUS";
  else if (netMarginPct < 0) fromMargin = "WARNING";

  return worse(worse(manual, fromYoy), fromMargin);
}
