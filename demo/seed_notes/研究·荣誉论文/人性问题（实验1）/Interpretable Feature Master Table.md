**Humanness line — founding document (initiated [phone] after advisor meeting; merged into single AB table and deduplicated [phone]): an interpretable, "musical humanness" approach alongside the black-box classifier line.**

#### Legend
- Code: <span style="color:#1D9E75">●</span> implemented (part2_analysis/)  <span style="color:#D85A30">●</span> to be written
- Type: **direct** = extracted straight from audio; <span style="color:#7F77DD">**derived**</span> = second-order computation over existing features / population distributions
- Data: 10s = current common-spec clips suffice; <span style="color:#BA7517">**full-length**</span>/<span style="color:#BA7517">**stereo**</span> = requires original audio (project H2)
- <span style="color:#0C447C">**[ear↑]**</span> = human listening likely outperforms the algorithm here; cross-check with Table D

> Deduplication log ([phone], 6 items removed/merged): beat_regularity (a transform of ibi_cv);
> rms_range_db (duplicate of dynamic_range_db); num_onsets (proportional to density on fixed-length clips);
> tempo-drift curve (the full-length version of tempo_stability, folded into that row);
> per-beat loudness variance (same as onset_peak_std); structural squareness (folded into the structure row).

---

## Table AB: all machine-computable features
*(All pure signal processing / statistics — librosa, numpy, scipy. No machine learning anywhere:
pYIN and beat tracking are DSP / dynamic-programming algorithms, not learned models; "derived"
features are statistics that use the human population distribution as a reference frame.)*

