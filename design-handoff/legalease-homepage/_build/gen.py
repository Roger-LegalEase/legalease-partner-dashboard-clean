# -*- coding: utf-8 -*-
# Generates site/index.html for the LegalEase homepage.

import os

NAV = ["Products","How it works","Partners","Company"]

# ---------------------------------------------------------------------------
# ASSET SLOTS
# Each visual slot reads from a known filename in assets/. If you drop a real
# file in with that name, it appears automatically; otherwise the built mock
# (passed as `fallback`) is shown. To add a real asset: export it, name it per
# the table below, and put it in assets/. No code change needed.
#
#   assets/shot-briefcase.(png|webp|jpg)   -> Expungement.ai flagship
#   assets/shot-partner.(png|webp|jpg)     -> Partner dashboard
#   assets/photo-founders.(jpg|png|webp)   -> Founder portrait(s)
#   assets/logo-recordshield.(svg|png)     -> RecordShield product logo
#   assets/logo-claimcoach.(svg|png)       -> Claim Coach product logo
#   assets/logo-startapart.(svg|png)       -> StartApart product logo
# ---------------------------------------------------------------------------

# Screenshot framing: "shell" wraps the image in a browser chrome; "flat" shows
# it borderless in a soft card. Flip this and rebuild to compare.
SHOT_STYLE = "shell"   # "shell" | "flat"

def _find_asset(stem, exts):
    for e in exts:
        if os.path.exists(os.path.join("assets", f"{stem}.{e}")):
            return f"assets/{stem}.{e}"
    return None

def shot_slot(stem, label, fallback, dark=False):
    """A screenshot slot. Shows the real file if present, else the mock."""
    src = _find_asset(stem, ["png","webp","jpg","jpeg"])
    if not src:
        # no real asset yet: show the mock, tagged with the target filename
        return f'<div class="frame{" on-dark" if dark else ""}"><span class="ph">{label}</span>{fallback}</div>'
    alt = label.replace("-", " ")
    if SHOT_STYLE == "shell":
        return f"""<div class="shot-shell{' dark' if dark else ''}">
          <div class="shot-bar"><span class="sd"></span><span class="sd"></span><span class="sd"></span></div>
          <img class="shot-img" src="{src}" alt="{alt}" loading="lazy">
        </div>"""
    return f'<div class="shot-flat{" dark" if dark else ""}"><img class="shot-img" src="{src}" alt="{alt}" loading="lazy"></div>'

def photo_slot(stem, label, fallback):
    """A photography slot (e.g. founders). Shows the real file if present."""
    src = _find_asset(stem, ["jpg","jpeg","png","webp"])
    if not src:
        return fallback  # the built gradient placeholder
    return f'<img class="photo-img" src="{src}" alt="{label.replace("-"," ")}" loading="lazy">'

def product_logo(stem, name_fallback, accent):
    """A product logo lockup. Shows the real logo if present, else a branded
    text lockup built from the product name + accent."""
    src = _find_asset(stem, ["svg","png","webp"])
    if src:
        return f'<img class="prod-logo" src="{src}" alt="{name_fallback}" loading="lazy">'
    # branded fallback lockup: LE-style square node + product name
    return f'<span class="prod-lockup" style="--pa:{accent}"><span class="pl-node"></span>{name_fallback}</span>'

def eyebrow(text):
    return f'<span class="eyebrow">{text}</span>'

def arrow():
    return '<svg class="arr" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'

# ---- small inline path/node SVG used as the brand motif ----
def node_chip(label, kind="step"):
    return label

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LegalEase | Legal Help Without the Blank Check</title>
<meta name="description" content="LegalEase helps people clear eligible records, review background-check issues, organize simple injury claims, and start uncontested divorce with guided, secure self-help tools.">
<meta property="og:title" content="LegalEase | Legal help without the blank check">
<meta property="og:description" content="Guided, affordable, secure tools for everyday legal problems, from record clearing to background-check readiness, simple claims, and uncontested divorce.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="styles.css">
</head>
<body>
"""

def announce():
    return """
<!-- ANNOUNCEMENT -->
<div class="announce">
  <div class="wrap">
    <span class="a-left"><span class="a-dot"></span><span class="sky">Expungement.ai</span> is live &nbsp;&middot;&nbsp; RecordShield, Claim Coach, and StartApart are in <span class="sky">beta</span></span>
    <span class="a-right">Private by design &middot; Clear, bounded self-help tools</span>
  </div>
</div>
"""

def header():
    nav_map = {"Products":"roadmap","How it works":"how","Partners":"partners","Company":"company"}
    nav_links = "".join(f'<a href="#{nav_map[n]}">{n}</a>' for n in NAV)
    return f"""
<!-- HEADER -->
<header class="header" id="header">
  <div class="wrap">
    <a class="logo" href="#top" aria-label="LegalEase home"><img id="headerLogo" src="assets/wm_primary.png" alt="LegalEase"></a>
    <nav class="nav" aria-label="Primary">{nav_links}</nav>
    <div class="header-cta">
      <a class="btn btn-primary" href="#contact">Partner with us {arrow()}</a>
    </div>
    <button class="menu-btn" id="menuOpen" aria-label="Open menu" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>
"""

def mobile_menu():
    nav_map = {"Products":"roadmap","How it works":"how","Partners":"partners","Company":"company"}
    nav_links = "".join(f'<a href="#{nav_map[n]}" class="m-link">{n}</a>' for n in NAV)
    return f"""
<!-- MOBILE MENU -->
<div class="m-menu" id="mMenu" aria-hidden="true">
  <div class="m-menu-top">
    <img src="assets/wm_primary.png" alt="LegalEase">
    <button class="m-close" id="menuClose" aria-label="Close menu">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  </div>
  <nav aria-label="Mobile">{nav_links}</nav>
  <div class="m-cta">
    <a class="btn btn-primary" href="#roadmap">Find the right tool {arrow()}</a>
    <a class="btn btn-ghost" href="#contact">Partner with us</a>
  </div>
