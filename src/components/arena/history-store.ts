"use client";

import { useEffect, useSyncExternalStore } from "react";
import { decodeHistory, HISTORY_KEY, newSession } from "@/lib/arena/history";
import { type ChatConfig, type Session } from "@/lib/arena/types";

type Snapshot = { sessions: Session[]; ready: boolean; storageError: boolean };
const empty: Snapshot = { sessions: [], ready: false, storageError: false };
let snapshot = empty;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;
const getServerSnapshot = () => empty;
function publish(next: Snapshot, save = true) {
  snapshot = next;
  if (save) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next.sessions)); }
    catch { snapshot = { ...next, storageError: true }; }
  }
  listeners.forEach(listener => listener());
}
export function initializeHistory() {
  if (snapshot.ready) return;
  try { publish({ sessions: decodeHistory(localStorage.getItem(HISTORY_KEY)), ready: true, storageError: false }, false); }
  catch { publish({ sessions: [], ready: true, storageError: true }, false); }
}
export function createSession(prompt: string, config: ChatConfig = { kind: "text" }) {
  const session = newSession(prompt, Math.random(), config);
  publish({ ...snapshot, sessions: [session, ...snapshot.sessions] });
  return session.id;
}
export function updateSession(id: string, patch: Partial<Pick<Session, "title" | "messages" | "vote" | "state">>) {
  // Session identity, patient setup and candidate order cannot change after creation.
  patch = Object.fromEntries(Object.entries(patch).filter(([key]) => ["title", "messages", "vote", "state"].includes(key)));
  const current = snapshot.sessions.find(s => s.id === id);
  if (!current || Object.entries(patch).every(([key, value]) => current[key as keyof Session] === value)) return;
  publish({ ...snapshot, sessions: snapshot.sessions.map(s => s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s) });
}
export function deleteSession(id: string) {
  publish({ ...snapshot, sessions: snapshot.sessions.filter(s => s.id !== id) });
}
export function findSession(id: string) { return snapshot.sessions.find(s => s.id === id); }
export function useHistory() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(initializeHistory, []);
  return value;
}