| Module | Feature | What it is | How it is computed | Code | Type | Data | Humanness intuition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Spectral | centroid_mean_hz | Average "brightness" (spectral center of mass) | STFT → librosa spectral centroid, mean over frames | <span style="color:#1D9E75">●</span> | direct | 10s | Suno is systematically brighter (entangled with the era confound — flag when interpreting) |
| Spectral | centroid_std_hz | How much brightness moves over time | std of the framewise centroid | <span style="color:#1D9E75">●</span> | direct | 10s | **Low = static timbre = AI** (shrinkage class) |
| Spectral | rolloff_mean_hz | High-frequency "ceiling" (85%-energy cutoff) | librosa spectral rolloff, mean | <span style="color:#1D9E75">●</span> | direct | 10s | AI: full bandwidth or hard cutoff |
| Spectral | rolloff_std_hz | Does the ceiling move | std of the same | <span style="color:#1D9E75">●</span> | direct | 10s | Low = constant bandwidth = renderer trace |
| Spectral | bandwidth_mean_hz | Energy spread around the centroid | librosa spectral bandwidth, mean | <span style="color:#1D9E75">●</span> | direct | 10s | "Thickness" of the sound |
| Spectral | bandwidth_std_hz | Fluctuation of that spread | std | <span style="color:#1D9E75">●</span> | direct | 10s | Shrinkage class |
| Spectral | centroid_rolloff_ratio | Energy concentration below the ceiling | mean centroid ÷ mean rolloff | <span style="color:#1D9E75">●</span> | direct | 10s | Spectral-shape fingerprint |
| Spectral | hf_energy_ratio | Fraction of energy above 8 kHz | band-split STFT energy ratio | <span style="color:#1D9E75">●</span> | direct | 10s | Codec-cutoff trace; same family as round-1's strongest single feature (30.4% EER) |
| Spectral | mel_band_temporal_std | Temporal liveliness of texture | per-mel-band std over time, averaged over bands | <span style="color:#1D9E75">●</span> | direct | 10s | **Low = static texture = AI** (shrinkage class) |
| Spectral | spectral_contrast×7 | Peak-valley contrast per sub-band | librosa spectral contrast, 7-band means | <span style="color:#1D9E75">●</span> | direct | 10s | Low contrast = flatter / synthetic |
| Timbral | zcr_mean | Noisiness (zero-crossing rate) | librosa ZCR, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Texture noisiness |
| Timbral | zcr_std | Noisiness fluctuation | std | <span style="color:#1D9E75">●</span> | direct | 10s | Shrinkage class |
| Timbral | spec_flat_mean | Tone vs noise (0 = pure tone, 1 = white noise) | librosa spectral flatness, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Synthetic timbres are often unnaturally "pure" |
| Timbral | spec_flat_std | Flatness fluctuation | std | <span style="color:#1D9E75">●</span> | direct | 10s | Shrinkage class |
| Timbral | zcr_flat_corr | Do the two "noise rulers" move together | correlation of the two framewise series | <span style="color:#1D9E75">●</span> | direct | 10s | Real instruments decouple them more |
| Timbral | harm_perc_ratio | Harmonic/percussive energy balance | HPSS → RMS ratio of the two stems | <span style="color:#1D9E75">●</span> | direct | 10s | Texture recipe |
| Timbral | hp_ratio_std | Fluctuation of that balance | framewise H/P ratio, std | <span style="color:#1D9E75">●</span> | direct | 10s | **Unnaturally constant balance = AI** |
| Timbral | hp_ratio_min / max | Extremes of the balance | min/max of the series | <span style="color:#1D9E75">●</span> | direct | 10s | Range of the mix |
| Timbral | mfcc_means×20 | Broad timbral fingerprint | 20 MFCCs, framewise means | <span style="color:#1D9E75">●</span> | direct | 10s | Timbral baseline |
| Timbral | mfcc_stds×20 | Per-coefficient fluctuation | framewise std | <span style="color:#1D9E75">●</span> | direct | 10s | **Low std in higher coefficients = missing micro-detail = AI** |
| Timbral | mfcc_delta_mean_abs | Speed of timbral movement | mean abs of MFCC first derivative | <span style="color:#1D9E75">●</span> | direct | 10s | Low = sluggish timbre (shrinkage class) |
| Timbral | chroma_entropy_mean | Per-frame harmonic richness | entropy of the 12-dim chroma, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Low = repetitive harmony |
| Timbral | active_pc_per_frame | Pitch classes sounding per frame | thresholded chroma count, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Harmonic thickness |
| Timbral | chord_change_rate_hz | How fast the "chord" changes | change rate of chroma argmax | <span style="color:#1D9E75">●</span> | direct | 10s | AI changes at a steadier clip |
| Dynamics | rms_mean_db | Average loudness | framewise RMS → dB, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Normalized away by LUFS; expected null (round-1: 45.8% ≈ chance — negative control) |
| Dynamics | rms_std_db | Loudness fluctuation | std | <span style="color:#1D9E75">●</span> | direct | 10s | **Low = ironed-out dynamics = AI** |
| Dynamics | dynamic_range_db | Peak-to-floor span | max − min (dB) | <span style="color:#1D9E75">●</span> | direct | 10s | Degree of production compression |
| Dynamics | rms_iqr_db | Loudness spread (robust) | interquartile range of RMS | <span style="color:#1D9E75">●</span> | direct | 10s | Shrinkage class |
| Dynamics | crest_mean | Peak-to-RMS ratio (transient sharpness) | framewise peak÷RMS, mean | <span style="color:#1D9E75">●</span> | direct | 10s | Low = heavily compressed |
| Dynamics | crest_std | Sharpness fluctuation | std | <span style="color:#1D9E75">●</span> | direct | 10s | Shrinkage class |
| Dynamics | crest_min | The most squashed moment | min | <span style="color:#1D9E75">●</span> | direct | 10s | Limiter trace |
| Dynamics | crest_below_2_pct | Share of heavily compressed frames | fraction with crest < 2 | <span style="color:#1D9E75">●</span> | direct | 10s | Loudness-war fingerprint |
| Dynamics | loudness_arc_slope | Overall loudness trajectory | linear-regression slope of RMS over time | <span style="color:#1D9E75">●</span> | direct | 10s; **30s arc-shape version implemented** (slope/curvature/peak-position/range, midwindow.py) | Templated loudness arcs |
| Dynamics | rms_autocorr_lag1 | Smoothness of the loudness track | lag-1 autocorrelation | <span style="color:#1D9E75">●</span> | direct | 10s | High = over-smoothed = AI |
| Rhythm | tempo_bpm | Tempo | onset envelope + dynamic-programming beat tracking | <span style="color:#1D9E75">●</span> | direct | 10s | Distribution shape reveals templating |
| Rhythm | onset_density_per_s | Note-event density | onset count ÷ duration | <span style="color:#1D9E75">●</span> | direct | 10s | Texture density |
| Rhythm | ibi_mean_s | Mean inter-beat interval | mean of adjacent beat gaps | <span style="color:#1D9E75">●</span> | direct | 10s | Neutral |
| Rhythm | ibi_std_s / ibi_cv | Beat-interval wobble | std / std÷mean | <span style="color:#1D9E75">●</span> | direct | 10s | **Human hands wobble; AI is quartz-steady** (pillar-① core; CV < 0.02 = "machine suspicion") |
| Rhythm | onset_str_mean / std | Hit-strength mean / fluctuation | onset-strength envelope stats | <span style="color:#1D9E75">●</span> | direct | 10s | Low strength variance = AI |
| Rhythm | onset_peak_std | Variability of accents | std of peak onsets | <span style="color:#1D9E75">●</span> | direct | 10s | Human accents are uneven |
| Rhythm | syncopation_index | Off-beat share | fraction of onsets off the beat grid | <span style="color:#1D9E75">●</span> | direct | 10s | Too low = overly square <span style="color:#0C447C">**[ear↑]**</span> |
| Rhythm | tempo_stability | Tempo drift | windowed tempo, 1 − (std/mean) | <span style="color:#1D9E75">●</span> | direct | 10s; **30s drift trio implemented** (cv/range/trend/max-step, midwindow.py, [phone]) | **Humans rubato; AI holds metronome tempo** |
| Rhythm | groove_consistency | Self-consistency of the groove | onset-envelope autocorrelation at beat period | <span style="color:#1D9E75">●</span> | direct | 10s | Too high = copy-pasted groove <span style="color:#0C447C">**[ear↑]**</span> |
| Quantize | quantization_score | Grid adherence (0–100) | 16th-note grid on beats; share of onsets on-grid | <span style="color:#1D9E75">●</span> | direct | 10s | **High = over-quantized = candidate AI hard fingerprint** |
| Quantize | mean/std/max_dev_ms | Millisecond deviation from the grid | per-onset distance to nearest grid line | <span style="color:#1D9E75">●</span> | direct | 10s | **Humans naturally 10–30 ms off; AI → 0** |
| Quantize | swing_pct | Swing ratio | positional offset of even eighth notes | <span style="color:#1D9E75">●</span> | direct | 10s | Straight 50% = no swing <span style="color:#0C447C">**[ear↑]**</span> |
| Quantize | subdivision | Dominant subdivision | best-fitting grid subdivision | <span style="color:#1D9E75">●</span> | direct | 10s | Rhythmic grammar |
| Key | best_key / best_corr | Most likely key + confidence | HPSS → chroma histogram × Krumhansl-Schmuckler 24-template correlation, max | <span style="color:#1D9E75">●</span> | direct | 10s | **AI harmony is more textbook → higher confidence** |
| Key | alt_key / alt_corr | Runner-up key + confidence | second-highest correlation | <span style="color:#1D9E75">●</span> | direct | 10s | best−alt gap = tonal ambiguity; humans are more ambiguous |
| Structure | section count / length CV / repetition / phrase squareness / duration distribution | Macro song form and its templatedness | SSM + checkerboard novelty segmentation implemented (fulltrack.py, [phone]: count/min, length CV, median, squareness); section clustering ext. pending | <span style="color:#1D9E75">●</span>/<span style="color:#D85A30">●</span> | direct | <span style="color:#BA7517">**full-length**</span> | AI loves templates; meaningless on 10 s |
| Performance | Micro-timing directionality | Rushing vs dragging (asymmetry) | skewness of signed dev_ms distribution (numpy) | <span style="color:#D85A30">●</span> | direct | 10s | Drummers have personality; AI centers symmetrically <span style="color:#0C447C">**[ear↑]**</span> |
| Performance | Phrase gaps ("breathing room") | Distribution of short silences (count/ratio/duration/interval regularity) | sub-threshold RMS gap statistics (numpy; midwindow.py) | <span style="color:#1D9E75">●</span> | direct | <span style="color:#BA7517">**full-length**</span> preferred (**30s version implemented**, [phone]) | Performers must breathe <span style="color:#0C447C">**[ear↑]**</span> |
| Pitch | Global tuning offset | Cents away from A440 | pYIN f0 histogram peaks vs equal-temperament grid | <span style="color:#D85A30">●</span> | direct | 10s | Old instruments/tape drift; AI is exactly 0 |
| Pitch | Vibrato triple | Vibrato rate / depth / regularity | pYIN f0 trajectory envelope analysis | <span style="color:#D85A30">●</span> | direct | 10s (solo passages) | Human vibrato is imperfect and irregular <span style="color:#0C447C">**[ear↑]**</span> |
| Pitch | Semitone snapping | Concentration of pitch on semitone grid | pYIN f0 dispersion around 12-TET grid | <span style="color:#D85A30">●</span> | direct | 10s | Autotune/synthesis = perfect snapping |
| Structure | Over-similar repetition | How identical are the choruses (chorus_copy_max / length ratio) | time-lag diagonal stripes, 8s sliding window (fulltrack.py, [phone]) | <span style="color:#1D9E75">●</span> | direct | <span style="color:#BA7517">**full-length**</span> | Human re-performances always differ; AI renders near-copies <span style="color:#0C447C">**[ear↑]**</span> |
| Production | Stereo width | Mid/side energy ratio + fluctuation + L-R correlation | M/S decomposition (fulltrack.py, [phone]) | <span style="color:#1D9E75">●</span> | direct | <span style="color:#BA7517">**stereo**</span> | Spatial production feel |
| Production | Noise-floor portrait | Level and spectral slope of quiet passages | lowest-energy frames → level + spectral fit | <span style="color:#D85A30">●</span> | direct | <span style="color:#BA7517">**full-length**</span> preferred | Real recordings have room tone; AI is often "vacuum" |
| Production | Reverb tail length | RT60 proxy (energy decay rate) | slope fit on decay segments (scipy) | <span style="color:#D85A30">●</span> | direct | 10s | Real spaces vs algorithmic reverb <span style="color:#0C447C">**[ear↑]**</span> |
| Production | Limiter fingerprint + fade shape | Peak-flattening stats; fade-out curve shape (slope/R²/abruptness/tail-silence) | tail-envelope fit implemented (fulltrack.py, [phone]; limiter print to write) | <span style="color:#1D9E75">●</span>/<span style="color:#D85A30">●</span> | direct | <span style="color:#BA7517">**full-length**</span> preferred | Production-habit traces <span style="color:#0C447C">**[ear↑]**</span> |
| Production | Vocoder combing / bandwidth seams | Unnaturally regular harmonic spacing; energy steps | cepstral peak sharpness; per-band step detection | <span style="color:#D85A30">●</span> | direct | 10s | Generation-pipeline residue |
| Aggregate | Within-song dispersion index | All std/cv features packed into one scale | weighted summary of Table-AB outputs | <span style="color:#D85A30">●</span> | <span style="color:#7F77DD">**derived**</span> | 10s | **Pillar-① master scale** |
| Aggregate | Population shrinkage index | Per-feature AI-group variance ÷ human-group variance | two-sample variance ratio + F test (scipy) | <span style="color:#D85A30">●</span> | <span style="color:#7F77DD">**derived**</span> | analysis-time | Feature-level replay of the Batch-10 result |
| Aggregate | Feature-space typicality | Mahalanobis distance to the human distribution | fit human mean/covariance → distance | <span style="color:#D85A30">●</span> | <span style="color:#7F77DD">**derived**</span> | analysis-time | "Over-typicality" scale |

