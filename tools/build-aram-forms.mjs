#!/usr/bin/env node
// Writes site/engine/aram-forms.json: the ARAM∖HEB form set used by the runtime
// applicability map (site/js/aram-speech.js). Speech layer only; does not touch site/data.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { corpusForms } from './aramaic-speech.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const dest = ROOT + 'site/engine/aram-forms.json';
const { ARAM } = corpusForms();
const list = [...ARAM].sort();
fs.mkdirSync(ROOT + 'site/engine', { recursive: true });
fs.writeFileSync(dest, JSON.stringify(list));
console.log(JSON.stringify({ n: list.length, bytes: fs.statSync(dest).size, path: 'site/engine/aram-forms.json' }));
