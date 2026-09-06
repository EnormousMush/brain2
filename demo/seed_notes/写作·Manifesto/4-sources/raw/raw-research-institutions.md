# Research Notes: Four Institutional Cases

Every figure below is followed by the source I actually read. Items I could not verify are marked **[unverified]**.

---

## 1. BELL LABS (1925–)

**Founded**
- **Jan 1, 1925**, as *Bell Telephone Laboratories, Inc.* Initial staff 3,600. ([Wikipedia: Bell Labs](https://en.wikipedia.org/wiki/Bell_Labs))
- **Legal form**: a separate corporation jointly owned 50/50 by **AT&T and Western Electric** — i.e., a captive R&D subsidiary of a regulated monopoly, not a division. Frank Jewett as first president **[unverified — I did not read a source confirming this]**.
- Funding mechanism: I could **not** verify the often-repeated "1% of AT&T revenue license contract." What I *can* verify: Bell's R&D spending was stable at **~0.5% of operating revenue, 1949–1960** ([Watzinger, Fackler, Nagler & Schnitzer, working paper PDF](http://www.monika-schnitzer.com/uploads/4/9/4/1/49415675/watzinger_etal_0219.pdf)).

**The bottleneck**
> A researcher could spend a decade on solid-state physics with no product, no proposal, and no customer, because the cost was a rounding error against a rate-regulated monopoly's revenue and any resulting penny-per-unit improvement was multiplied across ~83% of US telephones.

(Scale figure: by 1939 AT&T controlled 83% of US telephones, 98% of long-distance wire, 100% of intercontinental radiotelephone — [Construction Physics, "What Would It Take to Recreate Bell Labs?"](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell))

**Funding — and how it was insulated**
- Source: internal, from monopoly operating revenue via Western Electric/AT&T. No external grants, no proposal cycle.
- Insulation mechanism was **regulatory, not philanthropic**: rate-of-return regulation let R&D be recovered in the rate base, and there was no competitor who could free-ride a discovery fast enough to make patience irrational. This is exactly Odlyzko's argument (below).
- Scale: late 1970s ~25,000 total employees, of whom ~**1,300 were researchers** (researchers were only 10–20% of headcount throughout its history) ([Construction Physics](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell)).

**Governance**
- Problem selection: substantially bottom-up within research; HHMI's own review of the model records Bell Labs research groups of **1–2 scientists plus a leader**, all internally funded, "emphasis on difficult problems over publication metrics," and average group-leader age of **37 (1968) and 36.5 (1988)** ([HHMI Janelia Farm Program Development Report, PDF](https://www.janelia.org/sites/default/files/About%20Us/JFRC.pdf)).
- **No tenure. The weakest ~10% were encouraged to leave annually** (same source). Failure was handled by internal transfer to development/Western Electric rather than exit from the firm — soft landing inside a million-person company.

**SCOPE — broad, and how breadth was made real**
- Broad by construction: physics, chemistry, metallurgy, math, psychology (Shannon's information theory 1948, transistor 1947, solar cell 1954, laser 1958, CCD 1969, Unix 1969, C 1972 — [Wikipedia](https://en.wikipedia.org/wiki/Bell_Labs)). 11 Nobel Prizes.
- What made it cross-disciplinary rather than co-located: **a single concrete artifact — the telephone network — that every discipline was pointed at.** Breadth was disciplined by a shared engineering object, not by a shared abstraction. Physics of semiconductors, math of channel capacity, and psychology of speech perception all bottomed out in the same system. This is the key contrast with SFI (below), which has breadth without a shared artifact.
- Secondary mechanism, verified: the collapse of the physical-sciences group is described by insiders precisely in adjacency terms — Philip Platzman: *"What do I get when I have a nice idea about fiber optics? There's practically no one down the hall to talk to."* ([Physics Today, Oct 2001](https://pubs.aip.org/physicstoday/article/54/10/26/935299/Bell-Labs-Research-Regroups-as-Parent-Lucent))

**Verdict: worked, then declined. Structural reason: the rent disappeared.**

Timeline of the structural kill, all verified:
| Date | Event | Effect |
|---|---|---|
| Jan 24, 1956 | Consent decree: **7,820 patents** (1.3% of all unexpired US patents, 266 tech classes) licensed **royalty-free**; AT&T **barred from any business other than telecom** | Killed Bell's ability to monetize non-telecom inventions; raised outside innovation +20% in non-telecom fields, 60% of it from young/small firms, ~$5.8B value; **zero** effect in telecom equipment ([Watzinger et al.](http://www.monika-schnitzer.com/uploads/4/9/4/1/49415675/watzinger_etal_0219.pdf)) |
| Jan 8, 1982 | Modification of Final Judgment finalized | RBOCs get the Bell trademark and **half of Bell Labs** (→ Bellcore) ([Wikipedia: Breakup of the Bell System](https://en.wikipedia.org/wiki/Breakup_of_the_Bell_System)) |
| Jan 1, 1984 | Divestiture effective | AT&T book value cut ~70%; Bell Labs becomes subsidiary of AT&T Technologies, "resulted in a drastic decline in its funding" ([Wikipedia](https://en.wikipedia.org/wiki/Bell_Labs)) |
| 1996 | Lucent spinoff | AT&T had ~1M employees at end of 1970s; **Lucent had 140,000 at formation, 35,000 by 2002** ([Construction Physics](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell)) |
| 2000–01 | Agere spinoff; telecom crash | Researchers **~1,200 (1999) → ~600 (2001)**; physical-sciences basic research **300–400 (late 1970s) → ~110 (late 1990s) → ~60 (2001)** ([Physics Today, Oct 2001](https://pubs.aip.org/physicstoday/article/54/10/26/935299/Bell-Labs-Research-Regroups-as-Parent-Lucent)) |
| 2002 | | ~500 researchers ([Construction Physics](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell)) |
| Aug 2008 | *Nature*, "Bell Labs bottoms out" (Geoff Brumfiel, Aug 20 2008) | **Four scientists left in the fundamental physics department** at Murray Hill; Alcatel-Lucent VP Gee Rittenhouse: "We've shifted the fundamental research over to include mathematics, computer science, networking, and wireless" ([Laser Focus World, Aug 29 2008](https://www.laserfocusworld.com/test-measurement/research/article/16563322/staff-says-bell-labs-has-ended-basic-physics-research)) |
| 2016 | Nokia acquires Alcatel-Lucent | ~750 employees at Nokia Bell Labs today ([Construction Physics](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell)) |

**Did the golden age depend on a monopoly rent that no longer exists anywhere?** Two verified positions, and they disagree:
- **Yes (Construction Physics / Brian Potter)**: "Bell Labs was made possible by a large-scale, vertically integrated telephone monopoly," conditions "highly historically contingent and not the sort of thing that could be deliberately recreated."
- **Not exactly (Odlyzko, "The Decline of Unfettered Research," 1995)**: the cause was not management myopia or Cold War cuts but **the compression of the imitation lag**. Xerography: invented by Carlson 1937, commercialized by Xerox 1950, with "hardly any activity by other institutions" in between. High-Tc superconductivity announced 1987: "it took only a few weeks for groups at University of Houston, University of Alabama, Bell Labs, and other places to make important further discoveries." Once rivals catch up in weeks, unfettered research is irrational *even for a monopolist*. ([full text](https://www-users.cse.umn.edu/~odlyzko/doc/decline.txt))
- **The sharpest reading**: the 1956 decree already severed Bell Labs' ability to appropriate returns outside telecom — and Bell Labs' most productive decades came *after* it. That is strong evidence the operative input was **stable, unappropriable, non-evaluated funding**, not appropriability. The 1984/1996 events removed the *stability*, not the *appropriability*. Monopoly was the funding mechanism, not the causal ingredient.

**Counterfactual**: the transistor (1947) and information theory (1948) would not have arrived where and when they did; the specific coupling of solid-state physics to a switching-network problem existed nowhere else at that scale.

---

## 2. DARPA (1958–)

**Founded**
- **Feb 7, 1958**, by Eisenhower, via Public Law 85-325 and **DoD Directive 5105.15**. Originally ARPA; → DARPA March 1972; → ARPA Feb 1993; → DARPA March 1996. Initial appropriation **$520M (1958)**. ([Wikipedia: DARPA](https://en.wikipedia.org/wiki/DARPA))
- Legal form: a DoD agency reporting to the Secretary/Under Secretary of Defense — deliberately *outside* the service labs.

**The bottleneck**
> A single technically-credentialed individual could commit hundreds of millions of dollars to a program that no service branch had requested, and kill it, without going through a peer-review panel or owning a laboratory that would lobby to keep it alive.

**Funding**
- Source: DoD appropriations. **FY2026 enacted $4.322B; FY2027 request $5.039B** ([darpa.mil/about](https://www.darpa.mil/about)). Earlier baseline: "~$3 billion for extramural research overseen by roughly 100 program managers" ([Azoulay, Fuchs, Goldstein & Kearney, *Promises and Challenges of the "ARPA Model"*, MIT Sloan PDF](https://mitsloan.mit.edu/shared/ods/documents?DocumentID=5173)); Bonvillian/Ranka give "over $3 billion each year" ([open-access chapter](https://books.openbookpublishers.com/10.11647/obp.0184/ch10.xhtml)).
- **Insulation from short-term evaluation** works differently than at Bell Labs — DARPA is *intensely* evaluated, on milestones, and kills programs constantly. What is insulated is not the *project* but the *decision right*: the PM is not evaluated by peer review, and the PM's own tenure is bounded so their career does not depend on the program's survival. **Term limits are the insulation mechanism.** A PM who leaves in 4 years has no incentive to protect a dying program.

**Governance**
- **Who picks problems**: the PM writes the program, tested against the **Heilmeier Catechism**; approval by Office Director then the DARPA Director. "After a program is approved by the DARPA director, the program manager is given a significant amount of control" ([Ranka chapter](https://books.openbookpublishers.com/10.11647/obp.0184/ch10.xhtml)). Applicants for PM jobs are literally asked to submit a program proposal with their résumé ([darpa.mil/careers/program-manager](https://www.darpa.mil/careers/program-manager)).
- **Term structure**: DARPA's own careers page states a **two-year term, extendable to four**. Independent studies report **typical tenure 3–5 years** ([Cheney, *Personnel Systems of DARPA and ARPA-E*, PDF](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf); Azoulay et al.; Ranka). Treat "2 years nominal / 3–5 actual" as the accurate picture.
- **Hiring authorities** (this is the load-bearing detail most copies miss): **IPA Mobility Program** (1970) — 2 years extendable to 4, home institution keeps them on payroll; **Section 1101 authority** — established 1998, made permanent 2017, direct-hire of scientific/technical personnel on limited-term appointments **up to six years**, exempt from standard civil-service rules and pay caps ([Cheney](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf)).
- **No in-house labs** — explicit: *"The PMs do not conduct research themselves. DARPA has no laboratories of its own."* All work is done by external performers ([Cheney](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf)).
- **Staffing**: ~220 government employees, ~100 PMs, ~250 programs across six technical offices ([Wikipedia](https://en.wikipedia.org/wiki/DARPA)); Cheney breaks this into ~100 term-limited PMs/executives + ~100 career administrative staff + several hundred SETA contractors.
- **What happens to people who fail**: PMs are expected to *propose to end* their own failing programs; this "is not considered failure but rather part of DARPA's learning process." Post-term, PMs return to home institutions, often to higher-level positions; many become research-center directors; some return to DARPA ([Cheney](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf)). **The exit ramp is the discipline device**: DARPA service is a career accelerant, so PMs can afford to kill things.

**SCOPE — broad, but breadth is time-sliced, not simultaneous**
- Six offices spanning biology, microsystems, information, tactical systems. But DARPA does **not** solve the breadth problem by putting a biologist next to a physicist. It solves it by making the **unit of organization a program, not a discipline** — the PM assembles whatever mix of universities and firms the problem requires and disbands the assembly when the program ends. Cross-disciplinarity is **contractual and temporary**, not architectural.
- This is the cheapest known solution to the breadth problem and the one most transferable.

**Verdict: worked. Structural reason: term-limited individual decision rights + no owned labs + a buyer.**

**The clone critique — why ARPA-E/ARPA-H/ARIA underperform**
1. **No operational customer.** DARPA historian Sharon Weinberger: *"They have a customer with the deepest pockets in the world."* DoD's ~$190B/yr research and procurement budget means a successful prototype has a buyer who will scale it. Energy, health and civilian agencies have no equivalent procurement arm. ([*Nature* editorial, Mar 11, 2020](https://www.nature.com/articles/d[phone]))
2. **Scale mismatch.** UK's proposed ARPA: **£800M ($1B) over 5 years** vs DARPA's ~$3.5B *per year* (same *Nature* editorial).
3. **Political precarity.** ARPA-E has faced "constant threat of being eliminated" (same source) — which destroys the long horizon the model needs.
4. **Bundle, not menu.** Azoulay/Fuchs/Goldstein/Kearney: the ARPA elements are **complementary practices** — organizational flexibility, bottom-up program design, discretionary project selection, active management — and adopting any subset "would be less effective than implementing them all together." They also warn "one size does not fit all" across technical domains ([MIT Sloan PDF](https://mitsloan.mit.edu/shared/ods/documents?DocumentID=5173)).
5. **No alumni network / no career premium.** Cheney is blunt: ARPA-E lacks *"DARPA's history, broad political support, traditions, culture or alumni network."* ARPA-E program directors serve **3-year renewable terms**; there were **~16 of them as of Feb 2019**; technical support outsourced (Booz Allen, **$73M** five-year contract). ARPA-E authorized 2007, first funded 2009. ([Cheney](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf))
6. Note the counter-evidence: NASEM's 2017 assessment found *"Six years into its existence there are clear indications that ARPA-E is making progress toward its statutory mission and goals"* ([Report Highlights PDF](https://nap.nationalacademies.org/resource/24778/ReportHighlights_ARPA-E.pdf)). So "clones mostly fail" is overstated as of that review — the fair claim is that clones fail to reproduce DARPA's *transition-to-deployment*, not its research quality.

**Counterfactual**: ARPANET (and therefore the Internet's packet-switched architecture on that timeline); satellite geolocation via TRANSIT/GPS lineage; stealth ([Wikipedia](https://en.wikipedia.org/wiki/DARPA)).

---

## 3. SANTA FE INSTITUTE (1984–) — the core case

### Founded
- **1984**. Founders: **George Cowan, David Pines, Stirling Colgate, Murray Gell-Mann, Nick Metropolis, Herb Anderson, Peter A. Carruthers, Richard Slansky.** All except Pines and Gell-Mann were **Los Alamos** scientists. Originally named the **Rio Grande Institute**. ([Wikipedia: Santa Fe Institute](https://en.wikipedia.org/wiki/Santa_Fe_Institute))
- **Legal form**: independent 501(c)(3) nonprofit theoretical research institute, EIN **[phone]** ([ProPublica Nonprofit Explorer](https://projects.propublica.org/nonprofits/organizations/850325494)). Not a university, no degree-granting authority, no departments.
- Stated founding purpose: "a forum to conduct theoretical research outside the traditional disciplinary boundaries of academic departments and government agency science budgets" (Wikipedia).

### The bottleneck
> A physicist and an economist could spend a month in a room arguing about the same model with no department chair, no course load, no tenure clock, and no funding agency asking which discipline's panel should review it.

Deliberately: SFI's founders **left the definition of "complexity" unclear on purpose** to keep the problem space open ([GoodWork Project, *Review of the Santa Fe Institute*, Dan Dillon / PI Veronica Boix Mansilla, Harvard Project Zero, Oct 15 2001, PDF](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf)).

### Funding
| Year | Figure | Source |
|---|---|---|
| 1995 | **~$5M budget, half federal, half private**; 6 full-time researchers in Santa Fe, ~50 external faculty | [Horgan, *From Complexity to Perplexity*, Scientific American, June 1995](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/Hogan.ComplexPerplex.htm) |
| 2001 | ~15 full-time scientists, 100+ visitors/yr, Science Board of 50 | [GoodWork/Project Zero report](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf) |
| 2014 | budget "just over $10 million" | [Wikipedia](https://en.wikipedia.org/wiki/Santa_Fe_Institute) |
| FY2019 | Government grants **$1,920,851**; business network (ACtioN) $1,104,708; gifts/nongovt grants $5,348,867; tuition $411,416 | [SFI audited financial statements FY20, PDF](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/ckeditor/2022/06/13/2020-santa-fe-institute-fy20-fs-final-s.pdf) |
| FY2020 | Government grants **$1,509,925**; ACtioN $1,184,130; gifts/nongovt grants $8,332,315 | same |
| FY2023 | Revenue $9,241,440; expenses $16,681,238 | [ProPublica](https://projects.propublica.org/nonprofits/organizations/850325494) |
| FY2024 | Revenue $51,822,371; expenses **$16,973,641**; net assets **$84,360,126** | [ProPublica](https://projects.propublica.org/nonprofits/organizations/850325494) |

**Read of the funding structure:**
- **Roughly $17M/yr in operating expenses (FY2023–24)** — about 0.4% of DARPA's budget and a fifth of Janelia's. SFI is tiny.
- **~85–90% private**, ~11–18% federal in FY2019–20. That is the insulation mechanism: SFI does not depend on NIH/NSF study sections, so it does not have to be legible to any disciplinary panel.
- Revenue is **extremely lumpy** — $9.2M (FY2023) vs $51.8M (FY2024) vs $57.8M (FY2021) — indicating campaign/bequest-driven, not annuity-driven. Endowment net assets were only **~$12.5M / ~$14.4M in FY2019–20** ([audited FS](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/ckeditor/2022/06/13/2020-santa-fe-institute-fy20-fs-final-s.pdf)) — **note: the FY19/FY20 column labels in that document are ambiguous as I read it; treat as "$12–14M range in FY19–20."** Against ~$16M of annual expenses, that is under one year of runway. **SFI's insulation from short-term evaluation is real but its insulation from short-term fundraising is weak.** This is a genuine structural difference from Bell Labs, DARPA and Janelia, all of which sat on a rent, an appropriation, or an endowment.
- Corporate money comes through the **ACtioN business network** (~$1.1–1.2M/yr) — companies pay for access, not for deliverables.

### Governance
- **No permanent or tenured positions** at all. Structure: small resident faculty + postdocs + a large visitor program + ~**100 external ("fractal") faculty** whose primary appointments are elsewhere ([Wikipedia](https://en.wikipedia.org/wiki/Santa_Fe_Institute)).
- 2001 snapshot: residential researchers stayed "at most a few years"; external faculty made repeated visits; five research areas (Computation, Economic/Social Interactions, Evolutionary Dynamics, Network Dynamics, Robustness) **without formal departments** ([GoodWork report](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf)).
- **Postdocs**: up to **three years in residence**, **explicitly no PI and no assigned project** — "the opportunity to undertake their own independent research"; eligibility is "a Ph.D. in **any** scientific discipline" ([SFI Complexity Postdoctoral Fellowship](https://apply-sfi.smapply.org/prog/complexity_postdoctoral_fellowship_/)). This is the single most distinctive governance feature: SFI's postdocs are structurally more independent than most tenure-track assistant professors.
- **Who picks problems**: nobody, centrally. Working groups self-assemble; the institute funds convening rather than projects. Consequence: **there is no mechanism for killing a line of work.** Compare DARPA, where killing programs is the PM's job. SFI has no equivalent of the Heilmeier Catechism.
- **What happens to people who fail**: nothing happens *at SFI* — they simply leave when the term ends. Failure is externalized to the academic job market. There is no internal "bottom 10%" mechanism (Bell Labs) and no transitional package (Janelia).

### SCOPE — maximally broad, and this is the crux
SFI is the broadest of the four by a wide margin: math, physics, CS, biology, economics, archaeology, linguistics, humanities.

**What actually made cross-disciplinary work happen (verified mechanisms, not atmosphere):**
1. **No departments and no tenure** — removes the two institutions that enforce disciplinary loyalty.
2. **The postdoc-with-no-PI** — the people with the most time are the people with no disciplinary supervisor.
3. **The external/"fractal" faculty + visitor program** — the design imports breadth rather than hiring it. ~100 external faculty across 80+ institutions and 20 countries ([SFI](https://www.santafe.edu/people/faculty)) means SFI does not have to pay for, or find bench space for, its own breadth. This is the genuinely clever structural innovation and the one most worth copying.
4. **Working groups + the SFI Studies in the Sciences of Complexity book series** (Addison-Wesley, later OUP) — the series is the *output format* that makes a cross-disciplinary workshop citable, which is what disciplinary CVs need.
5. **A shared formalism substituting for a shared artifact** — where Bell Labs had the telephone network, SFI has a toolkit (agent-based models, power laws, networks, information theory, evolutionary dynamics). **This is precisely what critics attack**: the toolkit is portable enough to travel everywhere and therefore, they argue, constrains nothing.

**Verified evidence of the breadth problem biting from inside:** SFI physicist James Crutchfield on physics–biology collaboration: *"there can be antagonisms that develop… if you don't do it right, you end up alienating people."* And on growth: *"the resident research population now is 50, will soon be 60… the social dynamics is very different."* Also recorded: internal debate over whether SFI should **"change its topic of study: complexity may have to go"** to avoid institutional hardening. ([GoodWork report, 2001](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf))

### THE STRONGEST CASE THAT IT WORKED

1. **Complexity economics is a real, funded, ongoing research program that SFI created.** The 1987 economics program (funded by Citicorp CEO **John Reed**, confirmed as "early SFI funder") produced physicist–economist collaborations that, per the Harvard review, "had an impact both on how economics is done and on possible career paths for physicists" ([GoodWork report](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf)). W. Brian Arthur's increasing-returns work is the canonical output ([SFI profile](https://www.santafe.edu/people/profile/w-brian-arthur)).
2. **It spun out working technology.** **Prediction Company** (Santa Fe, March 1991; J. Doyne Farmer, Norman Packard, James McGill) built statistical-learning trading systems; exclusive contract with O'Connor & Associates from Sept 1992 → Swiss Bank → **UBS bought it outright in 2005** → Millennium 2013 → closed Sept 1, 2018. **One losing year in 26.** ([Wikipedia: Prediction Company](https://en.wikipedia.org/wiki/Prediction_Company))
3. **Urban scaling.** Bettencourt, Lobo, Helbing, Kühnert & West, "Growth, innovation, scaling, and the pace of life in cities," **PNAS 2007** — created a quantitative subfield of urban science that did not previously exist ([PNAS](https://www.pnas.org/doi/abs/10.1073/pnas.[phone])).
4. **It seeded fields that outgrew it**: artificial life, agent-based modelling, network science, econophysics, complexity economics ([Wikipedia](https://en.wikipedia.org/wiki/Santa_Fe_Institute)). The pattern is consistent — SFI incubates, universities absorb.
5. **Cost-effectiveness.** All of the above on ~$5M/yr (1995) to ~$17M/yr (2024). Janelia spends ~5x that; DARPA ~250x.
6. **Institutional durability.** 40 years, no tenure, no endowment to speak of, still recruiting. That is itself a nontrivial result.

### THE STRONGEST CASE THAT IT PRODUCED ATMOSPHERE, NOT RESULTS

**Named critics, with their actual arguments:**

**From Horgan's *Scientific American*, June 1995 — [full text](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/Hogan.ComplexPerplex.htm):**

| Critic | Argument (verbatim where quoted) |
|---|---|
| **Jack D. Cowan** — mathematical biologist, U. Chicago, **and an SFI founder** | *"There has been tremendous hype."* Research tends *"to degenerate into computer hacking."* The field's real discovery: *"it's very hard to do science on complex systems."* |
| **Herbert A. Simon** — Nobel laureate, CMU | *"Most of the people who talk about these great theories have been infected with mathematics."* … *"I think you'll see a bust on the notion of unification."* |
| **John Maynard Smith** — evolutionary biologist, Sussex | Artificial life is *"basically a fact-free science."* |
| **Rolf Landauer** — IBM | Complexologists are chasing a *"magic criterion"* that *"doesn't exist."* |
| **Sidney R. Nagel** — U. Chicago | Per Bak's sandpile model — the flagship self-organized-criticality result — **does not describe actual sandpiles.** |
| **James P. Crutchfield & Melanie Mitchell** — both SFI | On the "edge of chaos": *"It's a moving target."* And the killer line: *"If a theory applies to everything, it may really apply to nothing."* |
| **Melanie Mitchell** — SFI | On a unified theory of complex systems: *"I don't even know what that would mean."* |
| **Naomi Oreskes** | *"Verification or validation of numerical models of natural systems is impossible"* (in *Science*) — i.e., the epistemic status of SFI's core method is unresolved. |
| **Francisco Antonio Doria** | *"We go from complexity to perplexity."* |

Note the structure of this list: **four of the harshest critics (Cowan, Crutchfield, Mitchell, and by implication Anderson) are SFI insiders.** This is not an outside hatchet job.

**Horgan's 2012 follow-up** ([Scientific American, Dec 10, 2012](https://www.scientificamerican.com/blog/cross-check/can-engineers-and-scientists-ever-master-complexity)): the field has run a **repeating boom-bust cycle** — cybernetics → catastrophe theory → chaos → fractals → complexity — each promising unification and each retreating. Seth Lloyd documented **more than 40 definitions of "complexity."** Horgan's verdict on delivery: no. He points at 2008: the models did not see the financial crisis, and computer-based trading made markets more volatile. SFI's own news page **reproduced his six criticisms without rebuttal** ([SFI news item](https://www.santafe.edu/news-center/news/horgan-sciam-mastering-complexity)).

**The sociological indictment — Fabrizio Li Vigni, "The failed institutionalization of 'complexity science': A focus on the Santa Fe Institute's legitimization strategy," *History of Science*, 2021** ([SAGE](https://journals.sagepub.com/doi/10.1177/[phone])): despite forty years and enormous public visibility, complexity science never became *"a well-established and autonomous research and educational field, capable of reproducing itself through professional institutions."* **No departments, no degree pipeline, no self-reproducing profession.** SFI's legitimization strategy could not overcome that. (I read the abstract and SAGE landing page; the HAL full-text PDF is behind a bot-block, so the detailed evidence in the body is **[unverified]**.) Li Vigni's book-length version is *The Promises of Complexity Sciences: A Critique* (2021) — **[abstract unverified, 403]**.

**The technical demolitions of SFI's flagship empirical claims:**
- **Scale-free networks.** Broido & Clauset, "Scale-free networks are rare" — ~**1,000 network datasets**; only **4% show the strongest-possible evidence** of scale-free structure, **52% show the weakest-possible**; social networks essentially never. ([arXiv Jan 9, 2018](https://arxiv.org/abs/1801.03400); published *Nature Communications* 2019). **Aaron Clauset is SFI external faculty** — the most damaging critique of a complexity-science signature claim came from inside the building.
- **Urban scaling.** Arcaute, Hatna, Ferguson, Youn, Johansson & Batty, "Constructing cities, deconstructing scaling laws," *J. R. Soc. Interface* (2015) — exponents depend on how you draw city boundaries. **[Title/venue verified via search; I could not open the abstract (403), so the specific finding is my characterization and should be re-checked.]**
- Leitão, Miotto, Gerlach & Altmann, "Is this scaling nonlinear?", *Royal Society Open Science*, Jan 2016 (doi 10.1098/rsos.150649) — the abstract concludes that whether urban scaling is nonlinear *"crucially depend[s] on the fluctuations contained in the data, on how they are modeled, and on the fact that the city sizes are heavy-tailed distributed."* I.e., **the headline result is a modeling choice, not a fact.** ([abstract](https://arxiv.org/abs/1604.02872), [journal](https://royalsocietypublishing.org/doi/10.1098/rsos.150649))
- **Metabolic scaling.** The West–Brown–Enquist quarter-power law has been contested for two decades by Kozłowski & Konarzewski, with published rebuttals in *Functional Ecology* — **[I located the dispute but did not read the primary papers; treat the specifics as unverified.]**

**My hard-nosed synthesis on SFI:**
- **Mixed, tilting to "real but oversold."** SFI reliably produces *fields* and *people*; it does not reliably produce *settled results*. Of its four best-known empirical universals — self-organized criticality, edge of chaos, scale-free networks, urban/metabolic scaling — **the first two have been abandoned even by insiders, and the last two are actively contested in top journals, partly by SFI-affiliated researchers.** That is a poor hit rate for a 40-year program built on the claim that universal laws of complex systems exist.
- The **structural diagnosis** is what matters for your project: SFI has **breadth without a selection mechanism**. Bell Labs had breadth disciplined by an artifact (the network). DARPA has breadth disciplined by a customer (DoD) and a killer (the PM). Janelia has breadth disciplined by a technique (imaging tools for neuroscience). SFI has breadth disciplined by **a toolkit and a taste community** — and a toolkit that applies to everything provides no stopping rule. Crutchfield and Mitchell said exactly this in 1995 and it has not been answered.
- **The strongest defense** is that SFI was never supposed to produce settled results: it is a **field incubator with a deliberately vague charter and a 3-year throughput of unsupervised postdocs**, and it should be judged on whether the fields it spawned are alive elsewhere. On that metric — complexity economics, network science, agent-based modeling, urban science — it clearly worked, on a $10–17M budget. But note that this defense **concedes Li Vigni's point rather than refuting it**: SFI produced diaspora, not a discipline.
- **What is genuinely transferable**: (a) no-PI, no-project postdocs with 3-year terms; (b) the external/fractal faculty model, which buys breadth without paying for it; (c) no tenure and no departments; (d) private funding to escape disciplinary review panels.
- **What is genuinely missing and should be added to any successor**: a **kill mechanism**. SFI has no Heilmeier Catechism, no bottom-10%, no program termination. Its own leadership recognized the problem in 2001 — debating whether "complexity may have to go" to prevent hardening — and then did not do it. Janelia *did* do it (15-year research-area turnover). That is the single clearest design lesson from comparing the two.

**Counterfactual (what concretely would not exist without SFI):**
- The 1987 Pines/Arrow economics program and the resulting physicist-into-economics career pathway — verified as having "had an impact both on how economics is done and on possible career paths for physicists."
- Prediction Company (1991) and, through it, one strand of quantitative statistical-learning finance.
- The SFI Studies in the Sciences of Complexity series (Addison-Wesley/OUP), which is the publication substrate for a lot of early ALife and complexity economics.
- The quantitative urban-scaling literature post-2007, including its critics.
- **Not** in the counterfactual: genetic algorithms (Holland, Michigan, pre-SFI), chaos theory, information theory. Be careful of SFI-adjacency claims here.

---

## 4. JANELIA RESEARCH CAMPUS, HHMI (2006–)

**Founded**
- Established **Sept 6, 2006**; opened **October 2006**. Ashburn/Loudoun County, VA. ([Wikipedia: Janelia](https://en.wikipedia.org/wiki/Janelia_Research_Campus))
- Construction began **late 2002**, completion scheduled **early 2006**; **281 wooded acres** at planning stage (Wikipedia gives 689 acres for the final campus). ([HHMI Janelia Farm Program Development Report, PDF](https://www.janelia.org/sites/default/files/About%20Us/JFRC.pdf))
- **Cost figures conflict across sources**: the program development report gives **total project cost $500M** ($308–320M site development + construction); Wikipedia gives **"$300 million budget."** Both cited; I did not resolve the discrepancy.
- Founding director **Gerald M. Rubin** → **Ron Vale (2020)** → **Nelson Spruston (2024)**. ([Wikipedia](https://en.wikipedia.org/wiki/Janelia_Research_Campus))
- **Legal form**: a campus of the **Howard Hughes Medical Institute**, a nonprofit **medical research organization** — legally an *operating* research entity, not a grantmaking foundation, which is why HHMI can employ scientists directly. Endowment **$24B (2022)**; total expenses **$853M (2022)** ([Wikipedia: HHMI](https://en.wikipedia.org/wiki/Howard_Hughes_Medical_Institute)). At Janelia's founding, endowment was **$16B** and Janelia's annual budget **$80M** ([Harvard Magazine, Jan 2007](https://www.harvardmagazine.com/2007/01/the-janelia-experiment-html)); by 2019 Janelia was **~15% of HHMI's operating budget** ([Rubin & O'Shea, eLife 2019](https://elifesciences.org/articles/44826)).

**The bottleneck**
> A tool-builder could spend six years building a microscope or a calcium sensor that no study section would fund and no biology department would tenure them for, sitting ten metres from the biologists who need it.

**It explicitly copied Bell Labs — and said so**
Rubin: *"Every idea we have here, I can tell you who we stole it from."* ([Harvard Magazine](https://www.harvardmagazine.com/2007/01/the-janelia-experiment-html)) The planning document contains an explicit comparative analysis of model institutions ([JFRC report, PDF](https://www.janelia.org/sites/default/files/About%20Us/JFRC.pdf)):

| Model | Features Janelia copied |
|---|---|
| **Bell Labs** | groups of 1–2 scientists plus leader; **no tenure**; **weakest 10% encouraged to leave annually**; all internal funding, no external grant pressure; young group leaders (avg age 37 in 1968, 36.5 in 1988); emphasis on hard problems over publication counts |
| **MRC Laboratory of Molecular Biology (Cambridge)** | groups of 2–6 plus leader; limited tenure (<25% tenured in 1972); most scientists stayed 5–10 years then took university posts; internal funding, **outside grant applications not permitted**; excellent core support; **8 Nobel Prizes 1950–1980** |
| Also examined | EMBL, Carnegie Institution Dept. of Embryology, Cold Spring Harbor |

**Design features — the specifics you asked for (all verified)**

*From the founding plan ([JFRC report](https://www.janelia.org/sites/default/files/About%20Us/JFRC.pdf)):*
- Group leaders: **2–6 lab members each**; target **24 group leaders** at steady state (~120 people in groups); **must be active bench scientists themselves**; initial appointment **6 years**.
- **~20 Fellows** (postdoc trainees, mid-career changers, accomplished scientists): fully independent, **not attached to a group leader**, funded for up to 2 additional lab members, **5-year appointments**.
- **~80 core support staff**: vivarium, DNA sequencing, **instrument design and fabrication**, information sciences, mass spectrometry, tissue culture, media prep, equipment maintenance. Support space designed **~50% larger than typical** research buildings to absorb unknown future instrumentation.
- **HHMI provides all or nearly all funding** — "no outside grant applications allowed" ([Janelia, Our Model](https://www.janelia.org/about-us/our-model)).
- **Post-review outcomes designed in three roughly equal buckets**: (1) 5-year reappointment; (2) 5-year appointment with required 2-year transfer to a host institution; (3) 2-year transitional appointment while seeking outside positions. Reviewed by HHMI Scientific Review Boards; final call by the HHMI President; criteria explicitly include **"contributions to collegial environment."**

*From Harvard Magazine (2007):* groups **capped at six**, justified by the claim that humans do not have meaningful interactions with more than ~20 people; **five-year renewable** appointments for 24 lab leaders at **$1M/yr per group**; glass architecture, movable benches (only utility bollards fixed), a pub, subsidized cafeteria, 100-room on-campus hotel. Rubin's stated *"nightmare failure scenario"*: creating **"another Whitehead or Salk Institute."**

*From the 2019 self-assessment — Rubin & O'Shea, "Point of View: Looking back and looking forward at Janelia," [eLife, Feb 7 2019](https://elifesciences.org/articles/44826):*
- **~41 labs, 190 people in labs, >350 scientists total; ~45 group leaders, planned expansion to 60.**
- Early-career group leaders funded for **2 lab members plus shared resources**, which they argue is equivalent to **a group of 5 in a typical academic setting**.
- **5-year initial appointment + possible 5-year extension.** After **10 years**, scientists can compete for **"transfer tickets"** — i.e., an HHMI Investigator position elsewhere. **Non-renewed group leaders receive roughly $1.5M in transitional funding.** Senior leaders get **7-year renewable terms with 3 years of transitional support** if not renewed.
- **Project teams** — distinct from labs, staffed with specialists rather than end-users, run "much like biotech start-ups." Created **because the small-lab structure could not scale** certain efforts: *"we often could not adequately scale up these activities within our small lab structure."*
- **20% of group leaders hired directly out of graduate school** (no postdoc).
- **Research area turnover is scheduled**, in ~15-year programs: Molecular Tools & Imaging; Mechanistic Cognitive Neuroscience (2017); **4D Cellular Physiology** (announced June 8, 2022, launched Sept 2022 under Jennifer Lippincott-Schwartz) ([Janelia news](https://www.janelia.org/news/janelia-announces-group-leaders-for-new-and-current-research-areas)).

**Funding insulation — how**
- HHMI endowment ($24B, 2022) → Janelia gets ~15% of an $853M/yr operating budget. **No grant applications permitted at all.** The insulation is an endowment plus a rule, and the rule matters as much as the money: allowing grants would reimport study-section time horizons.
- Note the vulnerability: HHMI has cut investigator grants before when the endowment took a hit ([*Science* news](https://www.science.org/content/article/hughes-cuts-researcher-grants-endowment-takes-hit)) — **[headline verified, article body unread]**.

**Governance**
- **Who picks problems**: the research-area leadership sets the arena (a ~15-year program); within it, group leaders pick freely. Turnover of the arena is scheduled by management, deliberately.
- **What happens to people who fail**: they are not renewed at 5 or 10 years and leave with **~$1.5M** and a soft landing, or compete for a transfer ticket to an HHMI Investigator post. This is the most humane and most explicit failure protocol of the four institutions — and it is what makes "no tenure" recruitable. Rubin & O'Shea note many recruits **"gave up academic tenure to join us."**

**SCOPE — narrow by design, and this is the point**
- Janelia is deliberately **narrow**: neuroscience + imaging/molecular tools, one or two research areas at a time (2 in 2019, expanding to 3).
- **How it solves the breadth problem**: it does not try to be broad across domains. It is broad across **skill types within one domain** — physicists, optical engineers, software developers, chemists, and biologists all pointed at the same instruments and the same organisms. The founding assumption, confirmed in the 2019 self-assessment: *"co-localization of tool-builders with those who need those tools would greatly speed up"* innovation.
- **This is the Bell Labs mechanism, correctly identified and correctly copied**: cross-disciplinarity is produced by a **shared artifact** (the microscope, the sensor, the connectome), not by shared abstractions. Janelia understood what SFI did not.

**Verdict: worked, with a specific acknowledged failure mode.**
- **Evidence it worked:** Eric Betzig won the **2014 Nobel Prize in Chemistry** while a Janelia group leader ([Janelia](https://www.janelia.org/news/eric-betzig-wins-2014-nobel-prize-chemistry)); the first full-brain *Drosophila* connectome at neuronal resolution ([Wikipedia](https://en.wikipedia.org/wiki/Janelia_Research_Campus)); GCaMP calcium-sensor papers with **>3,600 citations**; **>270 research or open-source hardware licenses**; **>5,600 aliquots** of fluorescent dyes distributed to **>900 labs**; GAL4 driver lines to **1,500 labs** ([eLife 2019](https://elifesciences.org/articles/44826)). Recruitment succeeded without tenure.
- **Acknowledged failures (their own words):** (1) small labs **could not scale** tool efforts, forcing invention of project teams with different management and staffing; (2) *"without an opposing force provided by management, there is a slow, steady drift toward a more conventional environment increasingly focused on maintaining successful programs"* — which is why they imposed scheduled research-area turnover; (3) an unresolved *"tension between what is best for an individual scientist's short-term market value and what is best for science"* over authorship credit in collaborative work; (4) you cannot change a person's working style after hiring them. ([eLife 2019](https://elifesciences.org/articles/44826))
- **Structural reason it worked**: narrow scope + a shared artifact + a funded exit ramp. The exit ramp is the underrated part — Bell Labs could fire the bottom 10% because they had 25,000 internal jobs to absorb them; Janelia has 350 scientists and no internal absorber, so it **buys** the soft landing with $1.5M cheques and transfer tickets.
- **No independent external evaluation found.** Everything above on "did it work" is either Janelia/HHMI self-assessment or prize/citation counts. **I did not find a critical outside review of Janelia** — treat "worked" as well-evidenced on outputs but under-audited on counterfactual.

**Counterfactual**: modern GCaMP-based neural activity imaging on the current timeline; the full-brain fly connectome; some fraction of the super-resolution imaging toolkit. Concretely: the class of instruments too expensive and too un-publishable for an R01-funded academic lab, but too specialized for a company.

---

## Cross-case summary

| | Bell Labs | DARPA | SFI | Janelia |
|---|---|---|---|---|
| Money source | Monopoly operating revenue | DoD appropriation | Private gifts (~85–90%) | HHMI endowment |
| Scale (latest verified) | ~750 staff (Nokia BL) | $4.32B enacted FY2026 | ~$17M expenses FY2024 | ~15% of HHMI's $853M (2022); 650 staff (2025) |
| Insulation mechanism | Rate regulation + scale | **Term limits on the decision-maker** | Private money escapes study sections | **Endowment + ban on grant applications** |
| Scope | Broad | Broad (time-sliced by program) | **Maximally broad** | **Deliberately narrow** |
| What forces cross-disciplinarity | A shared **artifact** (the network) | A shared **customer** + a PM who assembles teams | A shared **toolkit** + no departments | A shared **artifact** (instruments/organism) |
| Kill mechanism | Bottom 10% annually | PM proposes to end own program | **None** | 5/10-yr non-renewal + scheduled area turnover |
| Failure handling | Transfer inside a 1M-person firm | Career accelerant on exit | Externalized to job market | **$1.5M + transfer ticket** |
| Verdict | Worked → declined when funding stability died | Worked; poorly cloned | **Mixed — produced fields and people, not settled results** | Worked; under-audited externally |

**The one structural generalization the four cases support:** insulated funding is necessary but nowhere near sufficient. The institutions that worked all paired insulated funding with (a) a **concrete shared object** that forces disciplines to converge, and (b) an explicit **mechanism for ending things** — programs, appointments, or research areas. SFI has the funding insulation and the breadth, and has neither the shared object nor the kill mechanism. That, not the quality of its people, is the best structural explanation for why its output reads as field-creation rather than result-production.

**Sources — everything I actually opened and read:**
- [Wikipedia: Bell Labs](https://en.wikipedia.org/wiki/Bell_Labs) · [Wikipedia: Breakup of the Bell System](https://en.wikipedia.org/wiki/Breakup_of_the_Bell_System)
- [Watzinger, Fackler, Nagler & Schnitzer — 1956 consent decree (PDF)](http://www.monika-schnitzer.com/uploads/4/9/4/1/49415675/watzinger_etal_0219.pdf)
- [Odlyzko, "The Decline of Unfettered Research" (1995)](https://www-users.cse.umn.edu/~odlyzko/doc/decline.txt)
- [Construction Physics, "What Would It Take to Recreate Bell Labs?"](https://www.construction-physics.com/p/what-would-it-take-to-recreate-bell)
- [Physics Today, "Bell Labs Research Regroups as Parent Lucent Shrinks" (Oct 2001)](https://pubs.aip.org/physicstoday/article/54/10/26/935299/Bell-Labs-Research-Regroups-as-Parent-Lucent)
- [Laser Focus World, "Staff says Bell Labs has ended basic physics research" (Aug 29, 2008)](https://www.laserfocusworld.com/test-measurement/research/article/16563322/staff-says-bell-labs-has-ended-basic-physics-research)
- [Wikipedia: DARPA](https://en.wikipedia.org/wiki/DARPA) · [darpa.mil/about](https://www.darpa.mil/about) · [darpa.mil program manager careers](https://www.darpa.mil/careers/program-manager)
- [Cheney, *Personnel Systems of DARPA and ARPA-E* (PDF)](https://www.technopoli.net/assets/docs/Personnel_Systems_of_DARPA_and_ARPA-E.131103620.pdf)
- [Azoulay, Fuchs, Goldstein & Kearney, *Promises and Challenges of the "ARPA Model"* (MIT Sloan PDF)](https://mitsloan.mit.edu/shared/ods/documents?DocumentID=5173)
- [Ranka, "DARPA — Enabling Technical Innovation" (open access chapter)](https://books.openbookpublishers.com/10.11647/obp.0184/ch10.xhtml)
- [*Nature* editorial, "DARPA 'lookalikes' must ground their dreams in reality" (Mar 11, 2020)](https://www.nature.com/articles/d[phone])
- [NASEM, *An Assessment of ARPA-E* — Report Highlights (PDF)](https://nap.nationalacademies.org/resource/24778/ReportHighlights_ARPA-E.pdf)
- [Wikipedia: Santa Fe Institute](https://en.wikipedia.org/wiki/Santa_Fe_Institute) · [SFI faculty page](https://www.santafe.edu/people/faculty) · [SFI Complexity Postdoctoral Fellowship](https://apply-sfi.smapply.org/prog/complexity_postdoctoral_fellowship_/) · [SFI news item on Horgan](https://www.santafe.edu/news-center/news/horgan-sciam-mastering-complexity) · [W. Brian Arthur SFI profile](https://www.santafe.edu/people/profile/w-brian-arthur)
- [SFI FY2020 audited financial statements (PDF)](https://sfi-edu.s3.amazonaws.com/sfi-edu/production/uploads/ckeditor/2022/06/13/2020-santa-fe-institute-fy20-fs-final-s.pdf) · [ProPublica Nonprofit Explorer: SFI](https://projects.propublica.org/nonprofits/organizations/850325494)
- [Horgan, "From Complexity to Perplexity," *Scientific American*, June 1995 (full text)](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/Hogan.ComplexPerplex.htm) · [Horgan, "Can Engineers and Scientists Ever Master 'Complexity'?", Dec 10, 2012](https://www.scientificamerican.com/blog/cross-check/can-engineers-and-scientists-ever-master-complexity)
- [Li Vigni, "The failed institutionalization of 'complexity science'", *History of Science* (2021)](https://journals.sagepub.com/doi/10.1177/[phone])
- [GoodWork Project, *Review of the Santa Fe Institute*, Oct 15, 2001 (PDF)](https://static1.squarespace.com/static/5c5b569c01232cccdc227b9c/t/5ee78ffe9023b17d8d050d2e/[phone]/Santa+Fe.pdf)
- [Broido & Clauset, "Scale-free networks are rare"](https://arxiv.org/abs/1801.03400) · [Leitão et al., "Is this scaling nonlinear?"](https://arxiv.org/abs/1604.02872) / [journal](https://royalsocietypublishing.org/doi/10.1098/rsos.150649)
- [Bettencourt et al., PNAS 2007](https://www.pnas.org/doi/abs/10.1073/pnas.[phone]) · [Wikipedia: Prediction Company](https://en.wikipedia.org/wiki/Prediction_Company)
- [HHMI Janelia Farm Program Development Report (PDF)](https://www.janelia.org/sites/default/files/About%20Us/JFRC.pdf) · [Janelia, "Our Model"](https://www.janelia.org/about-us/our-model) · [Janelia group leaders announcement, June 2022](https://www.janelia.org/news/janelia-announces-group-leaders-for-new-and-current-research-areas) · [Janelia: Betzig Nobel](https://www.janelia.org/news/eric-betzig-wins-2014-nobel-prize-chemistry)
- [Rubin & O'Shea, "Looking back and looking forward at Janelia," *eLife*, Feb 7, 2019](https://elifesciences.org/articles/44826) · [Harvard Magazine, "The Janelia Experiment," Jan 2007](https://www.harvardmagazine.com/2007/01/the-janelia-experiment-html) · [Wikipedia: Janelia](https://en.wikipedia.org/wiki/Janelia_Research_Campus) · [Wikipedia: HHMI](https://en.wikipedia.org/wiki/Howard_Hughes_Medical_Institute)

**Sources I could not access (blocked/paywalled) — findings from them are marked unverified above:** Li Vigni full text (HAL 403), Li Vigni's *Hayek at the Santa Fe Institute* (HAL 403), *Nature* "Bell Labs bottoms out" full text (paywall), Arcaute et al. abstract (403), Bonvillian's ARPA-clones PDF (proxy 403), CRS R45088 (robots.txt), Grokipedia SFI (403).agentId: a1c8758458c544174 (use SendMessage with to: 'a1c8758458c544174', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 114312
tool_uses: 85
duration_ms: 696731</usage>
