import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.services.qr_service import generate_qr_code

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    print("[OK] Health check passed:", data)

def test_qr_generation():
    test_url = "http://localhost:3000/p/123e4567-e89b-12d3-a456-426614174000"
    qr_data = generate_qr_code(test_url)
    assert qr_data.startswith("data:image/png;base64,")
    print("[OK] QR generation passed (valid base64 PNG data URL generated)")

def test_validation():
    # Test empty prescription text validation
    response = client.post("/simplify", json={"prescription_text": ""})
    assert response.status_code in [400, 422]
    print("[OK] Validation error handling passed with status code:", response.status_code)

if __name__ == "__main__":
    print("\n--- Running AI Multilingual Prescription Assistant Test Suite ---\n")
    test_health()
    test_qr_generation()
    test_validation()
    print("\n--- All local test suite checks passed successfully! ---\n")
