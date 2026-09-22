//! App contract tested through Temper's real dispatcher and reaction engine.
//! Copy into temper-server/tests and run with KATAGAMI_RETRY_ROOT set to this checkout.
//! Uses only local actors. No WASM runner: verifies dispatch, not finalizer quality work.
use serde_json::json;
use temper_runtime::{ActorSystem, tenant::TenantId};
use temper_server::{ServerState, registry::SpecRegistry, request_context::AgentContext};

fn root() -> std::path::PathBuf {
    std::env::var("KATAGAMI_RETRY_ROOT").unwrap().into()
}
fn read(path: &str) -> String {
    std::fs::read_to_string(root().join(path)).unwrap()
}
fn setup() -> ServerState {
    let art = read("katagami-commons/specs/art_style.ioa.toml")
        + r#"
[[action]]
name="FixtureBind"
from=["Draft"]
params=["verification_job_id", "prompt_template"]
"#;
    let job = read("katagami-curation/specs/curation_job.ioa.toml")
        + r#"
[[action]]
name="FixtureFail"
from=["Queued"]
to="Failed"
params=["job_type", "art_style_ids", "completion_contract", "error_message"]
"#;
    let csdl = r#"<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Test" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="ArtStyle"><Key><PropertyRef Name="Id"/></Key><Property Name="Id" Type="Edm.String" Nullable="false"/></EntityType><EntityType Name="CurationJob"><Key><PropertyRef Name="Id"/></Key><Property Name="Id" Type="Edm.String" Nullable="false"/></EntityType><EntityContainer Name="Container"><EntitySet Name="ArtStyles" EntityType="Test.ArtStyle"/><EntitySet Name="CurationJobs" EntityType="Test.CurationJob"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>"#;
    let mut registry = SpecRegistry::new();
    registry.register_tenant(
        "default",
        temper_spec::csdl::parse_csdl(csdl).unwrap(),
        csdl.into(),
        &[("ArtStyle", &art), ("CurationJob", &job)],
    );
    let state = ServerState::from_registry(ActorSystem::new("art-style-retry"), registry);
    let policies = read("katagami-commons/policies/art_style.cedar")
        + &read("katagami-curation/policies/curation_job.cedar");
    state
        .authz
        .reload_tenant_policies("default", &policies)
        .unwrap();
    state.rebuild_reaction_dispatcher();
    state
}
async fn act(
    s: &ServerState,
    typ: &str,
    id: &str,
    action: &str,
    params: serde_json::Value,
    service: bool,
) -> bool {
    let ctx = if service {
        AgentContext::for_service("curation-service")
    } else {
        AgentContext {
            agent_id: Some("fixture-codex".into()),
            agent_type: Some("codex".into()),
            ..Default::default()
        }
    };
    s.dispatch_tenant_action(&TenantId::default(), typ, id, action, params, &ctx)
        .await
        .map(|r| r.success)
        .unwrap_or(false)
}
async fn state(s: &ServerState, typ: &str, id: &str) -> temper_server::entity_actor::EntityState {
    s.get_tenant_entity_state(&TenantId::default(), typ, id)
        .await
        .unwrap()
        .state
}
async fn fixture(s: &ServerState, kind: &str, linked: &str) {
    for (typ, id) in [("ArtStyle", "art"), ("CurationJob", "job")] {
        s.get_or_create_tenant_entity(&TenantId::default(), typ, id, json!({"Id":id}))
            .await
            .unwrap();
    }
    assert!(
        act(
            s,
            "ArtStyle",
            "art",
            "FixtureBind",
            json!({"verification_job_id":"job","prompt_template":"original immutable input"}),
            true
        )
        .await
    );
    assert!(act(s,"CurationJob","job","FixtureFail",json!({"job_type":kind,"art_style_ids":linked,"completion_contract":"typed-v1","error_message":"original failure"}),true).await);
}
#[tokio::test]
async fn same_failed_job_retries_through_engine_and_rejects_duplicate() {
    let s = setup();
    fixture(&s, "synthesize_art_style", "art").await;
    assert!(act(&s, "ArtStyle", "art", "RetryVerification", json!({}), false).await);
    for _ in 0..100 {
        if state(&s, "CurationJob", "job").await.status == "Finalizing" {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    let job = state(&s, "CurationJob", "job").await;
    assert_eq!(job.status, "Finalizing");
    assert_eq!(job.fields["error_message"], "original failure");
    assert_eq!(
        state(&s, "ArtStyle", "art").await.fields["prompt_template"],
        "original immutable input"
    );
    assert!(!act(&s, "ArtStyle", "art", "RetryVerification", json!({}), false).await);
    let p = json!({"job_type":"synthesize_art_style","art_style_ids":"art","completion_contract":"typed-v1"});
    assert!(
        !act(
            &s,
            "CurationJob",
            "job",
            "RetryArtStyleVerification",
            p,
            true
        )
        .await
    );
}
#[tokio::test]
async fn generic_or_misbound_job_cannot_change_and_harness_cannot_drive_job() {
    for (kind, linked) in [("generic", "art"), ("synthesize_art_style", "other")] {
        let s = setup();
        fixture(&s, kind, linked).await;
        let p = json!({"job_type":"synthesize_art_style","art_style_ids":"art","completion_contract":"typed-v1"});
        assert!(
            !act(
                &s,
                "CurationJob",
                "job",
                "RetryArtStyleVerification",
                p.clone(),
                false
            )
            .await
        );
        assert!(
            !act(
                &s,
                "CurationJob",
                "job",
                "RetryArtStyleVerification",
                p,
                true
            )
            .await
        );
        assert_eq!(state(&s, "CurationJob", "job").await.status, "Failed");
    }
}
#[tokio::test]
async fn missing_reference_and_nonfailed_job_cannot_retry() {
    let s = setup();
    s.get_or_create_tenant_entity(&TenantId::default(), "ArtStyle", "art", json!({"Id":"art"}))
        .await
        .unwrap();
    assert!(!act(&s, "ArtStyle", "art", "RetryVerification", json!({}), false).await);
    assert!(
        act(
            &s,
            "ArtStyle",
            "art",
            "FixtureBind",
            json!({"verification_job_id":"missing"}),
            true
        )
        .await
    );
    assert!(!act(&s, "ArtStyle", "art", "RetryVerification", json!({}), false).await);
    s.get_or_create_tenant_entity(
        &TenantId::default(),
        "CurationJob",
        "missing",
        json!({"Id":"missing"}),
    )
    .await
    .unwrap();
    assert!(!act(&s, "ArtStyle", "art", "RetryVerification", json!({}), false).await);
}
