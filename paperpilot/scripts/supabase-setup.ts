/**
 * Supabase bucket setup script
 * 
 * Creates storage buckets for the hackathon if they don't exist:
 * - papers (public) - user-uploaded PDFs
 * - audio (public) - generated podcast mp3s
 * - video (public) - generated summary videos
 * - thumbs (public) - optional thumbnails
 * - json (public) - synthesis JSONs, transcripts, etc.
 * 
 * Usage: tsx scripts/supabase-setup.ts
 * Or call ensureBuckets() from server code on boot
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKETS = [
  { name: 'papers', public: true, description: 'User-uploaded PDFs' },
  { name: 'audio', public: true, description: 'Generated podcast mp3s' },
  { name: 'video', public: true, description: 'Generated summary videos' },
  { name: 'thumbs', public: true, description: 'Optional thumbnails' },
  { name: 'json', public: true, description: 'Synthesis JSONs, transcripts' },
];

/**
 * Ensures all required storage buckets exist
 * Creates them if they don't exist, logs gracefully if they do
 */
export async function ensureBuckets() {
  console.log('🚀 Ensuring Supabase storage buckets...\n');

  for (const bucket of BUCKETS) {
    try {
      // Try to create the bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.name === 'video' ? 500 * 1024 * 1024 : 100 * 1024 * 1024, // 500MB for video, 100MB for others
      });

      if (error) {
        // Check if bucket already exists
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`✓ Bucket '${bucket.name}' already exists (${bucket.description})`);
        } else {
          console.error(`✗ Error creating bucket '${bucket.name}':`, error.message);
        }
      } else {
        console.log(`✓ Created bucket '${bucket.name}' (${bucket.description})`);
      }
    } catch (err) {
      console.error(`✗ Exception creating bucket '${bucket.name}':`, err);
    }
  }

  console.log('\n✅ Bucket setup complete!');
}

// Run if called directly
if (require.main === module) {
  ensureBuckets()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Setup failed:', err);
      process.exit(1);
    });
}

