const express = require('express');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const STORAGE_ACCOUNT = 'storageaccnt1228545';
const CONTAINER_NAME = 'quill-imgs';

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// API endpoint to serve images from Blob Storage using Managed Identity
app.get('/api/image/:imageName', async (req, res) => {
    const { imageName } = req.params;
    
    try {
        console.log(`[INFO] Fetching image: ${imageName}`);
        
        // Use Managed Identity (no secrets needed!)
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
            `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
            credential
        );
        
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blobClient = containerClient.getBlobClient(imageName);
        
        console.log('[INFO] Downloading blob...');
        const downloadResponse = await blobClient.download();
        
        // Set headers
        res.set('Content-Type', downloadResponse.contentSettings?.contentType || 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=3600');
        
        // Stream blob to response
        downloadResponse.readableStreamBody.pipe(res);
        
        console.log('[SUCCESS] Blob streamed successfully');
        
    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        console.error(`[ERROR] Code: ${error.code}`);
        res.status(error.statusCode || 500).json({
            error: error.message,
            code: error.code
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        storageAccount: STORAGE_ACCOUNT,
        container: CONTAINER_NAME,
        managedIdentity: 'enabled'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Managed Identity enabled for ${STORAGE_ACCOUNT}`);
});
