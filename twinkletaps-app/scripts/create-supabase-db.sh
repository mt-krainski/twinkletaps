#!/usr/bin/env bash

# echo "Logging in to Supabase..."
# npx supabase login
# echo "Logged in to Supabase"
# echo ""

echo "Here are all your organizations:"
npx supabase orgs list
echo ""

echo "Enter the organization ID you want to create a project in:"
read org_id

echo "Enter the project name:"  
read project_name

echo "Available regions:"
echo "  us-west-1      (West US - North California)"
echo "  us-east-1      (East US - North Virginia)"
echo "  us-east-2      (East US - Ohio)"
echo "  ca-central-1   (Canada - Central)"
echo "  eu-west-1      (West EU - Ireland)"
echo "  eu-west-2      (West Europe - London)"
echo "  eu-west-3      (West EU - Paris)"
echo "  eu-central-1   (Central EU - Frankfurt)"
echo "  eu-central-2   (Central Europe - Zurich)"
echo "  eu-north-1     (North EU - Stockholm)"
echo "  ap-south-1     (South Asia - Mumbai)"
echo "  ap-southeast-1 (Southeast Asia - Singapore)"
echo "  ap-northeast-1 (Northeast Asia - Tokyo)"
echo "  ap-northeast-2 (Northeast Asia - Seoul)"
echo "  ap-southeast-2 (Oceania - Sydney)"
echo "  sa-east-1      (South America - São Paulo)"
echo "Enter the region you want to create the project in:"
read region

echo "Generating a secure password for your database..."
db_pass=$(openssl rand -base64 20)
echo "SUPABASE_DB_PASS=$db_pass" >> .env
echo "Database password generated and saved to .env file"
echo ""


echo "Creating a new project with the following parameters:"
echo "  Organization ID: $org_id"
echo "  Project Name: $project_name"
echo "  Region: $region"

# Create the project and capture the JSON output
project_json=$(npx supabase projects create $project_name --org-id $org_id --region $region --db-password $db_pass --output json)

# Extract the project ID using jq
project_id=$(echo "$project_json" | jq -r '.id')

# Save the project ID to .env file
echo "SUPABASE_PROJECT_REF=$project_id" >> .env

echo "Project created successfully!"
echo "Project ID: $project_id"
echo "Project ID saved to .env file as SUPABASE_PROJECT_REF"
echo ""

# Fetch API keys for the project
echo "Fetching API keys for the project..."
api_keys_json=$(npx supabase projects api-keys --project-ref $project_id --output json)

# Extract the anon key by checking the id field
anon_key=$(echo "$api_keys_json" | jq -r '.[] | select(.id == "anon") | .api_key')

# Extract the service role key by checking the id field
service_role_key=$(echo "$api_keys_json" | jq -r '.[] | select(.id == "service_role") | .api_key')

# Save the API keys to .env file
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=$service_role_key" >> .env

# Save the Supabase URLs to .env file
echo "NEXT_PUBLIC_SUPABASE_URL=https://$project_id.supabase.co" >> .env
echo "SUPABASE_URL=https://$project_id.supabase.co" >> .env

echo "API keys and URLs fetched and saved to .env file:"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - SUPABASE_URL"
echo "Setup complete! Your Supabase project is ready to use."
