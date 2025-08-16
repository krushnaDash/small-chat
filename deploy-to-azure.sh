#!/bin/bash

# SmallChat Azure Deployment Script
# This script helps deploy SmallChat to Azure App Service

echo "SmallChat Azure Deployment Script"
echo "=================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Variables (update these with your values)
RESOURCE_GROUP="smallchat-rg"
APP_SERVICE_PLAN="smallchat-plan"
TIMESTAMP=$(date +%Y%m%d%H%M)
WEB_APP_NAME="ega-aga-smallchat"  # must be globally unique
LOCATION="Central India"
RUNTIME="JAVA|17-java17"

# Storage variables
# Storage account name must be lowercase alphanumeric and <=24 chars.
# Use a short suffix from timestamp to keep under limit.
SA_SUFFIX=${TIMESTAMP: -6}
STORAGE_ACCOUNT_NAME="smallchat${SA_SUFFIX}"
TABLE_NAME="SmallChatMessages"
TABLE_PARTITION="default"
CONTAINER_NAME="smallchatmedia"

echo "Creating Azure resources..."
echo "Resource Group: $RESOURCE_GROUP"
echo "App Service Plan: $APP_SERVICE_PLAN"
echo "Web App Name: $WEB_APP_NAME"
echo "Location: $LOCATION"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
echo "Table Name: $TABLE_NAME"
echo "Blob Container: $CONTAINER_NAME"

# Login to Azure (uncomment if not already logged in)
# az login

# Create resource group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location "$LOCATION"
if [ $? -ne 0 ]; then
    echo "Failed to create resource group. Exiting."
    exit 1
fi

# Create App Service plan
echo "Creating App Service plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION" \
    --sku F1 \
    --is-linux
if [ $? -ne 0 ]; then
    echo "Failed to create App Service plan. Exiting."
    exit 1
fi

# Create web app
echo "Creating web app..."
echo "App name will be: $WEB_APP_NAME"
az webapp create \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "$RUNTIME"
if [ $? -ne 0 ]; then
    echo "Failed to create web app. This might be due to:"
    echo "1. App name already taken (try running script again for new timestamp)"
    echo "2. Free tier limit reached (only 1 F1 app per subscription)"
    echo "3. Runtime not supported in this region"
    echo "Exiting."
    exit 1
fi
echo "Web app created successfully!"

# Create Storage Account
echo "Creating storage account..."
az storage account create \
    --name $STORAGE_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2
if [ $? -ne 0 ]; then
    echo "Failed to create storage account. Exiting."
    exit 1
fi

# Fetch connection string
CONNECTION_STRING=$(az storage account show-connection-string \
    --name $STORAGE_ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query connectionString -o tsv)
if [ -z "$CONNECTION_STRING" ]; then
    echo "Failed to retrieve storage connection string. Exiting."
    exit 1
fi

# Create Table
echo "Creating table $TABLE_NAME ..."
az storage table create \
    --name $TABLE_NAME \
    --connection-string "$CONNECTION_STRING" >/dev/null
if [ $? -ne 0 ]; then
    echo "Failed to create storage table. Exiting."
    exit 1
fi

# Create Blob Container
echo "Creating blob container $CONTAINER_NAME ..."
az storage container create \
    --name $CONTAINER_NAME \
    --connection-string "$CONNECTION_STRING" >/dev/null
if [ $? -ne 0 ]; then
    echo "Failed to create blob container. Exiting."
    exit 1
fi

# Configure app settings
echo "Configuring app settings..."
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    SMALLCHAT_MESSAGE_RETENTION_DAYS=3 \
    JAVA_OPTS="-Dserver.port=80" \
    AZURE_TABLE_CONNECTION_STRING="$CONNECTION_STRING" \
    SMALLCHAT_AZURE_TABLE_NAME="$TABLE_NAME" \
    SMALLCHAT_AZURE_TABLE_PARTITION="$TABLE_PARTITION" \
    SMALLCHAT_AZURE_BLOB_CONTAINER="$CONTAINER_NAME"

# Get publish profile for GitHub Actions
echo "Getting publish profile..."
az webapp deployment list-publishing-profiles \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --xml > publish-profile.xml

echo ""
echo "Deployment setup complete!"
echo "=========================="
echo "Web App URL: https://$WEB_APP_NAME.azurewebsites.net"
echo ""
echo "Next steps:"
echo "1. Add the contents of publish-profile.xml as a GitHub secret named AZURE_WEBAPP_PUBLISH_PROFILE"
echo "2. Update the AZURE_WEBAPP_NAME in .github/workflows/azure-deploy.yml to: $WEB_APP_NAME"
echo "3. Push your code to GitHub to trigger the deployment"
echo ""
echo "To manually deploy the JAR file:"
echo "az webapp deploy --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --src-path target/smallchat-0.0.1-SNAPSHOT.jar --type jar"
