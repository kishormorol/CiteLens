import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_shape():
    data = client.get("/health").json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "mockMode" in data
    assert "environment" in data


def test_root_returns_200():
    response = client.get("/")
    assert response.status_code == 200
    assert "CiteLens" in response.json()["message"]
