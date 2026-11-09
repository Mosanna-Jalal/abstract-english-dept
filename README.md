# Abstract Archive — Department of English

A categorised archive of research abstracts with a public reading site and an
admin panel for importing and categorising submissions. Built with Next.js 16
(App Router, Cache Components), React 19, Tailwind CSS 4 and MongoDB.

## What's inside

**Public site** (mobile-first, light and dark mode)

- **Home**: event title, search, categories, latest abstracts
- **Browse** (`/abstracts`): live search across titles, authors, institutions, keywords and full text, with category filters
- **Category pages** (`/categories/[slug]`) and **abstract pages** (`/abstracts/[no]`) with share links
- **Book of Abstracts** (`/book`): every abstract arranged by category, with contents. Use *Print / Save PDF* for a printed or PDF copy
- **Guidelines** (`/guidelines`): taken from Settings

An abstract appears publicly once it has a category and isn't hidden. Authors'
emails, phone numbers and the original files are never shown publicly.

**Admin panel** (`/admin`, password-protected)

- **Overview**: progress, totals and abstracts per category
- **Categorise**: one abstract at a time, filed with one tap. Suggestions come from category keywords and the author's stated sub-theme. Keys: `1`–`9` choose a category, `Enter` accepts the suggestion, `S` skips, `H` hides, `Z` undoes
- **Abstracts**: search, filter, change categories inline, bulk move, hide or delete, and edit any field. The editor checks word and keyword limits against the guidelines
- **Categories**: add, edit, recolour, reorder and delete categories, or start from a 12-category starter set
- **Import**: upload PDF, Word (.docx) or text files, or import straight from a Google Drive folder. Title, authors, institution, email, keywords, sub-theme and text are extracted automatically, and duplicates are skipped
- **Settings**: site and event details and submission guidelines
- **Export CSV**: every abstract with its category, for Excel or Google Sheets

## Setup

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000  (admin: /admin)
```

Create `.env.local` in the project root. It is git-ignored, so never commit it.

| Variable | Purpose |
| --- | --- |
| `DB_URI` | MongoDB connection string |
| `DB_NAME` | Database to use (`abstract-english-dept`) |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `SESSION_SECRET` | Long random string that signs the admin cookie. Changing it signs everyone out |
| `GOOGLE_API_KEY` | *Optional.* Enables **Import → Google Drive** |
| `DRIVE_FOLDER_ID` | *Optional.* Folder pre-filled in the Drive importer |

Generate a secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## First run (suggested order)

1. **Settings**: copy the event title, dates, venue and guidelines from the seminar brochure. Set the word and keyword limits so the editor can flag abstracts that don't follow them.
2. **Categories**: enter the brochure's sub-themes, adding a few keywords to each to sharpen the suggestions.
3. **Import**: upload the abstract files (or use Google Drive, below).
4. **Categorise**: work through the queue. Each abstract goes live as soon as it has a category.
5. **Book**: print or save the Book of Abstracts as a PDF.

### Importing from Google Drive

1. In Drive, open the folder → **Share** → General access → **Anyone with the link** (Viewer).
2. In the [Google Cloud console](https://console.cloud.google.com/apis/library/drive.googleapis.com), enable the **Google Drive API** and create an **API key**.
3. Set `GOOGLE_API_KEY` (and optionally `DRIVE_FOLDER_ID`), then restart the app.

Brochures, posters and notices are skipped by name. Files already imported are
recognised on later scans.

No API key? Download the folder from Drive (it arrives as a ZIP), unzip it, and
drop the files into **Import → Upload files**.

## Deploying

Works on any Node host. For Vercel: import the repository, add the variables
above in **Project → Settings → Environment Variables**, and deploy. In MongoDB
Atlas, **Network Access** must allow the host to connect (Vercel needs
`0.0.0.0/0` unless you use a static-IP add-on). The build reads from the
database, so the variables must also be available at build time.

## How it fits together

```
app/(site)/          public pages (cached with "use cache" + cacheTag)
app/admin/(auth)/    login
app/admin/(panel)/   admin pages (fresh data, behind requireAdmin)
app/admin/actions.ts Server Actions: every mutation re-checks the session and
                     calls updateTag() so public pages refresh immediately
app/admin/export     CSV export      app/admin/files/[id]  original files (admin only)
proxy.ts             redirects signed-out visitors away from /admin
lib/parse-abstract.ts  turns extracted text into title / authors / keywords / body
lib/suggest.ts         explainable keyword-based category suggestions
lib/queries.ts         public cached reads   lib/admin-queries.ts  admin reads
```

MongoDB collections: `abstracts`, `categories`, `settings`, `counters` (paper
numbers), and the GridFS bucket `originals` for uploaded files.

## Security notes

- Change `ADMIN_PASSWORD` before sharing the site, and keep `.env.local` private.
- If the database password has ever been shared in a message or screenshot,
  rotate it in Atlas (**Database Access → Edit → Update password**) and update `DB_URI`.
