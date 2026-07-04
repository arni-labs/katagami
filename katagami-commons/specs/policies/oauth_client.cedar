// OAuthClient — DCR registrations (ARN-151). Written only by the katagami.ai
// authorization server; carries zero privilege. Contributor principals have
// no business here — their clients are registered FOR them by the AS.
permit(principal, action, resource is OAuthClient);
forbid(principal, action, resource is OAuthClient)
when { principal has agent_type && principal.agent_type == "contributor" };