</div>
"""

def _need_icon(kind):
    p = {
        "record": '<path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13 4v5h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 13.5l1.6 1.6 3.4-3.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
        "shield": '<path d="M12 3l7 3v5c0 4.4-3 7.2-7 8-4-.8-7-3.6-7-8V6l7-3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 11.5l2 2 3.5-3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
        "claim": '<path d="M5 5h10l4 4v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 11h7M8 14h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
        "divorce": '<path d="M12 5v14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="9" r="3" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="9" r="3" stroke="currentColor" stroke-width="1.7"/>',
        "org": '<path d="M4 20V8l5-3 5 3v12" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 20v-8l5-2v10" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11h0M7 14h0M11 11h0M11 14h0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    }
    return f'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{p[kind]}</svg>'

# Product selector cards - reused in hero (compact) and the selector section (full)
SELECTOR = [
    ("record","Clear my record","Expungement.ai","live","Check whether your record may qualify and get self-help filing guidance.","Start free check","https://expungement.ai"),
    ("shield","Check my background report","RecordShield","beta","See what may appear before an employer, landlord, or licensing body does.","Join RecordShield beta","#waitlist"),
    ("claim","Handle an injury claim","Claim Coach","beta","Organize a non-complex soft-tissue claim without giving up one-third of the recovery.","Request Claim Coach access","#waitlist"),
    ("divorce","Start a no-fault divorce","StartApart","beta","Guided help for an uncontested no-fault divorce when both people agree.","Request StartApart access","#waitlist"),
    ("org","Help my community","For partners","partner","Launch guided legal-access tools for the people your organization already serves.","Partner with us","#contact"),
]

def hero():
    # compact selector preview inside the hero panel
    rows=""
    for kind,label,prod,status,_desc,_cta,href in SELECTOR:
        badge = {"live":"live","beta":"beta","partner":"partner"}[status]
        badge_txt = {"live":"Live","beta":"Beta","partner":"Partner"}[status]
        live_cls = " is-live" if status=="live" else ""
        check = '<span class="hsel-check"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' if status=="live" else ""
        rows+=f"""<a class="hsel-row{live_cls}" href="{href}">
          <span class="hsel-ic">{_need_icon(kind)}</span>
          <span class="hsel-label">{label}</span>
          {check}<span class="hsel-badge {badge}">{badge_txt}</span>
          <span class="hsel-arr">{arrow()}</span>
        </a>"""
    return f"""
<!-- HERO -->
<section class="hero section-pad" id="top">
  <div class="wrap">
    <div class="hero-copy reveal">
      {eyebrow("Guided legal tools for real life")}
      <h1 class="display h-hero">Do it yourself.<br><span class="accent">Do it right.</span></h1>
      <p class="lede sub">Clear eligible records, review background-check issues, organize simple injury claims, or start an uncontested divorce, securely, affordably, and with clear limits on what LegalEase supports.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#roadmap">Find the right tool {arrow()}</a>
        <a class="btn btn-ghost" href="https://expungement.ai">Explore Expungement.ai</a>
      </div>
      <p class="support"><b>Live:</b> Expungement.ai <span class="sep">&middot;</span> <b>Beta:</b> RecordShield, Claim Coach, StartApart</p>
    </div>

    <!-- product selector panel -->
    <div class="hsel reveal frame" id="heroSel" aria-label="Choose what you need help with">
      <span class="ph">hero-product-selector</span>
      <div class="hsel-head">
        <span class="lbl">What do you need help with?</span>
        <img class="hsel-logo" src="assets/ic_skyline.png" alt="">
      </div>
      <div class="hsel-list">{rows}</div>
    </div>
  </div>
</section>
"""

print("part1 loaded")

# ---------- CUSTOMER TRUST STRIP (replaces early market proof) ----------
def trust_strip():
    items=[
        ("Affordable","Flat-fee tools for routine legal tasks."),
        ("Guided","Plain-English steps from start to next action."),
        ("Secure","Built for sensitive legal information."),
        ("Clear limits","Unsupported matters stop there."),
    ]
    cells="".join(f"""<div class="ts-cell reveal"><div class="ts-k">{k}</div><div class="ts-v">{v}</div></div>""" for k,v in items)
    return f"""
<!-- CUSTOMER TRUST STRIP -->
<section class="trust-strip" id="trust-strip">
  <div class="wrap"><div class="ts-grid">{cells}</div></div>
</section>
"""

# ---------- PRODUCT SELECTOR (main conversion section) ----------
def selector():
    cards=""
    for kind,label,prod,status,desc,cta,href in SELECTOR:
        badge_txt={"live":"Live","beta":"Beta","partner":"Partner"}[status]
        cards+=f"""<a class="sel-card reveal" href="{href}">
          <div class="sel-top"><span class="sel-ic">{_need_icon(kind)}</span><span class="sel-badge {status}">{badge_txt}</span></div>
          <h3 class="sel-h">{label}</h3>
          <div class="sel-prod">{prod}</div>
          <p>{desc}</p>
          <span class="sel-cta">{cta} {arrow()}</span>
        </a>"""
    return f"""
<!-- PRODUCT SELECTOR -->
<section class="section-pad bg-white" id="selector">
  <div class="wrap">
    <div class="sec-head reveal">
      <h2 class="h-sec">What do you need help with?</h2>
      <p class="lede">Start with the issue you&rsquo;re facing. LegalEase guides you to the right tool, explains what&rsquo;s available and what it costs, and tells you when a matter is out of scope.</p>
    </div>
    <div class="sel-grid">{cards}</div>
  </div>
</section>
"""

# ---------- WHY PEOPLE USE LEGALEASE ----------
def why_use():
    cards=[
        ("Overpaying for routine work","Flat-fee tools before open-ended hourly bills, so a simple matter doesn&rsquo;t cost like a complex one."),
        ("Getting lost in forms","Plain-English questions and step-by-step instructions instead of dense legal paperwork."),
        ("Missing the next step","Checklists, documents, reports, and dashboards that keep each matter moving."),
        ("Using self-help when you shouldn&rsquo;t","Clear signals about what&rsquo;s in scope, so you know when a matter is too complex for self-help."),
    ]
    items="".join(f"""<div class="why-card reveal"><h4>{t}</h4><p>{d}</p></div>""" for t,d in cards)
    return f"""
<!-- WHY USE -->
<section class="section-pad bg-porcelain" id="why">
  <div class="wrap">
    <div class="sec-head reveal">
      {eyebrow("Why people start with LegalEase")}
      <h2 class="h-sec">What LegalEase helps you avoid.</h2>
    </div>
    <div class="why-grid">{items}</div>
  </div>
</section>
"""

# ---------- WHY LEGALEASE MATTERS (market proof, moved lower) ----------
def proof():
    cards = [
        ("$396B","U.S. legal services market","Grand View Research, 2024"),
        ("92%","of low-income civil legal problems receive no or insufficient help","Legal Services Corporation"),
        ("1 in 3","U.S. adults has a criminal record","NCSL"),
        ("$28.5B","alternative legal services provider market","Thomson Reuters, 2025"),
    ]
    items="".join(f"""<div class="metric reveal"><div class="num">{n}</div><div class="lab">{l}</div><div class="src">{s}</div></div>""" for n,l,s in cards)
    return f"""
