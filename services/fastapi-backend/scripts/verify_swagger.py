"""Exercise actual Swagger UI controls against the configured database.

Run after migrations with `pip install playwright` and
`python -m playwright install chromium`. Creates one uniquely named demo user.
"""
from pathlib import Path
import json
import subprocess
import sys
import time
from urllib.request import urlopen
from uuid import uuid4

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8000"


def verify():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        try:
            page.goto(BASE + "/docs")
            page.locator(".swagger-ui .opblock").first.wait_for()
            health = page.locator("#operations-meta-health_api_health_get")
            health.locator(".opblock-summary").click()
            health.get_by_role("button", name="Try it out").click()
            with page.expect_response(lambda r: r.url == BASE + "/api/health" and r.request.method == "GET") as response:
                health.get_by_role("button", name="Execute", exact=True).click()
            assert response.value.status == 200
            assert response.value.json()["storage"] == "postgresql"
            expect(health.locator(".live-responses-table .response-col_status:not(.col_header)")).to_contain_text("200")

            operation = page.locator("#operations-users-create_user_route_api_users_post")
            operation.locator(".opblock-summary").click()
            operation.get_by_role("button", name="Try it out").click()
            payload = {"email": f"swagger-{uuid4().hex}@example.com", "nickname": "swagger", "password": "password123"}

            def submit(data, expected_status):
                operation.locator("textarea").fill(json.dumps(data))
                with page.expect_response(lambda r: r.url == BASE + "/api/users" and r.request.method == "POST") as response:
                    operation.get_by_role("button", name="Execute", exact=True).click()
                assert response.value.status == expected_status, response.value.text()
                expect(operation.locator(".live-responses-table .response-col_status:not(.col_header)")).to_contain_text(str(expected_status))
                print(f"Swagger POST /api/users -> {expected_status}", flush=True)

            submit(payload, 201)
            submit(payload, 409)
            submit({**payload, "password": "short"}, 422)
            print("Swagger browser verification PASS: GET 200; POST 201, 409, 422", flush=True)
        finally:
            page.screenshot(path=str(ROOT / "swagger-verification.png"), full_page=True)
            browser.close()


if __name__ == "__main__":
    with (ROOT / "swagger-server.log").open("w") as log:
        process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=ROOT, stdout=log, stderr=log)
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError("Uvicorn exited; inspect swagger-server.log")
                try:
                    with urlopen(BASE + "/api/health", timeout=1) as response:
                        if response.status == 200:
                            break
                except OSError:
                    time.sleep(0.1)
            else:
                raise RuntimeError("API did not become healthy")
            verify()
        finally:
            process.terminate()
            process.wait(timeout=10)

