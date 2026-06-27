"use client";

/**
 * Lead Routing Form — React component (de-LGJ'd, dependency-free except React).
 *
 * Copy to:  src/components/lead-routing/qualification-router.tsx
 * Adjust the two engine imports below to wherever you placed the engine + config.
 *
 * Renders a multi-step qualifier (contact → questions → consents → outcome), routes the
 * lead with the pure engine, embeds the matched calendar (any provider), and POSTs the
 * 4 events to your forwarder route (default /api/<key>/submit). No tracking, no GHL, no DB.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateRouting, resolveSalesperson } from "@/lib/lead-routing/engine/evaluate";
import { COUNTRIES, DEFAULT_COUNTRY_ISO, countryByIso } from "@/lib/lead-routing/engine/countries";
import type { Answers, RoutingConfig, RoutingOutcome, RoutingQuestion } from "@/lib/lead-routing/engine/types";

const RESERVED = { country: "__country", countryIso: "__country_iso", phoneCc: "__phone_cc", website: "__website" } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

type Phase = "contact" | "questions" | "consents" | "outcome";

function composePhone(national: string, iso: string, withCountry: boolean): string {
  if (!withCountry) return national.trim();
  const digits = (national || "").replace(/\D/g, "");
  return digits ? `+${countryByIso(iso).dialCode}${digits}` : "";
}
function buildCalendarUrl(bookingUrl: string, contact: { fullName: string; email: string; phone: string }, answers: Answers, prefillKeys?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (contact.fullName) { p.set("name", contact.fullName); p.set("full_name", contact.fullName); }
  if (contact.email) p.set("email", contact.email);
  if (contact.phone) p.set("phone", contact.phone);
  if (prefillKeys) for (const [aid, key] of Object.entries(prefillKeys)) if (answers[aid]) p.set(key, answers[aid]);
  const qs = p.toString();
  return qs ? `${bookingUrl}${bookingUrl.includes("?") ? "&" : "?"}${qs}` : bookingUrl;
}
function trackingContext() {
  let u: Record<string, string | null> = {};
  try { const p = new URLSearchParams(location.search); u = { utmSource: p.get("utm_source"), utmMedium: p.get("utm_medium"), utmCampaign: p.get("utm_campaign"), utmTerm: p.get("utm_term"), utmContent: p.get("utm_content") }; } catch { /* noop */ }
  return { pageUrl: typeof location !== "undefined" ? location.href : null, referrer: typeof document !== "undefined" ? document.referrer || null : null, ...u };
}

