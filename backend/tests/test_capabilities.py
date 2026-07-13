def test_capability_registry_exposes_only_executable_capabilities(client):
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200

    capabilities = response.json()["data"]
    assert capabilities
    assert all(item["status"] == "available" for item in capabilities)
    assert {item["id"] for item in capabilities} == {
        "source.ingest",
        "source.preview",
        "source.profile",
        "source.upload-resumable",
        "source.reprofile",
        "source.catalog",
        "job.control",
    }
    profile = next(item for item in capabilities if item["id"] == "source.profile")
    assert profile["execution_mode"] == "durable_background"
