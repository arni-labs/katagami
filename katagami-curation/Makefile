# katagami-curation test entrypoint.
#
# The suite runs through a virtualenv rather than the system interpreter
# because it has a real dev dependency: cedarpy, which evaluates the Cedar
# policies in test_actor_policy_evaluation.py. Those tests used to skip when it
# was absent, so the authorization policies went unchecked while the run still
# reported green. They now fail instead — and this target is what makes sure
# they have no reason to.
#
# Most systems ship an externally-managed Python (PEP 668) that refuses a plain
# `pip install`, so the virtualenv is not optional convenience.

VENV ?= .venv
PY := $(VENV)/bin/python3
DEV_REQUIREMENTS := tests/requirements-dev.txt

.PHONY: test-integration test-deps clean-venv

$(PY):
	python3 -m venv $(VENV)

test-deps: $(PY) $(DEV_REQUIREMENTS)
	$(PY) -m pip install --quiet --disable-pip-version-check -r $(DEV_REQUIREMENTS)

test-integration: test-deps
	$(PY) -m unittest discover -s tests -p 'test_*.py'

clean-venv:
	rm -rf $(VENV)
