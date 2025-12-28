const express = require('express');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();
const PORT = process.env.PORT || 8080;

const STORAGE_ACCOUNT = 'storageaccnt1228545';
const CONTAINER_NAME = 'mapty';

app.use(express.static('public'));

// Helper function to get MIME type from file extension
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

app.get('/api/image/:imageName', async (req, res) => {
    const { imageName } = req.params;
    
    try {
        console.log(`[INFO] Fetching image: ${imageName}`);
        
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
            `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
            credential
        );
        
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blobClient = containerClient.getBlobClient(imageName);
        
        console.log('[INFO] Downloading blob...');
        const downloadResponse = await blobClient.download();
        
        // Use blob metadata first, fallback to file extension
        const contentType = downloadResponse.contentSettings?.contentType || getContentType(imageName);
        
        console.log(`[INFO] Content-Type: ${contentType}`);
        
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=3600');
        
        downloadResponse.readableStreamBody.pipe(res);
        
        console.log('[SUCCESS] Blob streamed successfully');
        
    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        res.status(error.statusCode || 500).json({
            error: error.message,
            code: error.code
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        storageAccount: STORAGE_ACCOUNT,
        container: CONTAINER_NAME,
        managedIdentity: 'enabled'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
