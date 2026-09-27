#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  تنزيل صور الديكور المولّدة وتحويلها لصيغة الموقع
# ═══════════════════════════════════════════════════════════
#  التشغيل:   bash tools/fetch-images.sh
#  بيحتاج:    curl  +  python3 مع Pillow   (pip install Pillow)
#  الصور بتنحفظ فوق الصور المؤقتة بـ assets/img/
# ═══════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

B="https://d8j0ntlcm91z4.cloudfront.net/user_3IaM161trPF6IPOdQduDmdCDyiv"

# اسم_الملف|الرابط|العرض_المطلوب
IMAGES="
hero|$B/hf_20260927_134819_643e034d-9797-4a6e-8b9a-53be9aedd162.png|1600
showroom|$B/hf_20260927_134819_97524876-dba7-46f7-81e3-e8a34ba9c18b.png|1280
vanity|$B/hf_20260927_134821_e3be5a0e-5ea9-43ba-b19f-308b8a7b2c6d.png|780
faucet|$B/hf_20260927_134819_d4b36332-341c-4bd3-b054-544570502dd2.png|780
shower|$B/hf_20260927_134819_7ea70495-64b9-4d31-a978-7f28913ed126.png|780
tiles|$B/hf_20260927_134818_81eff098-a4d7-4178-9018-439535cc9891.png|780
gypsum|$B/hf_20260927_134819_266e40a3-20b9-4e99-a547-f9d6a95dd4c1.png|780
accessories|$B/hf_20260927_134820_20039f89-2d9d-4555-9670-4e4ce9e77ab3.png|780
"

echo "→ جاري التنزيل…"
while IFS='|' read -r name url width; do
  [ -z "${name:-}" ] && continue
  printf '   %-14s' "$name"
  if curl -fsS --max-time 120 -o "$TMP/$name.png" "$url"; then
    echo "✓"
  else
    echo "✗ فشل التنزيل"
    echo
    echo "إذا فشلت كل الروابط: الصور محفوظة بحسابك على Higgsfield داخل"
    echo "مشروع \"Al-Ahd Decor Website\" — نزّلها يدوياً وحطها بـ $OUT"
    echo "بنفس الأسماء (hero.webp، showroom.webp، …)."
    exit 1
  fi
done <<< "$IMAGES"

echo "→ جاري التحويل لـ WebP…"
python3 - "$TMP" "$OUT" <<'__PY__'
import sys, os
from PIL import Image

tmp, out = sys.argv[1], sys.argv[2]
plan = {'hero':1600,'showroom':1280,'vanity':780,'faucet':780,
        'shower':780,'tiles':780,'gypsum':780,'accessories':780}

for name, width in plan.items():
    src = os.path.join(tmp, name + '.png')
    if not os.path.exists(src):
        continue
    im = Image.open(src).convert('RGB')
    ratio = width / im.width
    im = im.resize((width, round(im.height * ratio)), Image.LANCZOS)
    dst = os.path.join(out, name + '.webp')
    im.save(dst, 'WEBP', quality=78, method=6)
    print(f"   {name:<14} {im.size[0]}×{im.size[1]}  {os.path.getsize(dst)//1024} KB")
__PY__

echo
echo "✓ تمّت. حدّث الصفحة وشوف الفرق."
