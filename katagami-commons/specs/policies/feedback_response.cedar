// FeedbackResponse — open access for local development.
// The public UI submits via a server action holding the server-side bearer
// token; the browser never talks to Temper directly.
permit(principal, action, resource is FeedbackResponse);
