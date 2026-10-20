# ScaleNest Digital — Website

A multi-page agency website with a Careers / work-from-home hiring section, form handling and an admin CMS. It is built to run entirely on the **Netlify free tier**:

| Part | Runs on |
|---|---|
| 39 static pages (fast, SEO-friendly) | Netlify CDN, built by `build.js` |
| Form submissions, resume uploads, admin API | Netlify Functions (`netlify/functions/`) |
| Database (submissions, uploaded files, jobs/blog/case studies) | **MongoDB Atlas** (free M0 cluster) |

## Deploy to Netlify (step by step)

1. **Put the code on GitHub.** Push this folder to a new GitHub repository. `.gitignore` already excludes `node_modules/`, `dist/` and `.netlify/`.
2. **Create the site.** In Netlify, go to **Add new site → Import an existing project** and pick the repo. Netlify reads `netlify.toml` automatically:
   - build command: `npm run build`
   - publish directory: `dist`
   - functions directory: `netlify/functions`

   Click **Deploy**.
3. **Allow Netlify to reach MongoDB.**
   - In MongoDB Atlas, go to **Security → Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).
   - This is needed because Netlify Functions run on changing AWS addresses. Many Indian home connections (e.g. Jio) also rotate IPs, so allowing only your current IP breaks connections.
   - Keep the database user's password strong. It's the real protection.
