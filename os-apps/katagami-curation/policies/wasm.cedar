// Katagami Curation WASM Module Authorization Policies

// Allow build_session_message to make HTTP calls (fetch context, create sessions)
permit(
    principal is Agent,
    action == Action::"http_call",
    resource is HttpEndpoint
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session"
};

// Allow WASM modules to access secrets (temper_api_url)
permit(
    principal is Agent,
    action == Action::"access_secret",
    resource is Secret
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session"
};
