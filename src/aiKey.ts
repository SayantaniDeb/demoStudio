let userKey = '';
export function setUserGroqKey(value: string) {
  userKey = value.trim();
}
export function groqHeaders(): Record<string, string> {
  return userKey ? { 'X-Groq-Api-Key': userKey } : {};
}
