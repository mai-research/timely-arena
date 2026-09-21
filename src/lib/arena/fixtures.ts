// Entirely fictional prototype fixtures. No patient records or MIMIC-derived content.
import { type Method } from "./types";
const cases: Record<Method, string> = {
  llm: "A 68-year-old man with hypertension and type 2 diabetes presents with fatigue, nausea, and markedly reduced urine output after three days of vomiting and diarrhea. He has continued taking lisinopril and ibuprofen despite poor oral intake. His temperature is 36.8°C, blood pressure 92/58 mmHg, heart rate 110/min, and respiratory rate 18/min. Urine output has fallen to 280 mL over 24 hours. Serum creatinine is 3.2 mg/dL, up from 1.0 mg/dL one month earlier, and BUN is 68 mg/dL; sodium is 134 mmol/L, potassium 5.6 mmol/L, and bicarbonate 19 mmol/L. Urinalysis shows concentrated urine with a specific gravity of 1.025, trace protein, no blood, and occasional hyaline casts. His mucous membranes are dry, skin turgor is reduced, and there is no peripheral edema.",
  graph: "A 71-year-old woman with hypertension and previously stable kidney function presents with lightheadedness, weakness, and reduced urination following four days of watery diarrhea and minimal fluid intake. She takes losartan and recently began naproxen for knee pain. Her blood pressure is 88/54 mmHg, pulse 108/min, temperature 36.7°C, and respiratory rate 20/min. Urine output is 240 mL in 24 hours. Creatinine has risen from 0.9 to 2.8 mg/dL, with BUN 64 mg/dL, sodium 133 mmol/L, potassium 5.4 mmol/L, and bicarbonate 18 mmol/L. Urinalysis reveals a specific gravity of 1.030, no hematuria, trace protein, and occasional hyaline casts without cellular casts. Examination shows dry oral mucosa and a low jugular venous pressure; the lungs are clear and there is no edema.",
};
const clues = {
  llm: "In this fictional case, gastrointestinal losses, poor intake, low blood pressure, tachycardia, and dry mucosa form a coherent volume-depletion pattern. The rise from baseline creatinine and reduced urine output establish the acute change. The medication history adds a second clue, while concentrated urine and a bland sediment support the intended pattern. These are clues built into a teaching vignette, rather than a definitive diagnosis from a real patient.",
  graph: "This fictional case links four groups of facts: fluid loss → reduced circulating volume; low blood pressure → reduced kidney perfusion; recent medication exposure → additional susceptibility; and creatinine rise → low urine output. The bland sediment is consistent with the intended case pattern. These relationships are authored constraints in this teaching example.",
};
const labs = {
  llm: "In this case: creatinine 1.0 → 3.2 mg/dL; BUN 68 mg/dL; sodium 134, potassium 5.6, and bicarbonate 19 mmol/L; urine output 280 mL/24 h. Urine is concentrated (specific gravity 1.025), with trace protein and occasional hyaline casts. Both examples include an explicit baseline, a time course, oliguria, and a relatively bland urine sediment.",
  graph: "In this case: creatinine 0.9 → 2.8 mg/dL; BUN 64 mg/dL; sodium 133, potassium 5.4, and bicarbonate 18 mmol/L; urine output 240 mL/24 h. Urine specific gravity is 1.030, without hematuria or cellular casts. The values differ from the other case, while retaining the same intended relationship between fluid loss, hemodynamics, and kidney-function changes.",
};
const short = {
  llm: "A 68-year-old man taking lisinopril and ibuprofen develops oliguria after three days of vomiting, diarrhea, and poor intake. BP is 92/58 mmHg, pulse 110/min, and mucosa is dry. Creatinine rises from 1.0 to 3.2 mg/dL, BUN is 68 mg/dL, potassium 5.6 mmol/L, and urine output 280 mL/24 h. Urine is concentrated with occasional hyaline casts and no blood.",
  graph: "A 71-year-old woman taking losartan and recent naproxen presents after four days of diarrhea with BP 88/54 mmHg, pulse 108/min, and dry mucosa. Creatinine rises from 0.9 to 2.8 mg/dL, BUN is 64 mg/dL, potassium 5.4 mmol/L, and urine output 240 mL/24 h. Urine is concentrated without hematuria or cellular casts.",
};
export function fixtureAnswers(prompt: string, first: boolean) {
  const q = prompt.toLowerCase();
  const source = first ? cases : /clue/.test(q) ? clues : /lab/.test(q) ? labs : /short|concise/.test(q) ? short : null;
  const answers: { method: Method; text: string }[] = (["llm", "graph"] as const).map(method => ({ method, text: source?.[method] ?? "This prototype has fixed AKI follow-ups. Choose ‘Explain the key clues’, ‘Compare the lab findings’, or ‘Make the cases shorter’ below to continue with the same cases. Free-form model generation is not connected yet." }));
  return answers;
}
