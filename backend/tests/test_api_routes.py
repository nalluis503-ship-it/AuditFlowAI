import unittest

from backend.app.main import app


class ApiRoutesTests(unittest.TestCase):
    def test_exposes_real_routes_without_simulated_endpoints(self):
        paths = set(app.openapi()["paths"])

        expected_paths = {
            "/",
            "/health",
            "/api/v1/status",
            "/api/v1/sources/ingest",
        }

        self.assertTrue(expected_paths.issubset(paths))
        self.assertNotIn("/api/v1/workflows", paths)
        self.assertNotIn("/api/v1/nodes", paths)


if __name__ == "__main__":
    unittest.main()
