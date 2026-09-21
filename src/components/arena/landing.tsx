"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlignLeft, Route, UserRound, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import { DitherBackground } from "./dither-background";
import { TitleWordmark } from "./wordmark";
import { PromptInput } from "@/components/agentui/prompt-input";
import { Select } from "@/components/agentui/select";
import { createSession, useHistory } from "./history-store";
import { PATIENT_PROFILES, patientLabel } from "@/lib/arena/trajectory";
import type { ChatConfig, PatientId } from "@/lib/arena/types";

export const PROMPT = "Generate a realistic one-paragraph clinical case of acute kidney injury (AKI) in an adult patient. Include age, presenting symptoms, relevant medical history, recent events or medications, vital signs, urine output, creatinine/BUN, electrolytes, urinalysis findings, and one or two physical examination findings. Do not state the diagnosis explicitly; provide enough clues for the reader to identify the likely cause of AKI.";

export function Landing() {
  const router = useRouter();
  const noteId = useId();
  const submitting = useRef(false);
  const { ready } = useHistory();
  const [kind, setKind] = useState<ChatConfig["kind"]>("text");
  const [patientMode, setPatientMode] = useState<"shared" | "paired" | null>(null);
  const [sharedPatientId, setSharedPatientId] = useState<PatientId>("patient-71f");
  const config: ChatConfig | null = kind === "text" ? { kind } : patientMode === "shared" ? { kind, patientMode, sharedPatientId } : patientMode === "paired" ? { kind, patientMode } : null;
  const trajectoryPrompt = `Generate two synthetic AKI patient trajectories ${patientMode === "shared" ? `using the same ${patientLabel(PATIENT_PROFILES[sharedPatientId])} background` : "using the existing patient backgrounds"}. Show baseline, symptom onset, presentation, reassessment and recovery. Include disease conditions, clinical events and readings with units at each stage. Keep the background fixed; the readings and course may differ between the two responses.`;
  return <div className="landing-content">
    <DitherBackground />
    <TitleWordmark />
    <motion.div className="prompt-box" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "tween", duration: 0.55, delay: 0.25 }}>
      <PromptInput value={kind === "text" ? PROMPT : trajectoryPrompt}
        onSubmit={text => { if (ready && config && !submitting.current) { submitting.current = true; router.push(`/arena/${createSession(text, config)}`); } }}
        submitDisabled={!ready || !config} minRows={4} maxRows={18} sendLabel="Start comparison"
        readOnly spellCheck={false} aria-label="Clinical case prompt" aria-describedby={noteId}
        leadingAction={<>
          <Select<ChatConfig["kind"]> label="Chat type" value={kind} onValueChange={setKind} options={[
            { value: "text", label: "Text", icon: <AlignLeft size={14} />, description: "Compare two written clinical cases" },
            { value: "trajectory", label: "Patient trajectory", icon: <Route size={14} />, description: "Compare disease stages and patient readings" },
          ]} />
          {kind === "trajectory" && <Select<"shared" | "paired"> label="Patient setup" value={patientMode} onValueChange={setPatientMode}
            placeholder="Choose patients" options={[
              { value: "shared", label: "Same patient", icon: <UserRound size={14} />, description: "Shared background, separate synthetic courses" },
              { value: "paired", label: "Two patients", icon: <UsersRound size={14} />, description: "68-year-old man and 71-year-old woman" },
            ]} />}
          {kind === "trajectory" && patientMode === "shared" && <Select<PatientId> label="Shared patient background"
            value={sharedPatientId} onValueChange={setSharedPatientId}
            options={Object.values(PATIENT_PROFILES).map(profile => ({ value: profile.id, label: patientLabel(profile) }))} />}
        </>} />
      <p id={noteId} className="landing-prompt-note">{kind === "text" ? "Fixed AKI example" : !patientMode ? "Choose a patient setup to start." : patientMode === "shared" ? "Same background · Separate synthetic readings and courses" : "68-year-old man and 71-year-old woman · Separate synthetic courses"}</p>
    </motion.div>
  </div>;
}