---

## Table D: human-ear / human-description dimensions

#### ① Performance ("a person is present")
| Dimension | What it is | How to audit | How to collect | Expected AI failure |
| --- | --- | --- | --- | --- |
| Breathing feel | Do phrases "take a breath" between them | Listen at phrase joints, rate 1–7 | Blinded paired playback (filenames scrambled by script); rate immediately; ≤10 pairs per session to avoid fatigue | No pauses — endlessly refilled phrases |
| Human dynamics | Do swells feel like hands or like automation curves | Focus on accents and cresc./decresc., rate 1–7 | Same session, same form; one relisten allowed, note if the score changed | Perfect volume automation |
| Taste of flaws | Do small imperfections make it more believable | Find "imperfect but right" moments; count + describe | Timestamp (mm:ss) per moment + one-line note, free-text column | Either zero flaws, or errors without logic |
| Performer presence | Can you picture a specific person playing | Overall judgment, rate 1–7 | Fill at the end of each track; add "who do you imagine playing this?" | "No one there — only sound" |

#### ② Intentionality (is there a "why" behind choices)
| Dimension | What it is | How to audit | How to collect | Expected AI failure |
| --- | --- | --- | --- | --- |
| Earned surprises | After breaking expectation, is it "caught" | Find surprise moments, rate "was it caught?" 1–7 | Full-track listening (needs full-length audio); pause at each surprise, timestamp + rate; record 0 if none | Surprise with no consequence — like a glitch |
| Purposeful motion | Is the piece going somewhere | After full listen, judge "where does it want to go" | Write one sentence first, then rate 1–7 (text before score to avoid anchoring) | Exquisite loops going nowhere |
| Convincing ending | Does it end by "arriving" or just "stopping" | Listen to the final 20 s only, rate 1–7 | Separate session: batch-cut final 20 s of every track (script provided), rate blind in sequence | Fade-out escape / abrupt halt |

