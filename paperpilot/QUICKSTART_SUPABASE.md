# 🚀 Supabase Quick Start

## 5-Minute Setup

### 1. Create Supabase Project
```
1. Visit: https://app.supabase.com
2. Click "New Project"
3. Fill in details and wait for setup
```

### 2. Get Your Keys
```
Dashboard → Settings → API

Copy these 3 values:
✓ Project URL
✓ anon/public key
✓ service_role key (⚠️ keep secret!)
```

### 3. Create .env.local
```bash
cd paperpilot
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF
```

### 4. Run Database Schema
```
Dashboard → SQL Editor → New Query

Copy/paste: supabase/schema.sql
Click: Run
```

### 5. Create Storage Buckets
```bash
npx tsx scripts/supabase-setup.ts
```

### 6. Start Dev Server
```bash
npm run dev
```

## ✅ Test It Works

1. Navigate to a project page
2. Drag a PDF into the upload zone
3. Check Supabase dashboard:
   - Storage → papers bucket (file should be there)
   - Table Editor → papers (row should exist)
4. Success! 🎉

## 📖 Full Documentation

- **Complete Guide**: `SUPABASE_INTEGRATION.md`
- **README Section**: Search for "Supabase Integration"
- **API Reference**: See SUPABASE_INTEGRATION.md

## 🐛 Troubleshooting

**"Missing environment variables"**
→ Restart dev server after creating .env.local

**"Bucket not found"**
→ Run: `npx tsx scripts/supabase-setup.ts`

**"Upload failed"**
→ Check Supabase dashboard is accessible
→ Verify environment variables are correct

## 🔗 Quick Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

**Need help?** Check `SUPABASE_INTEGRATION.md` for detailed docs!