<!-- WHY LEGALEASE MATTERS -->
<section class="proof section-pad" id="market">
  <div class="wrap">
    <div class="sec-head reveal" style="text-align:center;max-width:none;margin-bottom:clamp(34px,4vw,54px)">
      {eyebrow("Why LegalEase matters")}
      <h2 class="h-sec">The access gap is massive. The solution has to scale.</h2>
    </div>
    <div class="proof-grid">{items}</div>
    <p class="proof-src reveal">Sources: Grand View Research, Legal Services Corporation, NCSL, Thomson Reuters.</p>
  </div>
</section>
"""

# ---------- PROBLEM ----------
def problem():
    old=["Legal issue","Google search","Lawyer ads","Unclear cost","Delay, overpay, or give up"]
    new=["Guided intake","Smart triage","Document support","Guided next step","Secure tracking","Clear scope limits"]
    old_rows="".join(f'<div class="mrow"><span class="k">{i+1}. {t}</span></div>' for i,t in enumerate(old))
    new_rows="".join(f'<div class="mrow"><span class="k">{i+1}. {t}</span><span class="chip sky">guided</span></div>' for i,t in enumerate(new))
    return f"""
<!-- PROBLEM -->
<section class="section-pad bg-porcelain" id="problem">
  <div class="wrap">
    <div class="split">
      <div class="col-copy reveal">
        {eyebrow("The problem")}
        <h2 class="h-sec" style="margin:18px 0">Most people do not have a lawyer problem. They have a legal workflow problem.</h2>
        <p class="lede" style="margin-bottom:16px">When a legal issue is routine, people should not have to choose between paying thousands, giving up one-third of a recovery, or doing nothing. But that is how the system works today: confusing forms, opaque pricing, hourly billing, scattered rules, and no clear next step.</p>
        <p class="lede" style="margin-bottom:26px">LegalEase gives people a safer middle path: handle the legal tasks they can complete themselves, and know when a matter is out of scope for self-help.</p>
        <a class="btn btn-ghost" href="#workflow">See how LegalEase works</a>
      </div>
      <div class="col-visual reveal">
        <div class="frame"><span class="ph">old-path-vs-legalease-path</span>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="mock" style="box-shadow:none;background:#F2EEE6;border-color:#E2DCCD">
              <div class="mock-bar"><span class="mdot"></span><span class="t" style="color:#9a8f78">Old path</span></div>
              {old_rows.replace('mrow','mrow" style="background:#EAE4D6;color:#7a715f')}
            </div>
            <div class="mock">
              <div class="mock-bar"><span class="mdot o"></span><span class="t">LegalEase path</span></div>
              {new_rows}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
"""

# ---------- PLATFORM THESIS ----------
def platform():
    layers=[
        ("Plain-English intake","Converts confusing legal requirements into questions people can answer."),
        ("Scope check","Identifies whether a matter appears appropriate for self-help or falls outside what LegalEase covers."),
        ("Document &amp; case automation","Generates packets, checklists, claim materials, reports, or next-step instructions."),
        ("Guided completion","Shows users what to do, where to go, what to gather, and what happens next."),
        ("Secure case vault","Stores documents, progress, user inputs, and case status."),
        ("Partner dashboards","Gives organizations visibility into demand, progress, drop-off, and impact."),
    ]
    rows="".join(f"""<div class="layer reveal"><span class="lnum">{i+1:02d}</span><div class="lbody"><h4>{t}</h4><p>{d}</p></div><span class="ledge"><span class="sq"></span></span></div>""" for i,(t,d) in enumerate(layers))
    return f"""
<!-- PLATFORM (light) -->
<section class="section-pad bg-white" id="platform">
  <div class="wrap">
    <div class="sec-head reveal">
      {eyebrow("Built once")}
      <h2 class="h-sec">Built once. Useful across everyday legal problems.</h2>
      <p class="lede">LegalEase products share the same foundation: intake, scope checks, document support, secure storage, and guided next steps, for matters that are right for self-help.</p>
    </div>
    <div class="layers">{rows}</div>
  </div>
</section>
"""

print("part2 loaded")

# ---------- WORKFLOW ENGINE WIDE ----------
def workflow():
    steps=["Intake","Scope","Build","Guide","Track","Finish"]
    fsteps=""
    for i,s in enumerate(steps):
        fsteps+=f'<span class="fstep"><span class="b">{s}</span>{("<span class=arrow>&rarr;</span>" if i<len(steps)-1 else "")}</span>'
    inputs=["Record","Background check","Injury claim","Divorce"]
    outputs=["Filing packet","Record report","Demand package","Divorce checklist"]
    in_cards="".join(f'<div class="io-card"><span class="sq"></span>{t}</div>' for t in inputs)
    out_cards="".join(f'<div class="io-card">{t}</div>' for t in outputs)
    return f"""
<!-- WORKFLOW ENGINE -->
<section class="section-pad bg-cloud on-dark" id="workflow">
  <div class="wrap">
    <div class="flow-wide reveal frame">
      <span class="ph">workflow-engine-wide</span>
      <div style="text-align:center;max-width:60ch;margin-inline:auto;position:relative;z-index:2">
        <h2 class="h-sec" style="color:#fff">From issue to next step.</h2>
        <p class="lede" style="color:#aebbcb;margin-top:16px">Intake, scope checks, documents, guidance, and tracking. One system across multiple legal categories.</p>
      </div>
      <div class="flow-steps">{fsteps}</div>
      <div class="io-grid">
        <div class="io-col io-in"><span class="io-lab">Everyday legal issues</span>{in_cards}</div>
        <div class="io-engine"><img class="ic" src="assets/ic_skyline.png" alt=""><span class="t">Engine</span></div>
        <div class="io-col io-out"><span class="io-lab">Structured outputs</span>{out_cards}</div>
      </div>
    </div>
  </div>
