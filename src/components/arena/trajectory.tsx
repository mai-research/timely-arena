"use client";

import { ChevronDown } from "lucide-react";
import { AnswerHeader } from "./answer";
import { MessageTyping } from "@/components/agentui/message";
import { METHODS, type Comparison, type Session } from "@/lib/arena/types";
import { PATIENT_PROFILES, READING_FIELDS, STAGES, formatReading, patientLabel, type PatientProfile, type PatientTrajectory, type TrajectoryStage } from "@/lib/arena/trajectory";

function Profile({ profile }: { profile: PatientProfile }) {
  return <div className="trajectory-profile">
    <strong>{patientLabel(profile)}</strong>
    <p>{profile.medicalHistory.join(" · ")}</p>
    <span>{profile.medications.join(" · ")}</span>
  </div>;
}

function Stage({ stage, label, index, animateIn = false }: { stage: TrajectoryStage; label?: string; index: number; animateIn?: boolean }) {
  return <article className="trajectory-stage" data-animate={animateIn} aria-label={`${label ? `${label} · ` : ""}${STAGES[index].title}`}>
    <div className="trajectory-stage-meta"><span>{label && <b className="trajectory-mobile-label">{label} · </b>}0{index + 1}</span><span>{stage.time}</span></div>
    <h3>{STAGES[index].title}</h3>
    <p className="trajectory-conditions">{stage.conditions.join(" · ")}</p>
    <p className="trajectory-summary">{stage.summary}</p>
    <dl className="trajectory-readings">
      {READING_FIELDS.map(field => {
        const value = stage.readings[field.key];
        return <div key={field.key} className={value === null ? "reading-missing" : ""}>
          <dt>{field.label}</dt>
          <dd><strong>{formatReading(field.key, value)}</strong>{value !== null && <span>{field.unit}</span>}</dd>
        </div>;
      })}
    </dl>
    <details className="trajectory-details">
      <summary>Examination &amp; urinalysis<ChevronDown size={13} /></summary>
      <div><p><strong>Examination</strong>{stage.details.examination ?? "Not recorded"}</p>
        <p><strong>Urinalysis</strong>{stage.details.urinalysis ?? "Not recorded"}</p></div>
    </details>
  </article>;
}

function ExpandedTrajectory({ trajectory }: { trajectory: PatientTrajectory }) {
  return <div className="trajectory-expanded">
    <Profile profile={trajectory.profile} />
    <ol>{trajectory.stages.map((stage, index) => <li key={stage.id}><Stage stage={stage} index={index} /></li>)}</ol>
  </div>;
}

export function TrajectoryComparison({ session, comparison, loading, initialStageCount = 0 }: { session: Session; comparison?: Comparison; loading: boolean; initialStageCount?: number }) {
  const candidates = session.methods.map((method, slot) => {
    const answer = comparison?.answers.find(a => a.method === method);
    const patientId = session.patientMode === "shared" ? session.sharedPatientId : method === "llm" ? "patient-68m" : "patient-71f";
    return { method, label: `Assistant ${slot === 0 ? "A" : "B"}`, answer, profile: answer?.trajectory?.profile ?? PATIENT_PROFILES[patientId] };
  });
  const count = Math.min(...candidates.map(c => c.answer?.trajectory?.stages.length ?? 0));
  return <div className="trajectory-comparison" aria-label="Patient trajectory comparison" aria-busy={loading}>
    <div className="trajectory-caption"><span>Patient trajectory</span><span>{session.patientMode === "shared" ? "Same patient · Separate synthetic courses" : "Two patients · Separate synthetic courses"}</span></div>
    <div className="trajectory-headings">{candidates.map(c => <div className="trajectory-candidate" key={c.method}>
      <AnswerHeader label={c.label} method={session.vote ? METHODS[c.method] : undefined}
        text={c.answer?.text ?? ""} loading={loading} description="Synthetic patient trajectory · AKI" appearance="chat"
        expandedContent={c.answer?.trajectory && <ExpandedTrajectory trajectory={c.answer.trajectory} />} />
      <Profile profile={c.profile} />
    </div>)}</div>
    <ol className="trajectory-stages">{STAGES.slice(0, count).map((phase, index) => <li className="trajectory-pair" key={phase.id} data-stage={phase.id}>
      {candidates.map(c => <Stage key={c.method} stage={c.answer!.trajectory!.stages[index]} index={index} label={c.label} animateIn={index >= initialStageCount} />)}
    </li>)}</ol>
    {loading && <div className="trajectory-loading"><MessageTyping label={`Loading ${count === 0 ? "patient trajectories" : "next stage"}…`} /></div>}
  </div>;
}
