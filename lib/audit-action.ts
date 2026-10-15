export const auditActionLabels = {
  login: "Signed in",
  logout: "Signed out",
  logout_all: "Signed out everywhere",
  token_refresh: "Session refreshed",
  token_validate: "Session validated",
  app_authorize: "Application authorized",
  sso_check: "SSO access checked",
  sso_logout: "SSO signed out",
  office_created: "Office created",
  office_updated: "Office updated",
  position_created: "Position created",
  position_updated: "Position updated",
} as const;

export function auditActionLabel(action: unknown): string {
  if (typeof action !== "string" || !action.trim()) return "Unknown event";
  if (Object.hasOwn(auditActionLabels, action)) {
    return auditActionLabels[action as keyof typeof auditActionLabels];
  }
  const words = action.trim().split(/[_\s]+/).filter(Boolean);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Unknown event";
}