</section>
"""

# ---------- PRODUCT ECOSYSTEM ----------
def eco_card(name, badge, badge_cls, head, body, wf, wf_label, cta, href, safe, accent, ph):
    wf_items="".join(f"<li>{w}</li>" for w in wf)
    # map product -> logo file stem (drop assets/logo-*.svg|png to replace text)
    logo_map={"RecordShield":"logo-recordshield","Claim Coach":"logo-claimcoach","StartApart":"logo-startapart"}
    if name in logo_map:
        name_html=product_logo(logo_map[name], name, accent)
    else:
        name_html=f'<span class="eco-name">{name}</span>'
    return f"""<div class="eco reveal frame" style="--accent:{accent}">
      <span class="ph">{ph}</span>
      <div class="eco-top">{name_html}<span class="eco-badge {badge_cls}">{badge}</span></div>
      <h3>{head}</h3>
      <p>{body}</p>
      <div class="eco-wf"><div class="wf-lab">{wf_label}</div><ul>{wf_items}</ul></div>
      <div class="eco-foot">
        <a class="eco-cta" href="{href}">{cta} &rarr;</a>
        <div class="eco-safe">{safe}</div>
      </div>
    </div>"""

def ecosystem():
    # Thin product-family band. The full selector and roadmap carry the detail;
    # this is a quick at-a-glance strip of the four products.
    row=[
        (product_logo("","Expungement.ai","var(--orange)"),"Clear eligible records","live","#expungement"),
        (product_logo("logo-recordshield","RecordShield","var(--skyline-deep)"),"Check a background report","beta","#waitlist"),
        (product_logo("logo-claimcoach","Claim Coach","var(--skyline-deep)"),"Organize an injury claim","beta","#waitlist"),
        (product_logo("logo-startapart","StartApart","var(--legal-blue)"),"Start a no-fault divorce","beta","#waitlist"),
    ]
    chips={"live":'<span class="eco-badge live">Live</span>',"beta":'<span class="eco-badge beta">Beta</span>'}
    items="".join(f"""<a class="pf-item reveal" href="{href}">
        <span class="pf-logo">{logo}</span>
        <span class="pf-line">{line}</span>
        {chips[status]}
      </a>""" for logo,line,status,href in row)
    return f"""
<!-- PRODUCT FAMILY BAND -->
<section class="pf-band" id="products">
  <div class="wrap">
    <div class="pf-head reveal">{eyebrow("The LegalEase family")}<span class="pf-sub">One platform, four routine legal problems.</span></div>
    <div class="pf-row">{items}</div>
  </div>
</section>
"""

print("part3 loaded")

# ---------- EXPUNGEMENT FLAGSHIP PROOF ----------
def expungement():
    bullets=["Free eligibility check","Flat $50 per case","Screening across all 50 states + DC","Court-ready self-help packets","Briefcase dashboard","Wilma plain-English guidance"]
    check='<svg class="feat-ck" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    feats="".join(f'<li class="feat-item">{check}<span>{b}</span></li>' for b in bullets)
    return f"""
<!-- EXPUNGEMENT FLAGSHIP -->
<section class="section-pad bg-white" id="expungement">
  <div class="wrap">
    <div class="flag-head">
      <div class="flag-head-l reveal">
        {eyebrow("Flagship product")}
        <img class="flag-logo" src="assets/logo-expungement.png" alt="Expungement.ai" width="922" height="170">
        <h2 class="h-sec flag-h" style="margin:14px 0 16px">Clear eligible records with guided self-help paperwork.</h2>
      </div>
      <div class="flag-head-r reveal">
        <p class="lede" style="margin-bottom:18px">Expungement.ai checks whether your record may qualify, prepares court-ready filing packets, and walks you through court-specific steps, for a flat fee.</p>
        <ul class="feat-list">{feats}</ul>
        <div class="cta-row" style="margin-top:22px;align-items:center;gap:18px">
          <a class="btn btn-primary" href="https://expungement.ai">Check eligibility free {arrow()}</a>
          <a class="link-cta" href="https://expungement.ai">See how it works</a>
        </div>
      </div>
    </div>
    <div class="flag-shot shot-shell reveal">
      <div class="shot-bar"><span class="sd"></span><span class="sd"></span><span class="sd"></span><span class="bt">Your Briefcase</span></div>
      <img class="shot-img" src="assets/shot-briefcase-dash.png" alt="Expungement.ai Briefcase dashboard showing matters in progress, next-step guidance, document status, and progress steppers." loading="lazy">
    </div>
  </div>
</section>
"""

# ---------- PARTNER OS ----------
def partners():
    ptypes=["Cities and counties","Workforce boards","Reentry organizations","Legal clinics","Community nonprofits","Employers","Foundations","National associations"]
    pt="".join(f'<span class="ptype">{p}</span>' for p in ptypes)
    return f"""
<!-- PARTNER OS -->
<section class="section-pad bg-porcelain" id="partners">
  <div class="wrap">
    <div class="split">
      <div class="col-copy reveal">
        {eyebrow("For partners")}
        <h2 class="h-sec" style="margin:18px 0">Give your community a clearer legal path.</h2>
        <p class="lede">LegalEase helps organizations launch guided tools for the people they serve, starting with record clearing and background-check readiness, with branded intake, product routing, dashboards, and impact reporting.</p>
        <div class="partner-types">{pt}</div>
        <div class="cta-row">
          <a class="btn btn-primary" href="#contact">Partner with us {arrow()}</a>
          <a class="btn btn-ghost" href="#contact">See partner models</a>
        </div>
      </div>
      <div class="col-visual reveal">
        {shot_slot("shot-partner", "partner-dashboard", '''<div class="mock dark">
            <div class="mock-bar"><span class="mdot o"></span><span class="mdot"></span><span class="mdot"></span><span class="t">Partner dashboard &middot; Sample</span></div>
            <div class="dash">
              <div class="dcell"><div class="dn">1,200</div><div class="dl">Screenings started</div></div>
              <div class="dcell"><div class="dn">860</div><div class="dl">Workflows completed</div></div>
              <div class="dcell"><div class="dn">3,400</div><div class="dl">Documents generated</div></div>
              <div class="dcell"><div class="dn">40</div><div class="dl">Out-of-scope flags</div></div>
              <div class="dcell wide"><div class="dl" style="margin:0">Impact report</div><span class="chip ready">Ready to export</span></div>
            </div>
          </div>''', dark=True)}
      </div>
    </div>
    <div class="pilot-strip reveal">
      <div class="pilot-models">
        <span class="pmodel">90-day pilot model</span>
        <span class="pmodel">Branded intake</span>
        <span class="pmodel">Workflow dashboard</span>
        <span class="pmodel">Impact report</span>
        <span class="pmodel">Community launch kit</span>
      </div>
    </div>
  </div>
</section>
"""

# ---------- RECORDSHIELD SPOTLIGHT ----------
def recordshield():
    return f"""