4. **Set environment variables.** Go to **Site configuration → Environment variables**:

   | Variable | Required? | Purpose |
   |---|---|---|
   | `MONGODB_URI` | **Yes** | Atlas connection string: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
   | `MONGODB_DB` | Optional | Database name (default `scalenest`) |
   | `ADMIN_PASSWORD` | **Yes** | Password for `/admin/`. The admin stays locked until this is set. |
   | `BUILD_HOOK_URL` | Recommended | Lets admin edits to jobs, posts and case studies go live automatically (see step 4) |
   | `NOTIFY_EMAIL` | Optional | Where enquiry emails go |
   | `CAREERS_EMAIL` | Optional | Where job applications go. Falls back to `NOTIFY_EMAIL`. |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Sends email notifications, e.g. Gmail with an App Password: `smtp.gmail.com`, port `465` |
   | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID` | Optional | Syncs newsletter sign-ups to Mailchimp |

5. **Create a build hook.**
   1. Go to **Site configuration → Build & deploy → Build hooks → Add build hook**. Name it "Admin CMS" and choose your production branch.
   2. Copy the URL Netlify gives you into the `BUILD_HOOK_URL` variable.
6. **Redeploy** so the new variables take effect: **Deploys → Trigger deploy**.
7. **Custom domain (optional).** Add it under **Domain management**. Also update `url` in `src/data/site.json`, which is used for canonical URLs, the sitemap and schema.

## How the data works (MongoDB)

Database `scalenest` holds these collections:

| Collection | Contents |
|---|---|
| `jobs`, `posts`, `case_studies` | One document per job, post or case study, each with a unique `slug` |
| `submissions` | Every form submission, with status, notes and status history |
| `uploads.files` / `uploads.chunks` | Resumes and voice notes (GridFS) |
| `_meta` | Records that indexes and seed content have been set up |

**First run:**
- Indexes are created automatically.
- The jobs, posts and case studies in `src/data/*.json` are copied into MongoDB.
- From then on, MongoDB is the source of truth. Editing the JSON files later doesn't change the live site.

**Form submissions:**
- Every form (contact, SEO audit, service inquiry, book a call, newsletter, job application) posts to `/api/forms/<type>`.
- The function validates the data and checks spam protection before saving.
- **Job applications** are also checked:
  - the job must exist and be **open**;
  - the same mobile number can apply to the same job only **once every 30 days**;
  - the OTP token must be valid.
- Duplicate newsletter sign-ups are ignored.

**Admin dashboard** (`/admin/`, signed in with `ADMIN_PASSWORD`):
- **Inbox:**
  - Filter by type, job and status, and search by name, email, phone or city.
  - Download resumes and voice notes.
  - Set a status: new → contacted → shortlisted → interview → hired / rejected. Each change is recorded in the history.
  - Add private notes, call or WhatsApp the applicant, and export the current filtered view to CSV.
- **Job openings:**
  - "Post a new job", Edit, **Duplicate** (a quick way to create a similar opening), Close / Reopen, and Delete.
  - Each job shows its **applicant count**. Click the count to see those applicants.
  - The server checks required fields, that the salary range makes sense, and that the URL slug is unique.
- **Blog posts / Case studies:** add, edit, publish or unpublish, and delete.

**How CMS edits go live:**
1. Saving in the admin triggers the build hook.
2. The build calls `/api/content/<name>`, which reads MongoDB, and regenerates the static pages (including Google Jobs schema and the sitemap).
3. Changes appear in about one minute.

### Job application form (4 steps, saved step by step)

1. **Basic details:** name, mobile, email, date of birth (DD/MM/YYYY; slashes added automatically; must be 18+), PIN code (fills city and state), current status and gender.
2. **Education & work:** qualification, stream, year of passing, experience and languages. College, skills and last job are optional and folded away.
3. **Verify mobile:**
   - The applicant ticks "linked to my Aadhaar" and taps **Verify your number**. A **30-second countdown** ("Sending OTP to +91 …") starts.
   - Then the **Enter OTP** screen appears. They type the OTP you sent **from your other platform** (this site doesn't send or generate codes) and tap **Submit OTP**, which moves them to the next step automatically.
   - "Didn't get the OTP? Request again" restarts the cycle.
4. **Finish:** shift, start date, work-from-home setup, resume (optional for freshers), voice note, "Check your answers", consent and submit.

**Save & Next:**
- Every step has a **Save & Next** button that saves to MongoDB before moving on.
- After step 1 the applicant appears in the admin inbox as **incomplete · step X/4**.
- Going back to edit a step and pressing Save & Next again updates the same record; there's never a duplicate. Submit completes it (status **new**).
- A notice under step 1 tells applicants their details are saved.
- The same browser restores the application where they left off.

**Mobile verification (decided by the admin):**
- The OTP is sent to the applicant from your other platform. The website never generates or sends codes; it only stores the OTP the applicant types (4–8 digits).
- **Applicant:**
  1. Taps **Verify your number** → a 30-second "Sending OTP" countdown → the **Enter OTP** screen.
  2. Taps **Submit OTP** → "**Waiting for approval**" with a 45-second countdown. The form checks for your decision every 5 seconds.
  3. **The next step stays locked until you click Verified**, then the applicant moves on automatically.
  4. On **Failed**, they see "OTP could not be verified" and a **Re-generate OTP** button. Tapping it opens the OTP box straight away for the new code.
- **Admin dashboard alerts:** when an applicant taps *Verify your number* or *Re-generate OTP*, or submits an OTP, the dashboard (checking every 8 seconds):
  - **rings** — use the 🔔 Sound on/off button;
  - shows a **pop-up** with name, number, job and the entered OTP;
  - puts the count in the browser tab title;
  - shows a **desktop notification** if you click "Enable desktop alerts".
  - Pop-ups for submitted OTPs have **✓ Verified** / **✗ Failed** buttons, so you can decide straight from the alert.
  - Browsers only allow sound after you've clicked somewhere on the dashboard once (signing in counts). Keep the dashboard tab open to hear alerts.
- The same buttons are in the inbox row and the application details. The **Mobile** filter lists requested / pending / verified / failed.
- Every change is recorded in the history, with the number of OTP requests and attempts (maximum 10 each).
- Changing the mobile number resets verification.
- **The final submit is refused unless the number is verified.**
- We deliberately **don't collect Aadhaar numbers**. In India, only specially licensed entities may collect or check Aadhaar numbers.

### Free-tier notes

- **Uploads:** resumes and voice notes are limited to **2 MB each**, because Netlify Functions accept request bodies of only about 6 MB.
- **MongoDB Atlas M0:** 512 MB storage. Text-only submissions are tiny (~2 KB each), but resumes take most of the space: about **250–500 resumes at 1–2 MB each**. When the cluster gets close to full (Atlas emails you):
  - delete applications you've rejected or closed — this also deletes their files;
  - or download the files you need and delete older ones;
  - or upgrade the cluster.
- **Function usage:** the free tier includes 125k function calls per month. Each form submission is one call, and the admin uses a few per page view.
- **Build minutes:** each build takes well under a minute, and the free tier includes 300 build minutes per month.

## Local development

```bash
npm install
npm run build                          # static pages only → dist/
npm run dev                            # full stack (Functions + MongoDB) on http://localhost:8888
```

Put your settings in a `.env` file in the project folder. Git ignores it, so it's never committed. For example:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=scalenest
ADMIN_PASSWORD=choose-a-password
```

Local development uses the same Atlas database as the live site, unless you set a different `MONGODB_DB` (e.g. `scalenest_dev`).

## Project structure

```
build.js                 Static site generator → dist/ (pages, admin UI, sitemap.xml, robots.txt, search index)
netlify.toml             Netlify build, functions and headers config
netlify/functions/       forms.mjs (form submits), application-progress.mjs (Save & Next), application-status.mjs (verification status),
                         admin.mjs (password-protected API), content.mjs (CMS data for builds)
netlify/lib/shared.mjs   MongoDB connection, indexes, seeding, GridFS files, auth, build hook
src/data/                Site content: site.json, services.json, content.json, pricing.json + seed jobs/posts/case studies
src/lib/                 layout.js (head/SEO/header/footer), components.js (cards, forms, schema), icons.js
src/pages/               One module per page family
public/assets/           styles.css, main.js, images
admin/                   Admin dashboard UI (copied to dist/admin/)
```

## Pages and URLs

| Page | URL |
|---|---|
| Home | `/` |
| About | `/about/` |
| Services overview | `/services/` |
| Individual services | `/services/digital-marketing/`, `/services/seo/`, `/services/meta-ads/`, `/services/website-development/`, `/services/tele-calling/` |
| Case studies, plus one detail page each | `/case-studies/`, `/case-studies/<slug>/` |
| Pricing | `/pricing/` |
| Careers | `/careers/` |
| Job detail, one per opening | `/careers/<slug>/` |
| Blog, plus posts | `/blog/`, `/blog/<slug>/` |
| Contact | `/contact/` |
| FAQ | `/faq/` |
| Legal | `/privacy-policy/`, `/terms-and-conditions/`, `/refund-policy/` |
| 404 | any unknown URL |

## Before going live (replace placeholders)

1. **Business details:** phone, WhatsApp, email, domain and social links in `src/data/site.json`.
2. **Tracking IDs:** real GTM, GA4 and Meta Pixel IDs in `site.json → tracking`. These scripts load only after a visitor accepts cookies.
3. **Images:**
   - Team photos and client photos use initials avatars.
   - The gallery, blog thumbnails and client logos use styled placeholders.
   - Replace them with real WebP images and alt text.
4. **Social share image:** add a 1200×630 PNG as `public/assets/img/og-default.png` and update the path in `src/lib/layout.js`. Facebook and LinkedIn don't show SVG share images.
5. **Content and legal:**
   - Check that every claim is true for your business: stats, partner badges, testimonials, case studies, salaries and benefits.
   - Have a lawyer review the legal pages.
