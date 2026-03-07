// migrate-images.mjs
// รัน: node migrate-images.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://asqlhujwwghrpkzeidos.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzcWxodWp3d2docnBremVpZG9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcwNzI3OCwiZXhwIjoyMDg4MjgzMjc4fQ.PK1vC_rA5jyokN8eZhNX8KClvyOoMM2SgUiBMCBVqQ8';
const IMAGES_ROOT = 'C:\\Users\\JIN\\OneDrive\\Desktop\\OWARIN STORE\\GGB All\\GGB - lists';
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// normalize: lowercase + แปลงตัวคั่นทุกแบบเป็น space
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[｜|/:：\-*?"<>・××\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// นับ words ที่ overlap กันระหว่าง 2 string
function wordOverlap(a, b) {
  const wordsA = new Set(normalize(a).split(' ').filter(w => w.length > 1));
  const wordsB = new Set(normalize(b).split(' ').filter(w => w.length > 1));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap;
}

function findMatchingFolder(title, folders) {
  const tn = normalize(title);

  // 1. exact match after normalize
  const exact = folders.find(f => normalize(f) === tn);
  if (exact) return exact;

  // 2. folder starts with normalized title
  const starts = folders.find(f => normalize(f).startsWith(tn));
  if (starts) return starts;

  // 3. normalized title starts with folder name
  const titleFirst = folders.find(f => tn.startsWith(normalize(f)));
  if (titleFirst) return titleFirst;

  // 4. contains
  const contains = folders.find(f => {
    const fn = normalize(f);
    return fn.includes(tn) || tn.includes(fn);
  });
  if (contains) return contains;

  // 5. word overlap — เอาโฟลเดอร์ที่มี words ตรงกันมากที่สุด
  let bestFolder = null;
  let bestScore = 0;
  const titleWords = normalize(title).split(' ').filter(w => w.length > 1);

  for (const f of folders) {
    const score = wordOverlap(title, f);
    // ต้องมี overlap อย่างน้อย 60% ของ words ใน title
    const threshold = Math.ceil(titleWords.length * 0.6);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestFolder = f;
    }
  }
  return bestFolder;
}

function findImages(folderPath) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const files = fs.readdirSync(folderPath)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .sort();
  return {
    front: files.find(f => f.includes('(1)')) || files[0] || null,
    back:  files.find(f => f.includes('(2)')) || files[1] || null,
    all:   files,
  };
}

async function uploadFile(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(storagePath, buffer, { contentType: mime[ext] || 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function main() {
  console.log('🔍 ดึงรายชื่อสินค้าจาก Supabase...');
  const { data: products, error } = await supabase.from('products').select('id, title, front_image, back_image');
  if (error) { console.error('❌', error.message); process.exit(1); }
  console.log(`✅ พบ ${products.length} สินค้า`);

  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`❌ ไม่พบโฟลเดอร์: ${IMAGES_ROOT}`);
    process.exit(1);
  }

  const folders = fs.readdirSync(IMAGES_ROOT)
    .filter(f => fs.statSync(path.join(IMAGES_ROOT, f)).isDirectory());
  console.log(`📁 พบ ${folders.length} โฟลเดอร์รูป\n`);

  let success = 0, skipped = 0, failed = 0;
  const unmatched = [];

  for (const product of products) {
    const folderName = findMatchingFolder(product.title, folders);

    if (!folderName) {
      console.log(`⚠️  [${product.id}] "${product.title}" — ไม่พบโฟลเดอร์`);
      unmatched.push(product.title);
      skipped++;
      continue;
    }

    const { front, back, all } = findImages(path.join(IMAGES_ROOT, folderName));
    if (all.length === 0) {
      console.log(`⚠️  [${product.id}] "${product.title}" — โฟลเดอร์ว่าง`);
      skipped++;
      continue;
    }

    try {
      let frontUrl = product.front_image || '';
      let backUrl  = product.back_image  || '';

      if (front) {
        frontUrl = await uploadFile(
          path.join(IMAGES_ROOT, folderName, front),
          `products/${product.id}/front${path.extname(front)}`
        );
      }
      if (back) {
        backUrl = await uploadFile(
          path.join(IMAGES_ROOT, folderName, back),
          `products/${product.id}/back${path.extname(back)}`
        );
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ front_image: frontUrl, back_image: backUrl, images: [frontUrl, backUrl].filter(Boolean) })
        .eq('id', product.id);
      if (updateError) throw updateError;

      console.log(`✅ [${product.id}] "${product.title}" → ${folderName}`);
      success++;
    } catch (err) {
      console.log(`❌ [${product.id}] "${product.title}" — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`✅ สำเร็จ:   ${success}`);
  console.log(`⚠️  ข้าม:     ${skipped}`);
  console.log(`❌ ล้มเหลว: ${failed}`);
  console.log(`${'─'.repeat(55)}`);

  if (unmatched.length > 0) {
    console.log('\n📋 match ไม่ได้ (ต้องจับคู่เอง):');
    unmatched.forEach(t => console.log(`   - "${t}"`));
    console.log('\n📁 โฟลเดอร์ที่มีอยู่:');
    folders.forEach(f => console.log(`   - "${f}"`));
  }
}

main().catch(console.error);