<!-- RECORDSHIELD -->
<section class="section-pad bg-white" id="recordshield">
  <div class="wrap">
    <div class="split rev flag-split">
      <div class="col-visual reveal">
        <div class="frame"><span class="ph">recordshield-report</span>
          <div class="mock">
            <div class="mock-bar"><span class="mdot o"></span><span class="t">RecordShield report</span></div>
            <div class="mrow"><span class="k">Possible criminal record</span><span class="chip info">Found</span></div>
            <div class="mrow"><span class="k">Case outcome</span><span class="chip blue">Dismissed</span></div>
            <div class="mrow"><span class="k">Reporting status</span><span class="chip info">Needs review</span></div>
            <div class="mrow"><span class="k">Possible next step</span><span class="chip sky">May be eligible</span></div>
            <div class="mrow"><span class="k">Expungement.ai pathway</span><span class="chip flag">Check clearing</span></div>
          </div>
        </div>
      </div>
      <div class="col-copy reveal">
        {eyebrow("RecordShield")}
        <h2 class="h-sec" style="margin:18px 0">People should see the record before the record speaks for them.</h2>
        <p class="lede" style="margin-bottom:24px">RecordShield helps people understand what may appear in a background check, identify records that may need review, and connect to next steps such as expungement, sealing, correction, or documentation.</p>
        <a class="btn btn-primary" href="#waitlist">Join the RecordShield beta {arrow()}</a>
        <p class="eco-safe" style="margin-top:18px">Employer and housing background reports can vary by screening company, package, and legal rules.</p>
      </div>
    </div>
  </div>
</section>
"""

print("part4 loaded")

# ---------- CLAIM COACH SPOTLIGHT ----------
def claimcoach():
    timeline=["Incident details","Medical treatment","Expenses","Lost wages","Demand package","Offer tracker","Scope check"]
    rows="".join(f'<div class="mrow"><span class="k">{i+1}. {t}</span></div>' for i,t in enumerate(timeline))
    return f"""
<!-- CLAIM COACH -->
<section class="section-pad bg-cloud on-dark" id="claimcoach">
  <div class="wrap">
    <div class="split">
      <div class="col-copy reveal">
        {eyebrow("Claim Coach")}
        <h2 class="h-sec" style="margin:18px 0;color:var(--legal-blue)">A flat-fee path for non-complex soft-tissue injury claims.</h2>
        <p class="lede" style="color:var(--muted);margin-bottom:16px">Claim Coach helps people organize their claim, understand the insurance process, prepare demand materials, track offers, and identify when the matter is too complex to handle alone.</p>
        <p class="lede" style="color:var(--orange-ink);font-weight:500;margin-bottom:26px">For routine claims, people should not automatically lose one-third of their recovery just to get organized.</p>
        <a class="btn btn-primary" href="#waitlist">Request Claim Coach access {arrow()}</a>
        <p class="eco-safe" style="margin-top:18px;color:#8a93a3">Claim Coach does not negotiate, represent users, provide legal advice, or guarantee settlement outcomes.</p>
      </div>
      <div class="col-visual reveal">
        <div class="frame on-dark"><span class="ph">claim-coach-dashboard</span>
          <div class="mock dark">
            <div class="mock-bar"><span class="mdot o"></span><span class="t">Claim timeline</span></div>
            {rows}
            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">
              <span class="chip flag">Liability disputed</span>
              <span class="chip flag">Surgery recommended</span>
              <span class="chip flag">Out of scope for self-help</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
"""

# ---------- STARTAPART SPOTLIGHT ----------
def startapart():
    steps=["Agreement check","Property and debt","Children and parenting, if applicable","Documents","Filing checklist","Court step","Final decree"]
    rows="".join(f'<div class="mrow"><span class="k">{t}</span><span class="chip sky">guided</span></div>' for t in steps)
    return f"""
<!-- STARTAPART -->
<section class="section-pad" id="startapart" style="background:linear-gradient(180deg,#FAF7F0,#EEF4F4)">
  <div class="wrap">
    <div class="split rev flag-split">
      <div class="col-visual reveal">
        <div class="frame"><span class="ph">startapart-workflow</span>
          <div class="mock" style="border-color:#cfe2e1">
            <div class="mock-bar" style="border-color:#dcebea"><span class="mdot o"></span><span class="t" style="color:#226f6a">StartApart workflow</span></div>
            {rows}
          </div>
        </div>
      </div>
      <div class="col-copy reveal">
        {eyebrow("StartApart")}
        <h2 class="h-sec" style="margin:18px 0">A calmer way through no-fault divorce.</h2>
        <p class="lede" style="margin-bottom:24px">When both people are aligned on the major issues, divorce should not require months of legal bills just to complete routine paperwork. StartApart helps eligible couples move through no-fault divorce with guided questions, document preparation, filing checklists, and progress tracking.</p>
        <a class="btn btn-primary" href="#waitlist">Request StartApart access {arrow()}</a>
        <p class="eco-safe" style="margin-top:18px">StartApart is for non-complex, uncontested no-fault divorce. Unsafe, contested, high-asset, or complex situations are outside what StartApart covers.</p>
      </div>
    </div>
  </div>
</section>
"""

# ---------- COMING NEXT (roadmap trio) ----------
def coming_next():
    cards=[
        ("RecordShield","Background-check visibility","See what may appear before a background check blocks the next opportunity.","#waitlist","logo-recordshield","var(--skyline-deep)"),
        ("Claim Coach","Non-complex soft-tissue claims","Organize records, prepare demand materials, and stay on top of every deadline.","#waitlist","logo-claimcoach","var(--orange)"),
        ("StartApart","Uncontested no-fault divorce","Move aligned couples through filing paperwork without unnecessary legal bills.","#waitlist","logo-startapart","var(--legal-blue)"),
    ]
    items=""
    for name,tag,desc,href,stem,accent in cards:
        items+=f"""<div class="next-card reveal">
          <div class="next-top">{product_logo(stem, name, accent)}<span class="eco-badge beta">Beta</span></div>
          <div class="next-tag">{tag}</div>
          <p>{desc}</p>
          <a class="eco-cta" href="{href}">Request beta access &rarr;</a>
        </div>"""
    return f"""
<!-- COMING NEXT -->
<section class="section-pad bg-white" id="roadmap">
  <div class="wrap">
    <div class="sec-head reveal">
      {eyebrow("Coming next")}
      <h2 class="h-sec">Starting with record clearing. Expanding to what comes next.</h2>
      <p class="lede">Expungement.ai is live today. RecordShield, Claim Coach, and StartApart are in beta for people facing the next set of routine legal problems.</p>
    </div>
    <div class="next-grid">{items}</div>
  </div>
</section>
"""

# ---------- HOW IT WORKS (operational proof) ----------
def how_it_works():
    steps=[
        ("01","Tell us what happened","Answer plain-English questions about your situation, no legal jargon."),
        ("02","Run the scope check","LegalEase checks whether the matter fits a supported, non-complex self-help path."),
        ("03","Follow guided next steps","Get documents, checklists, reports, or claim materials, depending on the product."),
        ("04","Stay inside a clear path","If the matter fits, LegalEase keeps you organized from start to finish. If it does not fit, the product stops."),
    ]
    rows=""
    for n,t,d in steps:
        rows+=f"""<div class="op-step reveal"><span class="op-n">{n}</span><div class="op-body"><h4>{t}</h4><p>{d}</p></div></div>"""
    return f"""
