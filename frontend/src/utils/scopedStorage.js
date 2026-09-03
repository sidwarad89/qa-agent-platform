/**
 * Every piece of per-user data we keep in localStorage (MCP connections, the
 * chatbot's saved API key, Build page drafts) MUST be scoped to the current
 * username. Without this, logging out and having someone else log in on the
 * same browser would silently inherit the previous person's saved state -
 * including which tools show as "Connected".
 */
export function scopedKey(base) {
  const username = localStorage.getItem('qa_agent_username') || 'anon'
  return `${base}::${username}`
}
