"""Retry wiring and actual Cedar decisions; runtime behavior is tested separately."""
import tomllib
import unittest
from pathlib import Path
import cedarpy

ROOT = Path(__file__).resolve().parents[2]


def actions(app, name):
    spec = tomllib.loads((ROOT / app / 'specs' / f'{name}.ioa.toml').read_text())
    return {action['name']: action for action in spec['action']}


class ArtStyleRetryContractTest(unittest.TestCase):
    def setUp(self):
        self.art = actions('katagami-commons', 'art_style')
        self.jobs = actions('katagami-curation', 'curation_job')

    def test_retry_cannot_author_or_create_a_job(self):
        retry = self.art['RetryVerification']
        self.assertEqual(retry['from'], ['Draft'])
        self.assertFalse(retry.get('params'))
        self.assertFalse(retry.get('effect'))
        self.assertEqual(retry['guard'], [{
            'type': 'cross_entity_state', 'entity_type': 'CurationJob',
            'entity_id_source': 'verification_job_id',
            'required_status': ['Failed'], 'required': True,
        }])
        trigger, = retry['triggers']
        self.assertEqual(trigger['resolve_target'], {'type': 'field', 'field': 'verification_job_id'})
        self.assertEqual(trigger['principal'], 'curation-service')
        self.assertEqual(trigger['target_action'], 'RetryArtStyleVerification')
        self.assertEqual(trigger['target_entity'], 'CurationJob')
        self.assertEqual(trigger['params_from'], {'art_style_ids': 'Id'})
        self.assertEqual(trigger['params'], {'job_type': 'synthesize_art_style', 'completion_contract': 'typed-v1'})

    def test_existing_job_is_atomically_bound_before_transition(self):
        retry = self.jobs['RetryArtStyleVerification']
        self.assertEqual(retry['kind'], 'internal')
        self.assertEqual(retry['from'], ['Failed'])
        self.assertEqual(retry['to'], 'Finalizing')
        self.assertEqual(set(retry['params']), {'job_type', 'art_style_ids', 'completion_contract'})
        self.assertEqual(retry['constraints'], [
            {'kind': 'param_equals_field', 'param': field, 'field': field}
            for field in ('job_type', 'art_style_ids', 'completion_contract')
        ])
        self.assertEqual(retry['triggers'], [self.jobs['VerifyArtStyleSubmission']['triggers'][0]])
        self.assertEqual(retry['effect'], [{'type': 'trigger', 'name': 'finalize_spawned_session'}])
        self.assertNotIn('triggers', self.jobs['Retry'])

    def decision(self, app, policy, resource, action, agent_type):
        entities = [
            {'uid': {'type': 'Agent', 'id': 'test'}, 'attrs': {'id': 'test', 'agent_type': agent_type}, 'parents': []},
            {'uid': {'type': resource, 'id': 'record'}, 'attrs': {}, 'parents': []},
        ]
        return cedarpy.is_authorized({
            'principal': {'type': 'Agent', 'id': 'test'},
            'action': {'type': 'Action', 'id': action},
            'resource': {'type': resource, 'id': 'record'}, 'context': {},
        }, (ROOT / app / 'policies' / f'{policy}.cedar').read_text(), entities).decision.value

    def test_harness_can_request_but_cannot_execute_internal_retry(self):
        self.assertEqual(self.decision('katagami-commons', 'art_style', 'ArtStyle', 'RetryVerification', 'codex'), 'Allow')
        self.assertEqual(self.decision('katagami-curation', 'curation_job', 'CurationJob', 'RetryArtStyleVerification', 'codex'), 'Deny')
        self.assertEqual(self.decision('katagami-curation', 'curation_job', 'CurationJob', 'RetryArtStyleVerification', 'curation-service'), 'Allow')
