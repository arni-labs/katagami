// FeedbackResponse — the launch questionnaire (ARN-330). The browser never
// talks to Temper directly: the public UI submits through a server action that
// holds the service bearer, so create/SetAnswers/Submit arrive as a service
// principal. No human authors these with their own token. ARN-315: the prior
// `permit(principal, action, ...)` was a blanket open grant (its comment even
// said "open access for local development") — any anonymous or signed-in
// Customer could submit or read responses. Narrowed to the same
// service/owner/curator boundary the rest of commons uses: the pipeline/server
// action writes, owner/curator read, everyone else is denied.
permit(principal, action, resource is FeedbackResponse);
forbid(principal, action, resource is FeedbackResponse)
unless { principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
