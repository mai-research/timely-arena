"""Generate the public synthetic UI graph; no external clinical sources are read."""
import hashlib
import json
import math
from pathlib import Path

NODES = [('aki', 'Acute Kidney Injury', 'Condition'), ('stage', 'AKI Stage 1', 'Stage'), ('recovery', 'Recovery of kidney function', 'Outcome'), ('creatinine', 'Serum creatinine', 'Measurement'), ('urine', 'Urine output', 'Measurement'), ('oliguria', 'Oliguria', 'Finding'), ('diarrhoea', 'Severe diarrhoea', 'Finding'), ('pressure', 'Hypotension', 'Finding'), ('nsaid', 'NSAIDs', 'Drug'), ('ace', 'ACE inhibitors', 'Drug'), ('arb', 'ARBs', 'Drug'), ('bicarbonate', 'Bicarbonate', 'Measurement'), ('bun', 'Blood urea nitrogen', 'Measurement'), ('pulse', 'Heart rate', 'Measurement'), ('potassium', 'Potassium', 'Measurement'), ('sodium', 'Sodium', 'Measurement'), ('baseline', 'Baseline serum creatinine', 'Measurement'), ('volume', 'Dehydration or volume depletion', 'Finding'), ('review', 'Fluid review', 'Intervention')]
EDGES = [('041', 'creatinine', 'aki'), ('042', 'creatinine', 'aki'), ('043', 'urine', 'aki'), ('049', 'urine', 'oliguria'), ('055', 'oliguria', 'aki'), ('062', 'nsaid', 'aki'), ('064', 'ace', 'aki'), ('065', 'arb', 'aki'), ('068', 'diarrhoea', 'aki'), ('071', 'pressure', 'aki'), ('105', 'aki', 'creatinine'), ('178', 'baseline', 'aki'), ('304', 'baseline', 'creatinine'), ('309', 'review', 'aki'), ('357', 'volume', 'aki'), ('736', 'creatinine', 'aki'), ('737', 'creatinine', 'aki'), ('738', 'urine', 'aki')]

graph = {
    "directed": True, "condition": "Synthetic AKI interface demo",
    "status": "Synthetic fixture · not clinical evidence",
    "nodes": [{"id": "demo_" + key, "name": name, "type": kind, "degree": 0} for key, name, kind in NODES],
    "edges": [{"id": "demo_edge_" + key, "source": "demo_" + source, "target": "demo_" + target,
               "relation": "demo_association", "evidence": "Authored synthetic UI association " + key + "; not extracted from a paper or guideline.",
               "source_id": "demo_source", "strength": "synthetic", "qualifiers": {"context": "UI demonstration only"}}
              for key, source, target in EDGES],
    "sources": [{"id": "demo_source", "title": "Project-authored synthetic graph fixture", "tier": 0, "source_kind": "synthetic", "hash": "synthetic-v1"}],
    "positions": {"demo_" + key: {"x": round(240 * math.cos(i * 2 * math.pi / len(NODES)), 2), "y": round(240 * math.sin(i * 2 * math.pi / len(NODES)), 2)} for i, (key, _, _) in enumerate(NODES)},
}
for node in graph["nodes"]:
    node["degree"] = sum(node["id"] in (edge["source"], edge["target"]) for edge in graph["edges"])
digest = hashlib.sha256(json.dumps(graph, sort_keys=True).encode()).hexdigest()
graph.update(sourceHash=digest, version="synthetic-demo-sha256-" + digest)
output = Path(__file__).resolve().parents[1] / "src/lib/admin/snapshots/synthetic-demo.json"
output.write_text(json.dumps(graph, indent=2) + "\n")
print(f"Generated {len(NODES)} synthetic nodes and {len(EDGES)} synthetic edges")
