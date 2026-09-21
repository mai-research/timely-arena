// Authored synthetic courses informed by the bundled graph, not graph-returned patient observations.
// This module is used by the API and tests; the full graph is never imported by the chat UI.
import graph from "@/lib/admin/snapshots/synthetic-demo.json";
import { PATIENT_PROFILES, STAGES, READING_FIELDS, formatReading, patientLabel, trajectoryText, type PatientTrajectory, type Readings, type TrajectoryStage } from "./trajectory";
import { TRAJECTORY_FOLLOWUPS, type ChatConfig, type ComparisonAnswer, type Method, type PatientId } from "./types";

function stage(
  id: TrajectoryStage["id"], time: string, offsetHours: number,
  conditions: string[], summary: string, readings: Partial<Readings> = {},
  details: Partial<TrajectoryStage["details"]> = {},
): TrajectoryStage {
  return {
    id, time, offsetHours, conditions, summary,
    readings: { creatinine: null, bun: null, urineOutput: null, potassium: null, sodium: null, bicarbonate: null, bloodPressure: null, heartRate: null, ...readings },
    details: { urinalysis: null, examination: null, ...details },
  };
}

const courses: Record<PatientId, Record<Method, TrajectoryStage[]>> = {
  "patient-68m": {
    llm: [
      stage("baseline", "1 month before", -720, ["Stable kidney function"],
        "A routine check records stable kidney function. He lives independently with hypertension and type 2 diabetes.",
        { creatinine: 1.0 }),
      stage("onset", "Day −3", -72, ["Gastrointestinal fluid loss"],
        "Vomiting and diarrhea begin. He eats and drinks less but continues lisinopril and ibuprofen. No measurements are taken at home."),
      stage("presentation", "Day 0 · Arrival", 0, ["Acute kidney injury", "Volume depletion", "Oliguria"],
        "Fatigue, nausea and markedly reduced urination prompt a hospital visit. Creatinine has risen from the prior baseline during this acute illness.",
        { creatinine: 3.2, bun: 68, urineOutput: 280, potassium: 5.6, sodium: 134, bicarbonate: 19, bloodPressure: [92, 58], heartRate: 110 },
        { urinalysis: "Specific gravity 1.025; trace protein, no blood, occasional hyaline casts.", examination: "Dry mucous membranes and reduced skin turgor. No peripheral edema. Temperature 36.8°C; respiratory rate 18/min." }),
      stage("reassessment", "Day +1 · 24 hours", 24, ["AKI improving", "Urine output increasing"],
        "Following fluid replacement and a medication review, blood pressure and urine output improve. Kidney function has not yet returned to baseline.",
        { creatinine: 2.2, bun: 49, urineOutput: 1050, potassium: 4.8, sodium: 137, bicarbonate: 22, bloodPressure: [112, 70], heartRate: 88 },
        { examination: "Mucous membranes are less dry; lungs remain clear and there is no edema." }),
      stage("followup", "Day +7 · Follow-up", 168, ["Kidney function near baseline"],
        "Oral intake and usual activity have resumed. Follow-up measurements show continued improvement toward his previous kidney function.",
        { creatinine: 1.1, bun: 23, urineOutput: 1650, potassium: 4.3, sodium: 139, bicarbonate: 25, bloodPressure: [128, 76], heartRate: 76 },
        { urinalysis: "Specific gravity 1.015; no blood or protein.", examination: "Comfortable, moist mucous membranes and no peripheral edema." }),
    ],
    graph: [
      stage("baseline", "1 month before", -720, ["Stable kidney function"],
        "His previous kidney function is stable. Hypertension, diabetes and the same medication background provide the starting context for this separate synthetic course.",
        { creatinine: 1.1, bun: 22 }),
      stage("onset", "Day −2", -48, ["Poor intake", "Gastrointestinal fluid loss"],
        "Diarrhea and intermittent vomiting reduce fluid intake. At an early assessment he reports dizziness on standing and continued use of his usual medicines.",
        { bloodPressure: [106, 68], heartRate: 94 },
        { examination: "Mildly dry oral mucosa; no edema." }),
      stage("presentation", "Day 0 · Arrival", 0, ["Acute kidney injury", "Volume depletion", "Oliguria"],
        "Weakness and reduced urine output progress. The acute creatinine change, low blood pressure and concentrated urine form a consistent volume-depletion pattern.",
        { creatinine: 2.7, bun: 56, urineOutput: 420, potassium: 5.2, sodium: 135, bicarbonate: 20, bloodPressure: [96, 62], heartRate: 102 },
        { urinalysis: "Specific gravity 1.028; trace protein, no blood, occasional hyaline casts.", examination: "Dry oral mucosa, low jugular venous pressure and clear lungs. No peripheral edema." }),
      stage("reassessment", "Day +1 · 36 hours", 36, ["AKI improving", "Volume status improving"],
        "Fluid replacement and medication review are followed by improved perfusion. Creatinine falls, while repeat measurements still show incomplete recovery.",
        { creatinine: 1.9, bun: 39, urineOutput: 1250, potassium: 4.6, sodium: 138, bicarbonate: 23, bloodPressure: [116, 72], heartRate: 84 },
        { examination: "Dizziness has settled; mucous membranes are moist and there is no edema." }),
      stage("followup", "Day +5 · Follow-up", 120, ["Kidney function near baseline"],
        "He is eating and drinking normally. Creatinine approaches the previous baseline, with stable blood pressure and restored urine output.",
        { creatinine: 1.2, bun: 24, urineOutput: 1700, potassium: 4.2, sodium: 140, bicarbonate: 25, bloodPressure: [126, 76], heartRate: 74 },
        { urinalysis: "Specific gravity 1.014; no blood or protein.", examination: "Well hydrated, clear lungs and no edema." }),
    ],
  },
  "patient-71f": {
    llm: [
      stage("baseline", "1 month before", -720, ["Stable kidney function"],
        "A previous review records stable kidney function in a woman with hypertension. Her medication background includes losartan and recent naproxen use.",
        { creatinine: 0.8 }),
      stage("onset", "Day −3", -72, ["Diarrhea", "Reduced fluid intake"],
        "Frequent watery stools and poor intake develop. She feels increasingly tired and continues taking losartan and naproxen. No home readings are available."),
      stage("presentation", "Day 0 · Arrival", 0, ["Acute kidney injury", "Volume depletion", "Oliguria"],
        "Lightheadedness and reduced urination lead to assessment. The recent fluid loss accompanies an acute rise in creatinine and low blood pressure.",
        { creatinine: 2.4, bun: 51, urineOutput: 390, potassium: 5.2, sodium: 134, bicarbonate: 20, bloodPressure: [94, 60], heartRate: 104 },
        { urinalysis: "Specific gravity 1.027; trace protein, no blood, occasional hyaline casts.", examination: "Dry mouth and reduced skin turgor. Lungs are clear with no edema." }),
      stage("reassessment", "Day +1 · 24 hours", 24, ["AKI improving", "Ongoing diarrhea"],
        "After fluid replacement and medication review, urine output rises. Some diarrhea persists, so intake, fluid balance and kidney function continue to be monitored.",
        { creatinine: 1.8, bun: 38, urineOutput: 900, potassium: 4.7, sodium: 137, bicarbonate: 22, bloodPressure: [108, 66], heartRate: 90 },
        { examination: "Less postural dizziness and improving mucosal moisture. No edema." }),
      stage("followup", "Day +7 · Follow-up", 168, ["Kidney function near baseline"],
        "Diarrhea has resolved and normal intake has resumed. Follow-up testing shows kidney function returning toward the earlier baseline.",
        { creatinine: 0.9, bun: 20, urineOutput: 1550, potassium: 4.2, sodium: 139, bicarbonate: 25, bloodPressure: [124, 74], heartRate: 76 },
        { urinalysis: "Specific gravity 1.014; no blood or protein.", examination: "Moist mucous membranes, clear lungs and no edema." }),
    ],
    graph: [
      stage("baseline", "1 month before", -720, ["Stable kidney function"],
        "Previous kidney function is stable. Hypertension and use of losartan, with recent naproxen exposure, form the background to this episode.",
        { creatinine: 0.9 }),
      stage("onset", "Day −4", -96, ["Diarrhea", "Reduced fluid intake"],
        "Watery diarrhea and minimal fluid intake begin. Lightheadedness develops over the next few days. She continues losartan and recently started naproxen."),
      stage("presentation", "Day 0 · Arrival", 0, ["Acute kidney injury", "Volume depletion", "Oliguria"],
        "Weakness, lightheadedness and reduced urination prompt assessment. The creatinine rise accompanies hypotension and signs of reduced circulating volume.",
        { creatinine: 2.8, bun: 64, urineOutput: 240, potassium: 5.4, sodium: 133, bicarbonate: 18, bloodPressure: [88, 54], heartRate: 108 },
        { urinalysis: "Specific gravity 1.030; trace protein, no hematuria, occasional hyaline casts and no cellular casts.", examination: "Dry oral mucosa and low jugular venous pressure. Clear lungs, no edema. Temperature 36.7°C; respiratory rate 20/min." }),
      stage("reassessment", "Day +1 · 24 hours", 24, ["AKI improving", "Urine output increasing"],
        "Fluid replacement and a medication review are followed by better blood pressure and urine output. Repeat blood tests show improvement, with kidney function still above baseline.",
        { creatinine: 2.0, bun: 45, urineOutput: 1100, potassium: 4.7, sodium: 136, bicarbonate: 22, bloodPressure: [110, 68], heartRate: 86 },
        { examination: "Improving oral hydration, clear lungs and no edema." }),
      stage("followup", "Day +5 · Follow-up", 120, ["Kidney function near baseline"],
        "Normal intake has resumed and dizziness has resolved. Follow-up creatinine approaches her previous baseline alongside restored urine output.",
        { creatinine: 1.0, bun: 22, urineOutput: 1600, potassium: 4.1, sodium: 139, bicarbonate: 25, bloodPressure: [126, 74], heartRate: 74 },
        { urinalysis: "Specific gravity 1.015; no blood or protein.", examination: "Moist oral mucosa, clear lungs and no peripheral edema." }),
    ],
  },
};

