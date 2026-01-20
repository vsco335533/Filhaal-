import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import db from './src/config/database.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fixPdfUrls() {
  try {
    console.log('🔄 Fixing PDF URLs in database...');
    
    // Get all issues with public_ids
    const result = await db.query(
      'SELECT id, pdf_public_id, pdf_url FROM issues WHERE pdf_public_id IS NOT NULL'
    );
    
    console.log(`Found ${result.rows.length} issues with PDFs`);
    
    for (const issue of result.rows) {
      console.log(`\n📄 Processing: ${issue.pdf_public_id}`);
      
      try {
        // Get resource metadata from Cloudinary
        const resource = await cloudinary.api.resource(issue.pdf_public_id, {
          resource_type: 'raw'
        });
        
        const correctUrl = resource.secure_url;
        console.log(`  ✅ Correct URL: ${correctUrl}`);
        
        // Update database
        await db.query(
          'UPDATE issues SET pdf_url = $1 WHERE id = $2',
          [correctUrl, issue.id]
        );
        
        console.log(`  ✅ Updated in database`);
      } catch (error) {
        console.error(`  ❌ Error for ${issue.pdf_public_id}:`, error.message);
      }
    }
    
    console.log('\n✅ Done fixing PDF URLs');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPdfUrls();
