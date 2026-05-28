// Katagami Curation WASM Module Authorization Policies

// Allow build_session_message to make HTTP calls (fetch context, create sessions)
permit(
    principal is Agent,
    action == Action::"http_call",
    resource is HttpEndpoint
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session" ||
    context.module == "launch_research"
};

// Allow WASM modules to access secrets (temper_api_url)
permit(
    principal is Agent,
    action == Action::"access_secret",
    resource is Secret
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session" ||
    context.module == "launch_research"
};


// Explicit runtime-service allow for governed WASM trigger execution.
// Some tenants evaluate trigger HTTP calls under the wasm runtime service
// agent rather than the curator Agent session. Keep this scoped to Katagami's
// three declared WASM modules and the http_call action needed for session
// bootstrap/finalization.
permit(
    principal == Agent::"service:wasm-runtime",
    action == Action::"http_call",
    resource is HttpEndpoint
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session" ||
    context.module == "launch_research" ||
    context.integration == "__trigger__:Submit:build_session_message" ||
    context.integration == "__trigger__:ConfigureAndSubmit:build_session_message"
};

// Explicit secret access for the same runtime-service trigger path.
permit(
    principal == Agent::"service:wasm-runtime",
    action == Action::"access_secret",
    resource is Secret
) when {
    context.module == "build_session_message" ||
    context.module == "finalize_spawned_session" ||
    context.module == "launch_research"
};


// Explicit allow for the actual governed trigger principal/resource shape
// observed in quality_review Submit denials. This is intentionally scoped to
// Katagami's build_session_message trigger endpoints, not general outbound IO.
permit(
    principal == Agent::"wasm-module",
    action == Action::"http_call",
    resource == HttpEndpoint::"__trigger__:Submit:build_session_message"
);

permit(
    principal == Agent::"wasm-module",
    action == Action::"http_call",
    resource == HttpEndpoint::"__trigger__:ConfigureAndSubmit:build_session_message"
);
