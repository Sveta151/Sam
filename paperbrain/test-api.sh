#!/bin/bash

# Test script for PaperBrain v1 API
# Usage: ./test-api.sh

set -e

API_URL="http://localhost:8787"

echo "🧪 Testing PaperBrain v1 API"
echo "=============================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health check..."
curl -s "$API_URL/health" | jq .
echo "✅ Health check passed"
echo ""

# Test 2: Create project
echo "2️⃣  Creating a project..."
PROJECT_ID=$(curl -s -X POST "$API_URL/v1/projects" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Project","domainFocus":"AI Research"}' \
  | jq -r '.id')
echo "✅ Project created: $PROJECT_ID"
echo ""

# Test 3: List projects
echo "3️⃣  Listing projects..."
curl -s "$API_URL/v1/projects" | jq .
echo "✅ Projects listed"
echo ""

# Test 4: Create folder
echo "4️⃣  Creating a folder..."
FOLDER_ID=$(curl -s -X POST "$API_URL/v1/folders" \
  -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Core Papers\",\"tags\":[\"important\"]}" \
  | jq -r '.id')
echo "✅ Folder created: $FOLDER_ID"
echo ""

# Test 5: List folders
echo "5️⃣  Listing folders..."
curl -s "$API_URL/v1/folders?projectId=$PROJECT_ID" | jq .
echo "✅ Folders listed"
echo ""

# Test 6: Get project
echo "6️⃣  Getting project details..."
curl -s "$API_URL/v1/projects/$PROJECT_ID" | jq .
echo "✅ Project retrieved"
echo ""

# Test 7: Update project
echo "7️⃣  Updating project..."
curl -s -X PATCH "$API_URL/v1/projects/$PROJECT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"domainFocus":"Machine Learning"}' \
  | jq .
echo "✅ Project updated"
echo ""

# Test 8: Search (empty)
echo "8️⃣  Testing search..."
curl -s "$API_URL/v1/search?query=test&projectId=$PROJECT_ID" | jq .
echo "✅ Search completed"
echo ""

# Test 9: List papers (should be empty)
echo "9️⃣  Listing papers..."
curl -s "$API_URL/v1/papers?projectId=$PROJECT_ID" | jq .
echo "✅ Papers listed"
echo ""

echo ""
echo "🎉 All basic tests passed!"
echo ""
echo "📝 Next steps:"
echo "   - Test PDF ingestion: curl -X POST $API_URL/v1/papers/ingest -F projectId=$PROJECT_ID -F pdf=@paper.pdf"
echo "   - View OpenAPI docs: open http://localhost:8787/docs"
echo ""
echo "🧹 Cleanup:"
echo "   - Delete project: curl -X DELETE $API_URL/v1/projects/$PROJECT_ID"

