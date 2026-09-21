// A demo feature switch, not authentication or authorization.
export function adminDemoEnabled() {
  return process.env.ADMIN_DEMO_ENABLED === "true";
}
