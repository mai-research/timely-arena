import type { PatientId } from "./types";

export type PatientProfile = {
  id: PatientId;
  age: number;
  sex: "male" | "female";
  medicalHistory: string[];
  medications: string[];
};

export const PATIENT_PROFILES: Record<PatientId, PatientProfile> = {
  "patient-68m": {
    id: "patient-68m", age: 68, sex: "male",
    medicalHistory: ["Hypertension", "Type 2 diabetes"],
    medications: ["Lisinopril", "Ibuprofen"],
  },
  "patient-71f": {
    id: "patient-71f", age: 71, sex: "female",
    medicalHistory: ["Hypertension"],
    medications: ["Losartan", "Recent naproxen"],
  },
};

export const STAGES = [
  { id: "baseline", title: "Baseline" },
  { id: "onset", title: "Symptom onset" },
  { id: "presentation", title: "Presentation" },
  { id: "reassessment", title: "Reassessment" },
  { id: "followup", title: "Recovery / follow-up" },
] as const;

export const READING_FIELDS = [
  { key: "creatinine", label: "Creatinine", unit: "mg/dL", decimals: 1 },
  { key: "bun", label: "BUN", unit: "mg/dL", decimals: 0 },
  { key: "urineOutput", label: "Urine output", unit: "mL/24 h", decimals: 0 },
  { key: "potassium", label: "Potassium", unit: "mmol/L", decimals: 1 },
  { key: "sodium", label: "Sodium", unit: "mmol/L", decimals: 0 },
  { key: "bicarbonate", label: "Bicarbonate", unit: "mmol/L", decimals: 0 },
  { key: "bloodPressure", label: "Blood pressure", unit: "mmHg", decimals: 0 },
  { key: "heartRate", label: "Heart rate", unit: "/min", decimals: 0 },
] as const;
export type ReadingKey = (typeof READING_FIELDS)[number]["key"];
export type Readings = Record<Exclude<ReadingKey, "bloodPressure">, number | null> & { bloodPressure: [number, number] | null };
export type TrajectoryStage = {
  id: (typeof STAGES)[number]["id"];
  time: string;
  offsetHours: number;
  conditions: string[];
  summary: string;
  readings: Readings;
  details: { urinalysis: string | null; examination: string | null };
};
export type PatientTrajectory = {
  profile: PatientProfile;
  stages: TrajectoryStage[];
  provenance: { kind: "authored-synthetic"; graphVersion: string; nodeIds: string[]; edgeIds: string[] };
};

export function patientLabel(profile: PatientProfile) {
  return `${profile.age}-year-old ${profile.sex === "male" ? "man" : "woman"}`;
}

export function formatReading(key: ReadingKey, value: Readings[ReadingKey]) {
  if (value === null) return "Not recorded";
  if (Array.isArray(value)) return value.join("/");
  return value.toFixed(READING_FIELDS.find(f => f.key === key)!.decimals);
}

export function trajectoryText(trajectory: PatientTrajectory) {
  const { profile, stages } = trajectory;
  return [
    `${patientLabel(profile)} · ${profile.medicalHistory.join(", ")}`,
    `Medication background: ${profile.medications.join(", ")}.`,
    ...stages.map(stage => [
      `${STAGES.find(s => s.id === stage.id)!.title} · ${stage.time}`,
      stage.conditions.join(" · "), stage.summary,
      READING_FIELDS.map(f => `${f.label}: ${formatReading(f.key, stage.readings[f.key])}${stage.readings[f.key] === null ? "" : ` ${f.unit}`}`).join("; "),
      `Urinalysis: ${stage.details.urinalysis ?? "Not recorded"}`,
      `Examination: ${stage.details.examination ?? "Not recorded"}`,
    ].join("\n")),
    "Synthetic demo. Values and graph associations are authored fixtures; no patient records or live generation.",
  ].join("\n\n");
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === "string" && s.length > 0);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Only complete stage objects are streamed. Incomplete responses may contain a prefix of the five stages.
export function validTrajectory(value: unknown, complete: boolean): value is PatientTrajectory {
  if (!object(value) || !object(value.profile) || !object(value.provenance) || !Array.isArray(value.stages)) return false;
  const { profile, provenance, stages } = value;
  const canonical = profile.id === "patient-68m" || profile.id === "patient-71f" ? PATIENT_PROFILES[profile.id] : undefined;
  if (!canonical || profile.age !== canonical.age || profile.sex !== canonical.sex ||
    !strings(profile.medicalHistory) || !strings(profile.medications) ||
    JSON.stringify(profile.medicalHistory) !== JSON.stringify(canonical.medicalHistory) ||
    JSON.stringify(profile.medications) !== JSON.stringify(canonical.medications)) return false;
  if (provenance.kind !== "authored-synthetic" || typeof provenance.graphVersion !== "string" || !provenance.graphVersion ||
    !strings(provenance.nodeIds) || !strings(provenance.edgeIds)) return false;
  if (stages.length > STAGES.length || (complete && stages.length !== STAGES.length)) return false;
  return stages.every((s, i) => {
    if (!object(s) || s.id !== STAGES[i].id || typeof s.time !== "string" || !s.time ||
      typeof s.offsetHours !== "number" || !Number.isFinite(s.offsetHours) ||
      (i > 0 && s.offsetHours <= stages[i - 1].offsetHours) || !strings(s.conditions) || !s.conditions.length ||
      typeof s.summary !== "string" || !s.summary || !object(s.readings) || !object(s.details)) return false;
    if (!Object.values(s.details).every(v => v === null || typeof v === "string") ||
      !("urinalysis" in s.details) || !("examination" in s.details)) return false;
    const readings = s.readings;
    return READING_FIELDS.every(({ key }) => {
      const r = readings[key];
      if (r === null) return true;
      return key === "bloodPressure" ? Array.isArray(r) && r.length === 2 && r.every(positive) && r[0] > r[1] : positive(r);
    });
  });
}
