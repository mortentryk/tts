#!/bin/bash

# Supabase Environment Setup Script
# Run this to set up your environment variables

echo "🚀 Setting up Supabase environment variables..."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    cp env.template .env.local
    echo "✅ Created .env.local from template"
fi

# Update Supabase configuration
cat > .env.local << 'EOF'
# Environment Variables Template
# Copy this file to .env.local and add your actual API keys

# OpenAI API Key for Text-to-Speech
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://ooyzdksmeglhocjlaouo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI

# Google Sheets Sync Token (for security)
# Generate a random string for your ingest endpoint
INGEST_TOKEN=supabase-sync-token-2024

# Cloudinary Configuration (optional - for image hosting)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EOF

echo "✅ Environment variables configured!"
echo ""
echo "📋 Next steps:"
echo "1. Run the database schema: supabase-schema.sql"
echo "2. Test the connection: npm run dev"
echo "3. Set up Google Sheets sync"
echo ""
echo "🔗 Your Supabase project: https://ooyzdksmeglhocjlaouo.supabase.co"
