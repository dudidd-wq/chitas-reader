// Wiktionary quality templates that disqualify a definition (round-3 review: never use a definition Wiktionary itself
// marks as defective, conjectural, unclear, unsourced, incomplete or needing a rewrite).
// SENSE_FLAGS: tested on one sense (definition line + its quotations).
// ENTRY_FLAGS: tested on the entry outside its senses and on the top of the page — such a flag disqualifies every sense.
export const SENSE_FLAGS = /\{\{\s*(פירוש לקוי|הגדרה לקויה|משוערת|הבהרה|דרוש מקור|לשכתוב|שכתוב|להשלים|השלמה|קצרמר[^|}]*|מפוקפק|בדיקה|לבדוק|ספק)\s*[|}]/;
export const ENTRY_FLAGS = /\{\{\s*(פירוש לקוי|הגדרה לקויה|לשכתוב|שכתוב|להשלים|השלמה|קצרמר[^|}]*|מפוקפק|בדיקה|לבדוק)\s*[|}]/;
