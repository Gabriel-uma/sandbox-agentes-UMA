#!/bin/bash

# Script para probar todos los modelos disponibles
BACKEND_URL="https://rag-agent-backend-117511395113.us-central1.run.app"
TEST_QUESTION="¿Qué es un algoritmo?"

# Lista de modelos a probar
MODELS=(
    "models/gemini-2.0-flash-exp"
    "models/gemini-2.5-flash"
    "models/gemini-1.5-flash"
    "models/gemini-1.5-pro"
    "deepseek-chat"
    "deepseek-reasoner"
)

echo "========================================="
echo "Testing All Models"
echo "========================================="
echo ""

for MODEL in "${MODELS[@]}"; do
    echo "Testing model: $MODEL"
    echo "-----------------------------------"

    RESPONSE=$(curl -s -X POST "$BACKEND_URL/query" \
        -H "Content-Type: application/json" \
        -d "{
            \"question\": \"$TEST_QUESTION\",
            \"model\": \"$MODEL\",
            \"top_k\": 3
        }")

    # Check if response contains error
    if echo "$RESPONSE" | grep -q '"error"'; then
        echo "❌ FAILED: $MODEL"
        echo "Error: $(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)"
        echo "Details: $(echo "$RESPONSE" | grep -o '"details":"[^"]*"' | cut -d'"' -f4)"
    else
        # Extract answer preview (first 100 chars)
        ANSWER=$(echo "$RESPONSE" | grep -o '"answer":"[^"]*"' | cut -d'"' -f4 | head -c 100)
        echo "✅ SUCCESS: $MODEL"
        echo "Answer preview: $ANSWER..."
    fi

    echo ""
    sleep 2
done

echo "========================================="
echo "Testing Complete"
echo "========================================="
