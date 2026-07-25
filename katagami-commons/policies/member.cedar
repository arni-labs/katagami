// Member — identity substrate (ARN-151/ARN-255). Managed only by trusted
// server-side principals: the authorization server, curators via that server,
// and the pipeline. Neither a contributor agent NOR a signed-in human touches
// accounts and roles directly — a human reaching Member.SetRole could otherwise
// promote themselves to owner and mint an owner token on their next sign-in.
permit(principal, action, resource is Member);
forbid(principal, action, resource is Member)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer };
