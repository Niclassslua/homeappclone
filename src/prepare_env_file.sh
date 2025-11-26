#!/bin/bash
tenantID=$(awk '{if ( $0 ~ /^@tenantID=/ ) {print $0}}' graphql.http | cut -d'=' -f2)
OAUTH_URL=https://login.microsoftonline.com/${tenantID}/oauth2/token
CLIENT_ID=$(awk '{if ( $0 ~ /^@clientID=/ ) {print $0}}' graphql.http | cut -d'=' -f2)
CLIENT_SECRET=$(awk '{if ( $0 ~ /^@clientSecret=/ ) {print $0}}' graphql.http | cut -d'=' -f2)
RESOURCE_ID=$(awk '{if ( $0 ~ /^@resource=/ ) {print $0}}' graphql.http | cut -d'=' -f2)
CLIENT_API_URL=https://graphql-sandbox-dds.rnv-online.de/
echo "OAUTH_URL=$OAUTH_URL"
echo "CLIENT_ID=$CLIENT_ID"
echo "CLIENT_SECRET=$CLIENT_SECRET"
echo "RESOURCE_ID=$RESOURCE_ID"
echo "CLIENT_API_URL=$CLIENT_API_URL"