#### ③ Emotion (authenticity and impact)
| Dimension | What it is | How to audit | How to collect | Expected AI failure |
| --- | --- | --- | --- | --- |
| Being moved | Any moment of chills / a sinking heart | Record timestamp + intensity 1–7 | Real-time capture: pause when moved, note mm:ss, add intensity after; 0 if never | "Pleasant but nothing lands" |
| Emotional specificity | Is the emotion specific or generic | Describe in one word, then rate specificity | Word first, score second; post-hoc coding of words (generic vs specific) | Only "happy/sad"-level words possible |
| Emotional journey | Does the emotion travel | Compare opening vs ending mood | Play only first 30 s and last 30 s (cuts); one word each; rate "distance traveled" 1–7 | One emotion wallpapered throughout |

#### ④ Culture (is the style spoken natively)
| Dimension | What it is | How to audit | How to collect | Expected AI failure |
| --- | --- | --- | --- | --- |
| Idiomatic fluency | Native speaker of the genre, or textbook learner | Genre-fluent judges rate 1–7 | Split sessions by genre; 1–2 genre-fluent judges each (you + peers); abstain on unfamiliar genres | Perfect grammar, zero accent |
| Cliché-ness | Homage or averaged-out collage | Can you name whose shadow this is | Free text: "who does this sound like?" — a nameable answer vs none; track hit-rate | Sounds like everyone = sounds like no one |
| Era/scene fit | Do sound choices match the style's era | Point out one anachronistic sound | Free text: at most one "time-traveling" timbre per track + one-line why | Unwitting mash-ups |

#### ⑤ Persona and overall
| Dimension | What it is | How to audit | How to collect | Expected AI failure |
| --- | --- | --- | --- | --- |
| Persona coherence | Is it "the same person" start to finish | Rate 1–7 | Fill at the end of full-track sessions; if "someone else took over", note the section | Sections feel like different players |
| Blind call + confidence | Gut call AI/human + certainty | Two-way choice + confidence 1–7 + one-line reason | Do this FIRST in each session (before other dimensions leak answers); A/B order randomized; reason mandatory | — (the reason texts feed back into feature design) |

> Collection infrastructure (shared): file-blinding + playback-order randomization script,
> batch cutting (final 20 s / first & last 30 s), and rating-form templates — all three provided by us.
> First batch of material: the 72-clip listening set.
