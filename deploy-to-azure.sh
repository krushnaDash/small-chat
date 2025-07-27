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
WEB_APP_NAME="ega-aga-smallchat"  # Unique name with timestamp
LOCATION="Central India"
RUNTIME="JAVA|17-java17"

echo "Creating Azure resources..."
echo "Resource Group: $RESOURCE_GROUP"
echo "App Service Plan: $APP_SERVICE_PLAN"
echo "Web App Name: $WEB_APP_NAME"
echo "Location: $LOCATION"

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

# Configure app settings
echo "Configuring app settings..."
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    SMALLCHAT_MESSAGE_RETENTION_DAYS=3 \
    JAVA_OPTS="-Dserver.port=80"

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
