#!/bin/bash

# paperbrain test script
# Usage: ./test.sh /path/to/sample.pdf

set -e

if [ -z "$1" ]; then
  echo "Usage: ./test.sh /path/to/sample.pdf"
  exit 1
fi

PDF_PATH="$1"
BASE_URL="http://localhost:3001"
PROJECT_ID="test_$(date +%s)"

echo "🧪 Testing paperbrain with project: $PROJECT_ID"
echo "📄 PDF: $PDF_PATH"
echo ""

# Check health
echo "1️⃣ Health check..."
curl -s "$BASE_URL/health" | jq
echo ""

# Ingest PDF
echo "2️⃣ Ingesting PDF..."
INGEST_RESPONSE=$(curl -s -X POST "$BASE_URL/ingest" \
  -F "projectId=$PROJECT_ID" \
  -F "file=@$PDF_PATH")

echo "$INGEST_RESPONSE" | jq
PAPER_ID=$(echo "$INGEST_RESPONSE" | jq -r '.paperId')

if [ "$PAPER_ID" == "null" ] || [ -z "$PAPER_ID" ]; then
  echo "❌ Failed to ingest PDF"
  exit 1
fi

echo "✅ Paper ID: $PAPER_ID"
echo ""

# Chat
echo "3️⃣ Asking a question..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"paperId\": \"$PAPER_ID\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"What is the main contribution of this paper?\"
    }]
  }")

echo "$CHAT_RESPONSE" | jq
echo ""

# Generate podcast
echo "4️⃣ Generating podcast..."
PODCAST_RESPONSE=$(curl -s -X POST "$BASE_URL/podcast" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"paperId\": \"$PAPER_ID\",
    \"duration\": 120
  }")

echo "$PODCAST_RESPONSE" | jq
echo ""

# Generate video script
echo "5️⃣ Generating video script..."
VIDEO_RESPONSE=$(curl -s -X POST "$BASE_URL/video-script" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"paperId\": \"$PAPER_ID\"
  }")

echo "$VIDEO_RESPONSE" | jq
echo ""

# Synthesize (using same paper twice for demo)
echo "6️⃣ Synthesizing papers..."
SYNTH_RESPONSE=$(curl -s -X POST "$BASE_URL/synthesize" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"paperIds\": [\"$PAPER_ID\", \"$PAPER_ID\"]
  }")

echo "$SYNTH_RESPONSE" | jq
echo ""

echo "✅ All tests completed!"
echo "📁 Data stored in: ./data/$PROJECT_ID.json"

