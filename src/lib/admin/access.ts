import "server-only";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { adminDemoEnabled } from "./config";

export async function requireAdminDemo() {
  await connection();
  if (!adminDemoEnabled()) notFound();
}