<!-- HOW IT WORKS -->
<section class="section-pad bg-porcelain" id="how">
  <div class="wrap">
    <div class="sec-head reveal">
      {eyebrow("How it works")}
      <h2 class="h-sec">Start with clarity. Continue only when it fits.</h2>
      <p class="lede">From the first question to a clear next step, with guided support the whole way through a supported matter.</p>
    </div>
    <div class="gpath reveal" id="gpath" aria-label="The guided path: intake, scope check, documents, guidance, tracking, done">
      <svg viewBox="0 0 880 150" xmlns="http://www.w3.org/2000/svg" role="img">
        <path class="gp-line" id="gpLine" d="M60 70 H820"/>
        <circle class="gp-spark"><animateMotion dur="2.4s" begin="indefinite" fill="freeze"><mpath href="#gpLine"/></animateMotion></circle>
        <g class="gp-node"><rect x="48" y="58" width="24" height="24" rx="6" fill="#F04800"/></g>
        <g class="gp-node"><circle cx="212" cy="70" r="11" fill="#18186C"/></g>
        <g class="gp-node"><circle cx="364" cy="70" r="11" fill="#18186C"/></g>
        <g class="gp-node"><circle cx="516" cy="70" r="11" fill="#18186C"/></g>
        <g class="gp-node"><circle cx="668" cy="70" r="11" fill="#18186C"/></g>
        <g class="gp-node"><rect x="800" y="58" width="24" height="24" rx="6" fill="#1F8F88"/></g>
        <text class="gp-label" x="60" y="108">Intake</text>
        <text class="gp-label" x="212" y="108">Scope check</text>
        <text class="gp-label" x="364" y="108">Documents</text>
        <text class="gp-label" x="516" y="108">Guidance</text>
        <text class="gp-label" x="668" y="108">Tracking</text>
        <text class="gp-label" x="812" y="108">Done</text>
      </svg>
    </div>
    <div class="op-flow four">{rows}</div>
  </div>
</section>
"""

# ---------- MEET WILMA ----------
def meet_wilma():
    return f"""
<!-- MEET WILMA -->
<section class="wilma section-pad" id="wilma">
  <div class="wrap">
    <div class="wilma-grid">
      <div class="wilma-portrait reveal">
        <div class="wilma-glow"></div>
        <img class="wilma-float" src="assets/wilma-portrait.png" alt="Wilma, the LegalEase guide: a friendly headset-wearing character in a dark suit and orange tie." loading="lazy">
        <span class="wilma-badge"><span class="wb-dot"></span>Online</span>
      </div>
      <div class="wilma-copy reveal">
        {eyebrow("Your guide across LegalEase")}
        <h2 class="h-sec">Meet Wilma, your LegalEase guide.</h2>
        <p class="lede">Wilma explains confusing steps, translates legal terms, and points you back to your checklist across every LegalEase tool. She does not replace a lawyer or promise a court outcome. She helps you understand what to do next.</p>
        <div class="wilma-chat" id="wilmaChat">
          <div class="wc-row user" data-msg="0"><span class="wc-who">You</span><div class="wc-bubble">What does &ldquo;file with the court&rdquo; mean?</div></div>
          <div class="wc-row bot wc-typing" data-msg="1"><img class="wc-avatar" src="assets/wilma.png" alt=""><div class="wc-bubble bot"><span class="wc-dots"><span></span><span></span><span></span></span></div></div>
          <div class="wc-row bot" data-msg="2"><img class="wc-avatar" src="assets/wilma.png" alt=""><div class="wc-bubble bot"><span class="wc-who">Wilma</span>It means submitting your completed packet to the court that handled your case. Your checklist shows the court address, what documents to include, and whether a filing fee or fee waiver may apply.</div></div>
        </div>
        <p class="wilma-note">Wilma provides general self-help guidance, not legal advice.</p>
      </div>
    </div>
  </div>
</section>
"""

# ---------- TRUST (guardrail flow: illustration + live text overlay) ----------
def trust():
    # x-centers of the 5 top cards (percent), measured from the illustration
    tops = [
        (9.7,  "Your situation", "Record, claim, divorce, or background question"),
        (29.3, "Complexity", "Is the matter straightforward, or does it have tangled facts?"),
        (48.7, "Risk", "Are the stakes low, or is there real exposure?"),
        (68.1, "Contest", "Is everyone aligned, or is the matter disputed?"),
        (87.6, "Fit", "Is this a supported self-help task, or out of scope?"),
    ]
    top_labels = "".join(
        f'<div class="gfo-card" style="left:{x}%"><span class="gfo-t">{t}</span><span class="gfo-s">{s}</span></div>'
        for x,t,s in tops
    )
    return f"""
<!-- GUARDRAILS -->
<section class="section-pad bg-porcelain guardflow" id="security">
  <div class="wrap">
    <div class="sec-head reveal" style="text-align:center;max-width:none;margin-bottom:clamp(26px,3vw,42px)">
      {eyebrow("Built with guardrails")}
      <h2 class="h-sec">Every matter hits the same question: does this <span class="accent">need</span> a lawyer?</h2>
      <p class="lede" style="margin-left:auto;margin-right:auto;max-width:680px">LegalEase only moves forward when a matter is genuinely right for self-help. Every case runs through the same checkpoint, and anything too complex, risky, or contested is flagged as out of scope instead.</p>
    </div>

    <div class="gf-overlay reveal" aria-label="How LegalEase decides whether a matter is right for self-help">
      <img class="gf-bg" src="assets/guardrails-flow.png" alt="" loading="lazy">
      <!-- step labels over the top cards -->
      {top_labels}
      <!-- outcome card labels -->
      <div class="gfo-out gfo-self">
        <span class="gfo-badge ok">Right for self-help</span>
        <span class="gfo-out-t">LegalEase guides you</span>
        <span class="gfo-out-s">Guided tools, prepared documents, and filing steps for routine matters.</span>
      </div>
      <div class="gfo-out gfo-esc">
        <span class="gfo-badge esc">Needs a lawyer</span>
        <span class="gfo-out-t">Out of scope for self-help</span>
        <span class="gfo-out-s">Complex, risky, or contested matters fall outside what LegalEase covers.</span>
      </div>
    </div>

    <p class="gf-foot reveal">Self-help tools and general information, not legal advice or representation. You always control whether to continue.</p>
  </div>
