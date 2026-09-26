import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import mutation_rate_limiter
from app.store import store


@pytest.fixture(autouse=True)
def _reset_store():
    store.reset()
    mutation_rate_limiter.reset()
    yield
    store.reset()
    mutation_rate_limiter.reset()


@pytest.fixture
def client():
    return TestClient(app)
