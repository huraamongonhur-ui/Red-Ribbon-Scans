# Red Ribbon Scans — Supabase + Vercel холболт

## 1. Supabase дахь URL болон public key авах

[Supabase Dashboard](https://supabase.com/dashboard) → төслөө сонгоно.

- **Connect** товчоос Project URL болон **Publishable key** авна.
- Эсвэл **Project Settings → API Keys** хэсэг рүү орно.
- Publishable key нь `sb_publishable_...` гэж эхэлдэг. Хуучин төсөл бол **anon** key (`eyJ...`) ашиглаж болно.
- **Хэзээ ч `sb_secret_...` эсвэл `service_role` key-ийг frontend, GitHub, эсвэл энэ public API-д бүү ашигла.**

## 2. Vercel-д Environment Variables тохируулах

[Vercel Dashboard](https://vercel.com/dashboard) → **red-ribbon-scans → Settings → Environment Variables** хэсэгт:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Production, Preview |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase-ийн `sb_publishable_...` key | Production, Preview |

Legacy anon key ашиглаж байгаа бол хоёр дахь нэрийг `SUPABASE_ANON_KEY` болгож болно.

**Энэ төсөл Next.js биш, статик HTML/JS сайт.** `config.js` нь runtime-д `/api/supabase-config` гэсэн Vercel Function-оос public тохиргоогоо авдаг. `process.env`-ийг frontend JS дотор шууд ашиглахгүй.

Environment Variables шинээр тохируулсны дараа **Deployments → Redeploy** хийнэ. Шинэ GitHub commit нь Vercel deployment-ийг автоматаар үүсгэнэ.

## 3. Supabase Auth URL Configuration

Supabase → **Authentication → URL Configuration**:

- **Site URL:** жинхэнэ production сайтын URL (`https://...`).
- **Redirect URLs:** production домэйн болон шаардлагатай preview URL-уудаа нэмнэ (жишээ нь `https://*-mngl-21.vercel.app/**` зөвхөн тохирох preview домэйн ашиглаж байгаа үед).

Бүртгэл үүсгэх код email confirmation-ийг тухайн deployment-ийн `index.html` рүү чиглүүлнэ. Энэ URL Supabase-ийн зөвшөөрсөн Redirect URLs-д байх ёстой.

## 4. Шалгах

1. Vercel deployment-ийн **Ready** статусыг шалгана.
2. `https://<your-domain>/api/supabase-config` хаягт 200 статус болон `url`, `key` (зөвхөн public key) бүхий JSON харагдах ёстой. 503 бол Environment Variables дутуу эсвэл буруу.
3. Сайтыг нээгээд **Нэвтрэх** товчоор бүртгүүлэх / нэвтрэхийг туршина.
4. Email confirmation ашигладаг бол ирсэн имэйлийн холбоос жинхэнэ сайт руу буцаж байгааг шалгана.
5. Нэвтэрсний дараа манганы уншигч дээр үнэлгээ, сэтгэгдлийг шалгана.

## Хэрэв Login харагдаад ажиллахгүй байвал

- Browser Console-д `[Red Ribbon] Supabase login unavailable` гарч байгаа эсэх.
- `/api/supabase-config` 404 бол Vercel Function-ийн deployment/root directory тохиргоо.
- 503 бол Vercel environment variables эсвэл key type.
- Sign-in error бол Supabase **Authentication → Providers → Email** идэвхтэй эсэх, хэрэглэгчийн email баталгаажсан эсэхийг шалга.
- Comments/Ratings error бол Supabase SQL, хүснэгтүүд болон RLS policy-г шалга.

Энэ засвар Supabase дахь хэрэглэгч, өгөгдлийг өөрчилдөггүй.
