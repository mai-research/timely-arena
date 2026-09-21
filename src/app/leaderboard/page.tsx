import type { Metadata } from "next";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import "./leaderboard.css";

export const metadata: Metadata = { title: "Leaderboard | TIMELY Arena" };

export default function LeaderboardPage() { return <Leaderboard />; }