</section>
"""

print("part5 loaded")

# ---------- BUSINESS MODEL / FLYWHEEL ----------
def model():
    revs=[
        ("B2C flat-fee workflows","Consumers pay transparent fees for eligible workflows, packets, reports, claim tools, or filing guidance."),
        ("Partner pilots","Organizations pay to launch guided legal-access workflows, branded intake, dashboards, and impact reporting."),
        ("Employer &amp; workforce channels","Employers and workforce programs can offer LegalEase tools as participant or employee support."),
        ("Clear scope limits","Complex matters are identified as out of scope, so users know when self-help is not the right path."),
    ]
    rc="".join(f'<div class="rev"><h4>{t}</h4><p>{d}</p></div>' for t,d in revs)
    fw=["Launch category wedge","Acquire consumer demand","Build state/category logic","Launch partner workflows","Measure completion and drop-off","Improve triage","Expand to adjacent category"]
    fws="".join(f'<div class="fw-step"><span class="fn">{i+1:02d}</span><span class="ft">{t}</span></div>' for i,t in enumerate(fw))
    return f"""
<!-- BUSINESS MODEL -->
<section class="section-pad bg-white" id="vision">
  <div class="wrap">
    <div class="sec-head reveal">
      {eyebrow("Why this scales")}
      <h2 class="h-sec">One platform. Multiple markets. Shared infrastructure.</h2>
      <p class="lede">Each LegalEase product targets a high-volume, document-heavy, emotionally stressful legal problem where the traditional service model is too expensive for routine cases. The same capabilities (intake, triage, document automation, guidance, secure storage, and reporting) can be reused across categories.</p>
    </div>
    <div class="model-grid">
      <div class="rev-cards reveal">{rc}</div>
      <div class="flywheel reveal frame"><span class="ph">legalease-flywheel</span>
        <div class="fw-lab">The LegalEase flywheel</div>
        {fws}
      </div>
    </div>
  </div>
</section>
"""

# ---------- FOUNDERS ----------
def founders():
    story = '''The law can give someone a second chance. The system can still keep it out of reach.

That contradiction is why LegalEase exists.

For Lawrence Blackmon, it started before the titles, before attorney, before state representative, before founder. It started when a dismissed case still sat on his public record and made him pay thousands to move forward with his life.

For Roger Roman, it became clear when he looked at the numbers. This was not a small administrative headache. This was a national access-to-justice failure hiding in plain sight.

Millions of people are facing routine legal problems that are too expensive for traditional legal services and too confusing to handle alone. LegalEase was built for them.

We are not here to replace lawyers. Lawyers are essential when the stakes are high, the facts are complex, or the risks are real.

We are here for the everyday legal moments where people need a guided path, not a blank check.

A clearer record. A better understanding of a background check. A simple claim organized correctly. An uncontested divorce handled with dignity. A community program that can actually move people from need to next step.

LegalEase turns everyday legal problems into guided self-help tools, plain English, secure, affordable, and built with clear limits from the start.

Because people do not need more legalese.

They need a way forward.'''
    story_html = "".join(f"<p>{para.strip()}</p>" for para in story.split("\n\n"))
    return f"""
<!-- FOUNDERS -->
<section class="section-pad bg-porcelain" id="company">
  <div class="wrap">
    <div class="founders">
      <div class="reveal">
        <div class="founder-photo frame">
          {photo_slot("photo-founders", "LegalEase founders Lawrence Blackmon and Roger Roman", '''<span class="ph">founders-editorial</span>
          <img class="pathmark" src="assets/ic_skyline.png" alt="" style="width:60%;margin:auto;position:absolute;inset:0;opacity:.16">
          <div style="position:relative;z-index:2;font-family:var(--mono);font-size:12px;color:var(--skyline);letter-spacing:.08em">Blackmon &amp; Roman</div>''')}
        </div>
      </div>
      <div class="col-copy reveal">
        {eyebrow("Founder story")}
        <h2 class="h-sec" style="margin:18px 0">Built by people who understand the cost of legal friction.</h2>
        <p class="lede">LegalEase was born from a simple belief: solving a basic legal task should not force people to overpay, delay, or give up. By combining legal experience, public-policy insight, product building, and investment discipline, the team is building a clearer path through everyday legal problems.</p>
        <div class="founder-cards">
          <div class="fcard"><div class="fn-name">Lawrence Blackmon</div><div class="fn-role">Attorney, state legislator, and LegalEase co-founder. Lawrence brings legal expertise and public-policy experience to the mission of making everyday legal help more accessible, affordable, and understandable.</div></div>
          <div class="fcard"><div class="fn-name">Roger Roman</div><div class="fn-role">Builder, investor, and LegalEase co-founder. Roger brings product vision, company-building experience, and an investor&rsquo;s eye for turning overlooked problems into scalable technology.</div></div>
        </div>
        <div style="margin-top:26px"><button class="btn btn-ghost" id="storyToggle" aria-expanded="false" aria-controls="founderStory">Read the story</button></div>
        <div class="founder-story" id="founderStory" hidden>{story_html}</div>
      </div>
    </div>
  </div>
</section>
"""

# ---------- CTA BAND ----------
def band():
    return f"""
<!-- CTA BAND -->
<section class="section-pad bg-white" id="contact">
  <div class="wrap">
    <div class="sec-head reveal" style="text-align:center;max-width:none;margin-bottom:clamp(28px,3.4vw,44px)">
      {eyebrow("Where to next")}
      <h2 class="h-sec">Find the path that fits you.</h2>
    </div>
    <div class="band">
      <div class="band-card beta reveal" id="waitlist">
        <div class="bc-top">
          {eyebrow("Join a beta")}
          <h3>Be first to use the next tools.</h3>
          <p>Expungement.ai is live today. RecordShield, Claim Coach, and StartApart are in beta. Add your email and we&rsquo;ll reach out when your matter type opens.</p>
        </div>
        <a class="btn btn-primary" href="mailto:hello@legalease.com?subject=Beta%20access">Request beta access {arrow()}</a>
      </div>
      <div class="band-card partners reveal">
        <div class="bc-top">
          {eyebrow("For partners")}
          <h3>Launch a guided legal-access program.</h3>
          <p>Give your community a clear path through everyday legal problems with branded intake, guided tools, dashboards, and reporting.</p>
        </div>
        <a class="btn btn-primary" href="mailto:partners@legalease.com">Partner with us {arrow()}</a>
      </div>
      <div class="band-card investors reveal" id="investors">
        <div class="bc-top">
          {eyebrow("For investors")}
          <h3>Interested in the platform behind the products?</h3>
          <p>LegalEase is building reusable infrastructure across high-volume legal categories. We&rsquo;re happy to share more.</p>
        </div>
        <a class="btn btn-ghost" href="mailto:investors@legalease.com">Investor inquiries {arrow()}</a>
      </div>
    </div>
  </div>
