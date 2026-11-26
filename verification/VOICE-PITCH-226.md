# VOICE-PITCH-226 – TD-PSOLA male-voice distortion fix (A3, engine 3)

Contract of `site/js/voice-pitch.js` from 1.0.226:

- `TIMBRES.male` stays `{ semitones: -6, formant: 0.88 }`; `deep` stays `{ -8, 0.82 }`. This release fixes distortion; it does not lower pitch further.
- `psola` now normalises `y[i] / wsum[i]` in voiced regions whenever `wsum[i] > 0.1` (was `> 1`). When F0 is lowered, grain spacing grows and `wsum` often dips below 1; skipping normalisation there caused periodic amplitude modulation ("metallic buzz") in vowels. The unvoiced exact-copy path at unchanged tempo is unchanged.
- When `formant < 1`, `keepUnvoiced` restores unvoiced stretches (fricatives, bursts, silence: ש/ס/צ) from the original signal, time-stretched with 20 ms 50%-overlap Hann OLA (no spectral shift), and crossfades them with the formant-shifted voiced signal over 12 ms. Voiced stretches still go through `resample` + PSOLA. The `formant === 1` path (female / natural with a manual pitch offset) still runs PSOLA only.
- Tests: `tests/voice-pitch.test.mjs` adds envelope peak/valley stability at the male ratio, unvoiced spectral-centroid preservation vs global resampling, and length/RMS/F0/boundary-step checks. The "F1 kept" check uses band-energy ratios instead of a single DFT bin (the bin hopped between harmonics once the AM distortion was gone). The tts-eval golden speech/IPA snapshot is unchanged.
- External review (agy, Gemini 4 Hydrogen High): SHIP 9.7, harmful_error_count 0.
