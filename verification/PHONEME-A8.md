# A8: zero silent phoneme loss on the IPA → model path

## What this release does

The existing test titled “every symbol is in the voice's phoneme map” (`tests/g2p.test.mjs`) only checks that `ipaToIds` returns more than 40 integer ids. It does not inspect the IPA string, so a dropped phoneme would not fail it.

`ipaToIds` in `site/js/g2p.js` still skips a character that is not in the voice's `phoneme_id_map` (`if (!v) continue`). That behaviour is left unchanged: inventing a mapping just to silence the skip would be riskier than documenting it. `g2p.js` is an ENGINE-COV-1B pin and was not edited.

Silent loss of a *legitimate* phoneme is instead ruled out by a contract:

1. `textToIPA` already sanitizes its output to a closed alphabet (` .,!?aeiouʔvɡdhzχtjklmnsfʁʃbpˈʒw` in `g2p.js`).
2. Every symbol in that alphabet, and every symbol in the interned `PHONEME_CHARS` set, is present in both packaged voice maps (`he_IL-noa-medium.onnx.json` and `he_IL-ilspeech-male-medium.onnx.json`).
3. A corpus walk of all Torah and Tehillim chapters, plus Isaiah 1, Jeremiah 1, Daniel 1 and Ezra 4 (Biblical Aramaic), after `prepareForTTS` + `textToIPA`, produces **0 unmapped IPA symbols** on both voices.
4. Golden samples also pass under the Chabad havara.
5. The pad contract is preserved: noa keeps inter-phoneme pads (`chitas_pad` unset); the natural voice uses `chitas_pad: false`.
6. An unmapped probe (`Ω`, absent from both maps) is skipped and does not change the id sequence of the surrounding phonemes. No mapping was invented for it.

Tests: `tests/engine-phoneme-a8.test.mjs`.

## Int8 experiment (measured, not a default change)

Already in the package, as an opt-in “קול קל” for noa only:

| File | Size |
|---|---|
| `he_IL-noa-medium.onnx` (full, default) | 77,056,101 bytes (~74 MB) |
| `he_IL-noa-medium-int8.onnx` (opt-in) | 22,750,921 bytes (~22 MB) |
| `he_IL-ilspeech-male-medium.onnx` (natural) | 63,461,522 bytes (~61 MB) |

`natural-int8` is **not** packaged. It was not generated, downloaded, or offered in the UI. The default model remains `full`. wasm (`ort-wasm-simd-threaded.wasm`, ~15 MB) was not shrunk: there is no measurement in this release that a smaller runtime would stay correct.

A listening / RTF comparison of a hypothetical `natural-int8` is out of scope until such a file exists and is reviewed separately. noa-int8 remains the existing optional lighter build; this release does not change when it is chosen.

## What was not changed

- `site/js/g2p.js`, voice ONNX files, voice JSON maps, `ENGINE-COV-1B` pins.
- Display typography, `DATA_VERSION`, default voice.
- Blue is still out of the plan.
