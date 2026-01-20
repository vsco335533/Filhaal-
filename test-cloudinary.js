import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  try {
    console.log('🧪 Testing Cloudinary Upload...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    
    // Create a simple PDF for testing
    const testPdfPath = path.join(__dirname, 'test.pdf');
    
    // Create a minimal PDF buffer
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n213\n%%EOF');
    
    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'issues',
          public_id: `test_issue_${Date.now()}`,
          attachment: false,
          tags: ['test']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(pdfBuffer);
    });
    
    console.log('✅ Upload Result:');
    console.log(JSON.stringify(uploadResult, null, 2));
    
    // Now try to fetch it
    console.log('\n🔗 Fetching the uploaded file...');
    const pdfUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${uploadResult.public_id}`;
    console.log('URL:', pdfUrl);
    
    const response = await fetch(pdfUrl);
    console.log('Fetch status:', response.status);
    console.log('Fetch statusText:', response.statusText);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log('✅ File fetched successfully, size:', buffer.byteLength);
    } else {
      console.log('❌ Failed to fetch file');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

testUpload();
