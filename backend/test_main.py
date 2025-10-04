import pytest
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Test API key
API_KEY = "demo-key-123"
headers = {"Authorization": f"Bearer {API_KEY}"}

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_ingest_reviews():
    """Test review ingestion endpoint"""
    sample_reviews = {
        "reviews": [
            {
                "id": 1,
                "location": "NYC",
                "rating": 5,
                "text": "Great service and food!",
                "date": "2025-01-15"
            },
            {
                "id": 2,
                "location": "SF",
                "rating": 3,
                "text": "Average experience, could be better.",
                "date": "2025-01-16"
            }
        ]
    }
    
    response = client.post("/ingest", json=sample_reviews, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Successfully ingested 2 reviews" in data["message"]

def test_get_reviews():
    """Test getting reviews with pagination"""
    response = client.get("/reviews", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "reviews" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data

def test_get_review_by_id():
    """Test getting a single review by ID"""
    response = client.get("/reviews/1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["location"] == "NYC"
    assert data["rating"] == 5

def test_get_nonexistent_review():
    """Test getting a review that doesn't exist"""
    response = client.get("/reviews/999", headers=headers)
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Review not found"

def test_unauthorized_access():
    """Test accessing endpoints without API key"""
    response = client.get("/reviews")
    assert response.status_code == 401

def test_invalid_api_key():
    """Test accessing endpoints with invalid API key"""
    invalid_headers = {"Authorization": "Bearer invalid-key"}
    response = client.get("/reviews", headers=invalid_headers)
    assert response.status_code == 401

def test_analytics():
    """Test analytics endpoint"""
    response = client.get("/analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "sentiment_counts" in data
    assert "topic_counts" in data
    assert "location_counts" in data
    assert "rating_distribution" in data

def test_search_similar_reviews():
    """Test search functionality"""
    response = client.get("/search?q=great service", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert "total" in data

def test_suggest_reply():
    """Test reply suggestion endpoint"""
    response = client.post("/reviews/1/suggest-reply", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "tags" in data
    assert "reasoning_log" in data
    assert "sentiment" in data["tags"]
    assert "topic" in data["tags"]

def test_process_reviews():
    """Test batch processing of reviews"""
    response = client.post("/process-reviews", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Successfully processed" in data["message"]

if __name__ == "__main__":
    pytest.main([__file__])