</section>
"""

print("part6 loaded")

# ---------- FAQ ----------
def faq():
    cats={
      "Company":[
        ("Is LegalEase a law firm?","No. LegalEase is a legal technology company. We provide guided self-help workflows, general information, document support, organization tools, and filing guidance. We do not provide legal advice, represent users, or guarantee outcomes."),
        ("Are you replacing lawyers?","No. LegalEase is built for non-complex legal workflows where people are already trying to help themselves. Complex, contested, risky, or high-stakes matters are outside what LegalEase supports. When a matter falls outside scope, the product stops and explains that LegalEase cannot support that path."),
        ("Why is LegalEase expanding beyond expungement?","Many routine legal tasks share the same friction: confusing intake, unclear forms, missing next steps, and high costs. LegalEase uses the same guided foundation across different product areas while keeping clear limits on what each tool supports."),
      ],
      "Products":[
        ("What makes LegalEase different from a legal chatbot?","LegalEase is workflow-first. We do not simply answer open-ended legal questions. We guide users through defined, bounded legal tasks with structured intake, status tracking, document support, and clear scope limits."),
        ("What products are part of LegalEase?","LegalEase includes Expungement.ai, the flagship record-clearing product, plus beta products RecordShield, Claim Coach, and StartApart."),
        ("Who are LegalEase partners?","LegalEase is designed for cities, counties, workforce boards, reentry organizations, legal clinics, nonprofits, employers, foundations, and national associations."),
      ],
      "Legal boundaries":[
        ("What issues are not appropriate for LegalEase?","Matters involving serious injury, contested disputes, domestic violence, criminal defense representation, complex assets, custody conflict, immigration consequences, or urgent court deadlines fall outside what LegalEase covers and should be handled by a licensed professional."),
        ("How does LegalEase protect sensitive information?","LegalEase is designed around minimal collection, clear privacy practices, secure storage, and user control. Sensitive legal information should never be treated casually."),
      ],
    }
    tabs="".join(f'<button class="faq-tab" role="tab" data-cat="{c}" aria-selected="{"true" if i==0 else "false"}">{c}</button>' for i,c in enumerate(cats))
    groups=""
    for i,(c,items) in enumerate(cats.items()):
        rows=""
        for q,a in items:
            rows+=f'<details class="faq-item"><summary class="faq-q">{q}<span class="ico"></span></summary><div class="faq-a">{a}</div></details>'
        groups+=f'<div class="faq-cat {"active" if i==0 else ""}" data-cat="{c}"><div class="faq-list">{rows}</div></div>'
    return f"""
<!-- FAQ -->
<section class="section-pad bg-porcelain" id="faq">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:30px">
      {eyebrow("Questions")}
      <h2 class="h-sec">Questions about LegalEase.</h2>
    </div>
    <div class="faq-head" role="tablist" aria-label="FAQ categories">{tabs}</div>
    <div class="reveal">{groups}</div>
  </div>
</section>
"""

# ---------- FINAL CTA ----------
def final():
    return f"""
<!-- FINAL CTA -->
<section class="final section-pad" id="final">
  <div class="wrap">
    <h2>Legal help should be clearer, safer, and more affordable.</h2>
    <p>LegalEase gives people a guided middle path through routine legal problems, so they don&rsquo;t have to overpay, delay, or give up.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#roadmap">Find the right tool {arrow()}</a>
      <a class="btn btn-ghost" href="#contact">Partner with us</a>
      <a class="btn btn-ghost-teal" href="#investors">Investor inquiries</a>
    </div>
    <p class="micro">Built for non-complex legal matters, with clear limits on what self-help covers.</p>
  </div>
</section>
"""

print("part7 loaded")

# ---------- FOOTER ----------
def footer():
    cols={
      "Company":["About LegalEase","Founder story","Press","Careers","Contact"],
      "Platform":["How it works","Security","Legal boundaries","Partner dashboards","Impact reporting"],
      "Products":["Expungement.ai","RecordShield","Claim Coach","StartApart"],
      "Partners":["Partner program","Workforce and reentry","Cities and counties","Nonprofits and clinics","Employers","Foundations"],
      "Legal":["Privacy policy","Terms of service","Disclaimer","Accessibility","Data request"],
    }
    colhtml=""
    for h,links in cols.items():
        ls="".join(f'<a href="#">{l}</a>' for l in links)
        colhtml+=f'<div class="fcol"><h5>{h}</h5>{ls}</div>'
    return f"""
<!-- FOOTER -->
<footer class="footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="f-brand">
        <img src="assets/wm_white.png" alt="LegalEase">
        <p>The self-help platform for everyday legal problems. Guided, affordable, secure workflows for legal problems that should not require a blank check.</p>
      </div>
      {colhtml}
    </div>
    <p class="footer-disc">LegalEase is not a law firm and does not provide legal advice, legal representation, or court filing services unless expressly stated through a licensed partner. LegalEase provides self-help tools, general information, document automation, organization workflows, and filing guidance for non-complex legal issues. Using LegalEase does not create an attorney-client relationship. Complex legal matters should be reviewed by a licensed attorney.</p>
    <div class="footer-base">
      <span>&copy; 2026 LegalEase. All rights reserved.</span>
      <span>Not a law firm &middot; Not legal advice</span>
    </div>
  </div>
</footer>
"""

def spine():
    return """
<div class="spine" aria-hidden="true"><div class="track"></div><div class="fill" id="spineFill"></div></div>
<div class="spine-node-host" aria-hidden="true"><span class="node" id="spineNode" style="top:-40px"></span></div>
"""

def sticky():
    return f"""
<div class="sticky-cta" id="stickyCta"><a class="btn btn-primary" href="#roadmap">Find the right tool {arrow()}</a></div>
"""

SCRIPT = """
<script src="app.js"></script>
</body>
</html>
"""

# ---------- ASSEMBLE ----------
# Customer-first order (~60% customer / 25% partner / 15% investor).
# Stashed (defined above, not called on the homepage): recordshield(),
# claimcoach(), startapart() full spotlights, and model() flywheel - these
# belong on dedicated product pages and the /investors page respectively.
html = HEAD + header() + mobile_menu() + spine() \
    + hero() + trust_strip() + how_it_works() + expungement() \
    + meet_wilma() + why_use() + coming_next() + partners() \
    + platform() + founders() + proof() + band() + faq() + final() \
    + footer() + sticky() + SCRIPT

open('index.html','w').write(html)
print("index.html written, chars:", len(html))
