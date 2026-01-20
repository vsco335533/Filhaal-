import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function listCloudinaryFiles() {
  try {
    console.log('🔍 Listing files in Cloudinary issues folder...');
    
    // Search for raw files in issues folder
    const result = await cloudinary.search
      .expression('folder:issues AND resource_type:raw')
      .execute();
    
    console.log(`Found ${result.total_count} files`);
    
    if (result.resources && result.resources.length > 0) {
      console.log('\n📄 Files:');
      result.resources.forEach(r => {
        console.log(`  - ${r.public_id}`);
        console.log(`    URL: ${r.secure_url}`);
      });
    } else {
      console.log('❌ No files found in issues folder');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listCloudinaryFiles();