export function fixtureTrajectory(patientId: PatientId, method: Method): PatientTrajectory {
  return structuredClone({
    profile: PATIENT_PROFILES[patientId], stages: courses[patientId][method],
    provenance: {
      kind: "authored-synthetic" as const, graphVersion: graph.version,
      // Concepts inform the authored observations. Electrolyte nodes provide concepts, not patient ranges.
      nodeIds: ["demo_aki", "demo_recovery", "demo_creatinine", "demo_urine", "demo_pressure", "demo_nsaid", patientId === "patient-68m" ? "demo_ace" : "demo_arb", "demo_bicarbonate", "demo_bun", "demo_pulse", "demo_potassium", "demo_sodium", "demo_baseline", "demo_volume"],
      // Synthetic UI associations only; these references are not clinical evidence.
      edgeIds: ["demo_edge_062", patientId === "patient-68m" ? "demo_edge_064" : "demo_edge_065", "demo_edge_105", "demo_edge_309", "demo_edge_357", "demo_edge_736", "demo_edge_737", "demo_edge_738"],
    },
  });
}

export function trajectoryAnswers(config: Extract<ChatConfig, { kind: "trajectory" }>): ComparisonAnswer[] {
  return (["llm", "graph"] as const).map(method => {
    const id = config.patientMode === "shared" ? config.sharedPatientId : method === "llm" ? "patient-68m" : "patient-71f";
    const trajectory = fixtureTrajectory(id, method);
    return { method, text: trajectoryText(trajectory), trajectory };
  });
}