export function QualificationRouter({ config, submitPath, variant = "light" }: { config: RoutingConfig; submitPath?: string; variant?: "light" | "dark" }) {
  const url = submitPath ?? `/api/${config.key}/submit`;
  const questions = config.questions ?? [];
  const consents = config.consents ?? [];
  const showPhone = !!config.contactFields?.phone;
  const showPhoneCountry = !!config.contactFields?.phoneCountry && showPhone;
  const showWebsite = !!config.contactFields?.website;

  const [phase, setPhase] = useState<Phase>("contact");
  const [qIndex, setQIndex] = useState(0);
  const [contact, setContact] = useState({ fullName: "", email: "", phone: "" });
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<RoutingOutcome | null>(null);

  const captured = useRef(false);
  const completed = useRef(false);
  const partialFired = useRef(false);

  const totalSteps = 1 + questions.length + (consents.length ? 1 : 0);
  const currentStep = phase === "contact" ? 1 : phase === "questions" ? 2 + qIndex : phase === "consents" ? 1 + questions.length + 1 : totalSteps;

  const post = useCallback((event: string, extra: Record<string, unknown>, beacon = false) => {
    const data = {
      fullName: contact.fullName, email: contact.email, phone: contact.phone || null,
      website: answers[RESERVED.website] || null, country: answers[RESERVED.country] || null,
      landingPage: config.key || "calendar-routing", source: `calendar-routing:${config.key || "unknown"}`, ...extra,
    };
    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });
    try {
      if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) { navigator.sendBeacon(url, new Blob([payload], { type: "application/json" })); return; }
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    } catch { /* noop */ }
  }, [contact, answers, config.key, url]);

  // Abandonment beacon — fire partial once if they leave after the contact step.
  useEffect(() => {
    const fire = () => {
      if (!captured.current || completed.current || partialFired.current) return;
      partialFired.current = true;
      post("partial_submission", { answers, lastStep: currentStep }, true);
    };
    const onVis = () => { if (document.visibilityState === "hidden") fire(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", fire);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", fire); };
  }, [post, answers, currentStep]);

  const finish = useCallback((finalAnswers: Answers) => {
    if (completed.current) return;
    completed.current = true;
    const o = evaluateRouting(finalAnswers, config);
    setOutcome(o);
    if (o.type === "assign") {
      const sp = resolveSalesperson(config, o.salespersonId) ?? config.salespeople[0];
      post("qualified", { answers: finalAnswers, outcome: "assign", assignedSalesperson: sp?.id ?? null, disqualifyReason: null });
    } else {
      post("disqualified", { answers: finalAnswers, outcome: "disqualify", assignedSalesperson: null, disqualifyReason: o.reason ?? "needs_qualification" });
    }
  }, [config, post]);

  const optionLabel = (q: RoutingQuestion, opt: { value: string; label: string }) => {
    if (q.adaptiveLabels) { const dep = answers[q.adaptiveLabels.dependsOn]; const m = dep && q.adaptiveLabels.map[dep]; if (m && m[opt.value]) return m[opt.value]; }
    return opt.label;
  };

  const submitContact = () => {
    const fullName = contact.fullName.trim(); const email = contact.email.trim();
    if (!fullName) return setError("Please enter your name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email.");
    const next: Answers = { ...answers };
    if (showWebsite && answers[RESERVED.website] && !WEBSITE_RE.test(answers[RESERVED.website])) return setError("That website doesn't look right.");
    if (showPhoneCountry) { const co = countryByIso(countryIso); next[RESERVED.countryIso] = co.iso; next[RESERVED.country] = co.name; next[RESERVED.phoneCc] = `+${co.dialCode}`; }
    const phone = showPhone ? composePhone(contact.phone, countryIso, showPhoneCountry) : "";
    setContact((c) => ({ ...c, fullName, email, phone }));
    setAnswers(next);
    setError("");
    if (!captured.current) { captured.current = true; post("lander_optin", { tracking: trackingContext() }); }
    if (questions.length) setPhase("questions");
    else if (consents.length) setPhase("consents");
    else { setPhase("outcome"); finish(next); }
  };

  const matched = useMemo(() => (outcome?.type === "assign" ? resolveSalesperson(config, outcome.salespersonId) ?? config.salespeople[0] : null), [outcome, config]);
  const dq = config.disqualified;
  let dqCta = dq?.cta;
  if (dq?.downsellByAnswer) { const av = answers[dq.downsellByAnswer.questionId]; if (av && dq.downsellByAnswer.map[av]) dqCta = dq.downsellByAnswer.map[av]; }

  return (
    <div className={`lrf-root ${variant === "dark" ? "lrf-dark" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lrf-card">
        <div className="lrf-progress"><i style={{ width: `${Math.round((currentStep / totalSteps) * 100)}%` }} /></div>

        {phase === "contact" && (
          <>
            <h3 className="lrf-q">Let&apos;s get started</h3>
            <p className="lrf-sub">A few quick details so we can match you with the right person.</p>
            <Field label="Full name"><input className="lrf-input" type="text" autoComplete="name" placeholder="Full name" value={contact.fullName} onChange={(e) => setContact((c) => ({ ...c, fullName: e.target.value }))} /></Field>
            <Field label="Email"><input className="lrf-input" type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} /></Field>
            {showPhone && (
              <Field label="Phone">
                <div className={showPhoneCountry ? "lrf-phone-row" : ""}>
                  {showPhoneCountry && (
                    <select className="lrf-select" value={countryIso} onChange={(e) => setCountryIso(e.target.value)}>
                      {COUNTRIES.map((co) => <option key={co.iso} value={co.iso}>{co.iso} +{co.dialCode}</option>)}
                    </select>
                  )}
                  <input className="lrf-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
                </div>
              </Field>
            )}
            {showWebsite && <Field label="Website"><input className="lrf-input" type="text" autoComplete="url" placeholder="yourcompany.com (optional)" value={answers[RESERVED.website] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [RESERVED.website]: e.target.value }))} /></Field>}
            <button className="lrf-btn" onClick={submitContact}>Continue</button>
          </>
        )}

        {phase === "questions" && questions[qIndex] && (() => {
          const q = questions[qIndex];
          return (
            <>
              <h3 className="lrf-q">{q.label}</h3>
              {q.options.map((opt) => (
                <button key={opt.value} type="button" className={`lrf-opt ${answers[q.id] === opt.value ? "is-sel" : ""}`} onClick={() => { setAnswers((a) => { const n = { ...a, [q.id]: opt.value }; if (!(q.allowOther && opt.value === "other")) delete n[`${q.id}_other`]; return n; }); setError(""); }}>
                  <span className="lrf-dot" /><span>{optionLabel(q, opt)}</span>
                </button>
              ))}
              {q.allowOther && answers[q.id] === "other" && (
                <div className="lrf-field"><input className="lrf-input" type="text" placeholder={q.otherPlaceholder || "Tell us more…"} value={answers[`${q.id}_other`] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [`${q.id}_other`]: e.target.value }))} /></div>
              )}
              <button className="lrf-btn" onClick={() => {
                const required = q.required !== false;
                if (required && !answers[q.id]) return setError("Please pick an option.");
                if (qIndex < questions.length - 1) setQIndex((i) => i + 1);
                else if (consents.length) setPhase("consents");
                else { setPhase("outcome"); finish(answers); }
              }}>Continue</button>
              <button className="lrf-back" onClick={() => { if (qIndex > 0) setQIndex((i) => i - 1); else setPhase("contact"); }}>← Back</button>
            </>
          );
        })()}

        {phase === "consents" && (
          <>
            <h3 className="lrf-q">Before we match you</h3>
            {consents.map((con) => (
              <label key={con.id} className="lrf-consent">
                <input type="checkbox" checked={answers[`consent_${con.id}`] === "true"} onChange={(e) => { setAnswers((a) => ({ ...a, [`consent_${con.id}`]: e.target.checked ? "true" : "" })); setError(""); }} />
                <span>{con.label}</span>
              </label>
            ))}
            <button className="lrf-btn" onClick={() => {
              for (const con of consents) if (con.required !== false && answers[`consent_${con.id}`] !== "true") return setError("Please check all boxes to continue.");
              setPhase("outcome"); finish(answers);
            }}>See my match</button>
            <button className="lrf-back" onClick={() => { if (questions.length) { setPhase("questions"); setQIndex(questions.length - 1); } else setPhase("contact"); }}>← Back</button>
          </>
        )}

        {phase === "outcome" && matched && (
          <>
            <div className="lrf-matched">
              {matched.avatarUrl ? <img className="lrf-avatar" src={matched.avatarUrl} alt={matched.name} /> : <div className="lrf-avatar">{matched.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</div>}
              <div><b>You&apos;re matched with {matched.name}</b>{matched.role && <span>{matched.role}</span>}</div>
            </div>
            <p className="lrf-sub">Pick a time below — it&apos;s confirmed instantly.</p>
            <iframe className="lrf-cal" title="Book a time" src={buildCalendarUrl(matched.bookingUrl, contact, answers, config.ghlPrefillKeys)} loading="lazy" />
          </>
        )}

        {phase === "outcome" && !matched && dq && (
          <>
            <h3 className="lrf-q">{dq.headline}</h3>
            {dq.body && <p className="lrf-sub">{dq.body}</p>}
            {dq.bookingUrl && <iframe className="lrf-cal" title="Qualification call" src={buildCalendarUrl(dq.bookingUrl, contact, answers, config.ghlPrefillKeys)} loading="lazy" />}
            {dq.bookingNote && <div className="lrf-note">{dq.bookingNote}</div>}
            {dqCta && <a className="lrf-dq-cta" href={dqCta.href}>{dqCta.label}</a>}
          </>
        )}

        {error && <div className="lrf-err">{error}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lrf-field"><label>{label}</label>{children}</div>;
}

/* Self-contained styles — theme by overriding the CSS variables on .lrf-root. */
const CSS = `
.lrf-root{--lrf-accent:#ED0D51;--lrf-accent-press:#c40b45;--lrf-ink:#0f172a;--lrf-muted:#64748b;--lrf-line:#e2e8f0;--lrf-bg:#fff;--lrf-soft:#f8fafc;--lrf-radius:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--lrf-ink);max-width:640px;margin:0 auto}
.lrf-card{background:var(--lrf-bg);border:1px solid var(--lrf-line);border-radius:var(--lrf-radius);padding:28px 24px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.lrf-progress{height:4px;background:var(--lrf-line);border-radius:999px;overflow:hidden;margin-bottom:22px}
.lrf-progress>i{display:block;height:100%;background:var(--lrf-accent);transition:width .3s ease}
.lrf-q{font-size:20px;font-weight:700;line-height:1.25;margin:0 0 16px}
.lrf-sub{color:var(--lrf-muted);font-size:14px;margin:-8px 0 18px}
.lrf-field{margin-bottom:14px}
.lrf-field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
.lrf-input,.lrf-select{width:100%;box-sizing:border-box;padding:12px 14px;font-size:16px;border:1px solid var(--lrf-line);border-radius:10px;background:var(--lrf-bg);color:var(--lrf-ink);outline:none}
.lrf-input:focus,.lrf-select:focus{border-color:var(--lrf-accent)}
.lrf-phone-row{display:flex;gap:8px}
.lrf-phone-row .lrf-select{width:auto;flex:0 0 auto;min-width:96px}
.lrf-phone-row .lrf-input{flex:1 1 auto}
.lrf-opt{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;text-align:left;padding:14px 16px;margin-bottom:10px;border:1px solid var(--lrf-line);border-radius:10px;background:var(--lrf-bg);color:var(--lrf-ink);font-size:15px;cursor:pointer;transition:border-color .15s,background .15s}
.lrf-opt:hover{border-color:var(--lrf-accent)}
.lrf-opt.is-sel{border-color:var(--lrf-accent);background:rgba(237,13,81,.05)}
.lrf-opt>.lrf-dot{flex:0 0 auto;width:18px;height:18px;border-radius:999px;border:2px solid var(--lrf-line)}
.lrf-opt.is-sel>.lrf-dot{border-color:var(--lrf-accent);background:var(--lrf-accent);box-shadow:inset 0 0 0 3px var(--lrf-bg)}
.lrf-consent{display:flex;gap:12px;align-items:flex-start;padding:12px 0;font-size:14px;cursor:pointer}
.lrf-consent input{margin-top:3px;width:18px;height:18px;flex:0 0 auto}
.lrf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:14px 18px;font-size:16px;font-weight:700;color:#fff;background:var(--lrf-accent);border:none;border-radius:10px;cursor:pointer}
.lrf-btn:hover{background:var(--lrf-accent-press)}
.lrf-back{background:none;border:none;color:var(--lrf-muted);font-size:14px;cursor:pointer;padding:8px 0;margin-top:6px;display:block}
.lrf-err{color:#b91c1c;font-size:13px;margin-top:8px}
.lrf-cal{width:100%;border:0;border-radius:12px;min-height:720px}
.lrf-matched{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.lrf-avatar{width:48px;height:48px;border-radius:999px;object-fit:cover;background:var(--lrf-soft);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--lrf-muted)}
.lrf-matched b{display:block;font-size:16px}
.lrf-matched span{color:var(--lrf-muted);font-size:13px}
.lrf-note{background:var(--lrf-soft);border:1px solid rgba(15,23,42,.08);border-radius:10px;padding:10px 12px;font-size:13px;color:var(--lrf-muted);margin:12px 0}
.lrf-dq-cta{display:inline-block;margin-top:14px;padding:12px 18px;font-weight:700;color:var(--lrf-accent);border:1px solid var(--lrf-line);border-radius:10px;text-decoration:none}
.lrf-dark.lrf-root{--lrf-ink:#f1f5f9;--lrf-muted:#94a3b8;--lrf-line:#334155;--lrf-bg:#0f172a;--lrf-soft:#1e293b}
@media (max-width:520px){.lrf-card{padding:20px 16px}.lrf-q{font-size:18px}}
`;
