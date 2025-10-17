# 🎙️ Next.js Interactive Story App (TTS + Supabase)

An open-source interactive story engine built with **Next.js 14**, **TypeScript**, and **Supabase**.  
Stories are structured like choose-your-own-adventure games with dice rolls, TTS voice narration, and Cloudinary images.

---

## 🚀 Tech Stack

- **Next.js 14 + TypeScript** – frontend and API routes  
- **Supabase (PostgreSQL + Realtime + RLS)** – fast, reliable story data  
- **Cloudinary** – image hosting and transformations (25 GB free)  
- **Google Sheets → Supabase Sync** – simple authoring workflow  
- **TTS / SSML** – text-to-speech narration for each scene

---

## 🧱 Database Schema

### stories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| slug | text | Unique story slug |
| title | text | Display title |
| lang | text | e.g. `da-DK` |
| description | text | Optional |
| cover_image_url | text | Cloudinary URL |
| is_published | boolean | Controls public read |
| version | int | Bumps on import |
| created_at / updated_at | timestamptz | Timestamps |

### story_nodes
| Column | Type | Notes |
|--------|------|-------|
| story_id | uuid | FK → stories.id |
| node_key | text | Unique key per story (e.g. "42") |
| text_md | text | Scene text (markdown) |
| tts_ssml | text | Prebuilt SSML |
| image_url | text | Cloudinary image |
| dice_check | jsonb | e.g. `{ "stat":"Skill", "dc":8, "success":"43", "fail":"17" }` |
| sort_index | int | Optional ordering |

### story_choices
| Column | Type | Notes |
|--------|------|-------|
| story_id | uuid | FK → stories.id |
| from_node_key | text | Source node |
| label | text | Button text |
| to_node_key | text | Destination node |
| conditions | jsonb | Optional state checks |
| effect | jsonb | Optional stat changes |

---

## 🔐 Row Level Security (RLS)

Enable RLS and allow anonymous reads only for published stories:

```sql
create policy "public read only published stories"
on public.stories
for select
using (is_published = true);
```

Apply similar policies for `story_nodes` and `story_choices`.

---

## 🖼️ Cloudinary vs Supabase Storage

Keep **Cloudinary** for images.

* Built-in resizing, CDN caching, and automatic format conversion (`f_auto,q_auto`)
* Store only the transformed image URL in your database.
  Supabase storage is fine but less cost-efficient for many small image assets.

---

## 🔄 Google Sheets → Supabase Sync

Author stories in Google Sheets, then sync automatically.

### Option A: Push from Google Apps Script

Attach a small Apps Script to your sheet that POSTs rows to your Next.js API route:

```js
const ENDPOINT = 'https://yourdomain.com/api/ingest/sheet';
const TOKEN = 'your_ingest_token';

function publishAll() {
  const data = getRowsAsJSON();
  UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    payload: JSON.stringify({ storySlug: 'pirate-quest', rows: data })
  });
}
```

### Option B: Pull via Cron

A Supabase Edge Function or GitHub Action runs every X minutes, reads the Sheet, and upserts to Supabase.

---

## 🧩 Example Query (load one node + its choices)

```sql
select n.*,
  (select coalesce(json_agg(c order by c.sort_index), '[]'::json)
   from story_choices c
   where c.story_id = n.story_id
     and c.from_node_key = n.node_key) as choices
from story_nodes n
where n.story_id = $1
  and n.node_key = $2;
```

---

## 🧠 Gameplay Logic

* Each node contains text, image, optional dice check, and outgoing choices.
* Dice rolls (2d6 or similar) are handled client-side using `dice_check`.
* Game state (stats, items, flags) can be stored in localStorage for now.
* TTS voices read either raw text or prebuilt `tts_ssml` from the database.

---

## 💰 Cost & Limits

| Service       | Free Tier                    | Notes                             |
| ------------- | ---------------------------- | --------------------------------- |
| Supabase      | 500 MB DB, generous Realtime | perfect for small story libraries |
| Cloudinary    | 25 GB storage + CDN          | image transforms included         |
| Google Sheets | Free                         | lightweight editor                |

---

## 🧭 Development

1. Clone repo
2. Create a Supabase project → copy URL + anon + service keys to `.env`
3. Run database migrations (`supabase db push` or `sql` scripts above)
4. Deploy Next.js app (`npm run dev`)
5. (Optional) connect Google Sheet and publish your first story

---

## 🛠️ Future Ideas

* User saves & branching stats
* In-browser editor powered by Supabase Realtime
* Audio ambience per node
* Localization table for multi-language stories
* SSR pre-rendered stories for SEO

---

## ⚖️ License

MIT — free to use, share, and adapt. Attribution appreciated.

---

Made with ❤️, dice, and a bit of Supabase magic.