export function trajectoryFollowup(prompt: string, config: Extract<ChatConfig, { kind: "trajectory" }>): ComparisonAnswer[] {
  const q = prompt.toLowerCase().trim();
  return trajectoryAnswers(config).map(({ method, trajectory: t }) => {
    const trajectory = t!;
    const [baseline, onset, arrival, review, followup] = trajectory.stages;
    let text: string;
    if (/^explain the key changes[?.]?$/.test(q)) {
      text = `${patientLabel(trajectory.profile)}. ${onset.summary} At presentation, creatinine is ${formatReading("creatinine", arrival.readings.creatinine)} mg/dL (previously ${formatReading("creatinine", baseline.readings.creatinine)}), blood pressure is ${formatReading("bloodPressure", arrival.readings.bloodPressure)} mmHg and urine output is ${arrival.readings.urineOutput} mL/24 h. These observations support the volume-depletion pattern written into this example. ${review.summary} ${followup.summary}`;
    } else if (/^compare readings over time[?.]?$/.test(q)) {
      text = `${patientLabel(trajectory.profile)}\n\n` + ["creatinine", "bun", "urineOutput", "potassium", "sodium", "bicarbonate", "bloodPressure", "heartRate"].map(key => {
        const field = READING_FIELDS.find(f => f.key === key)!;
        return `${field.label} (${field.unit})\n` + trajectory.stages.map(s => `${s.time}: ${formatReading(field.key, s.readings[field.key])}`).join(" → ");
      }).join("\n\n");
    } else if (/^summarize the trajectory[?.]?$/.test(q)) {
      text = `${patientLabel(trajectory.profile)} · ${trajectory.profile.medicalHistory.join(", ")}\n\n` + trajectory.stages.map(s => `${STAGES.find(p => p.id === s.id)!.title} (${s.time}): ${s.conditions.join(", ")}. ${s.readings.creatinine === null ? "Creatinine not recorded." : `Creatinine ${formatReading("creatinine", s.readings.creatinine)} mg/dL.`}`).join("\n\n");
    } else {
      text = `This demo has fixed trajectory follow-ups: ${TRAJECTORY_FOLLOWUPS.map(s => `“${s}”`).join(", ")}. These use the same saved synthetic course. Free-form model generation is not connected yet.`;
    }
    return { method, text };
  });
}
