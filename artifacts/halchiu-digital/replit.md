# Hălchiu Digital

Ecosistemul digital al comunei Hălchiu (Brașov). Platformă PWA mobilă cu autentificare, roluri, panou de administrare și sistem de guvernanță complet.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI (wouter routing, TanStack Query v5)
- **Backend**: Express.js + Node.js + express-session (connect-pg-simple)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: bcrypt + session-based (SESSION_SECRET env var)
- **Tema**: Forest Green (#152 60% 32%) + Amber Accent

## Module

| Modul | URL | Tabs | Descriere |
|---|---|---|---|
| Acasă (Feed) | `/` | – | Flux știri: anunțuri, alerte, comunitate (doar aprobate) |
| Primăria | `/primaria` | – | Sesizări cu status tracking + răspuns admin |
| Servicii | `/servicii` | Servicii / **Transport** | Director servicii publice locale + orare autobuze/tren |
| Evenimente | `/evenimente` | Evenimente / **Voluntariat** | Calendar + RSVP + acțiuni voluntariat civic |
| Comunitate | `/comunitate` | Discuții / **Anunțuri** | Forum local + anunțuri pierdut/găsit/donații/meșteri |
| Afaceri | `/afaceri` | Afaceri / **Marketplace** / **Joburi** | Director afaceri + marketplace local + oferte angajare |
| Login | `/login` | – | Autentificare |
| Admin | `/admin` | – | Panou administrare + moderare conținut |

> **Bold** = module noi adăugate ca tab-uri (non-breaking extension)

## Sistem de Guvernanță

### Moderare Postări
- Oficiali (`administrator`, `primar`, `viceprimar`) → postări **auto-aprobate**
- `moderator`, `cetatean` → postări intră în **pending**, vizibile după aprobare
- `GET /api/posts` → returnează doar **approved**
- `GET /api/admin/posts` → returnează **toate** (pentru moderare)

### Moderare Evenimente
- Oficiali (`administrator`, `primar`, `viceprimar`) → evenimente **auto-aprobate**
- **Cetățeni** (`cetatean` + orice rol autentificat) → pot **propune** un eveniment → intră în **pending**
- Buton "Propune un eveniment" vizibil în `/evenimente` doar pentru utilizatori autentificați
- Admin aprobă/respinge din `/admin` tab Evenimente (Aprobă / Respinge)
- La aprobare/respingere: cetățeanul primește **notificare în-app + push**
- `GET /api/events` → doar **approved**; câmp `category` (general/voluntariat/cultural/sport)
- `POST /api/events/:id/approve` / `POST /api/events/:id/reject` → admin only
- Voluntariat = events cu `category='voluntariat'` — filtrate în tab-ul Voluntariat

### Sesizări (Reports)
- Status: `in_asteptare` | `in_lucru` | `rezolvat` | `respins`
- Statusurile `rezolvat` și `respins` necesită **adminReply obligatoriu**
- Backend enforces: `PUT /api/reports/:id` returnează 400 dacă lipsește adminReply

### Afaceri Verificate + Workflow de Aprobare
- Câmp `verified` boolean pe tabelul businesses
- `POST /api/businesses/:id/verify` → toggle (doar administrator/primar)
- Afaceri verificate sortate **primele** în DB și în UI
- **Cetățeni** pot propune o afacere → `POST /api/businesses/submit` → intră în **pending**
- Buton "Adaugă afacerea ta în director" vizibil în `/afaceri` tab Afaceri pentru utilizatori autentificați
- Admin vede afacerile pending în `/admin` tab Afaceri (secțiune separată cu Aprobă/Respinge)
- `GET /api/admin/businesses` → returnează **toate** statusurile (pending + approved)
- `POST /api/businesses/:id/approve` / `POST /api/businesses/:id/reject` → admin only

### Postări cu Dată de Expirare
- Câmp `expiresAt` pe tabelul posts
- Job de curățare rulează la startup și la fiecare oră: șterge postările, marketplace-ul și joburile cu `expiresAt` > 24h în trecut; șterge și canalele de chat vechi
- `storage.deleteExpiredPosts()` → logica de curățare

### Moderare Marketplace & Joburi
- **Orice utilizator autentificat** care adaugă un anunț în marketplace sau un job → statusul implicit este **pending**
- Administratori/moderatori aprobă/resping din `/admin` tab Comunitate (subtab Marketplace / Joburi)
- La aprobare/respingere: utilizatorul primește **notificare în-app + push**
- `GET /api/marketplace` → returnează doar **active**
- `GET /api/admin/marketplace` → returnează **toate** statusurile
- `POST /api/marketplace/:id/approve` / `POST /api/marketplace/:id/reject` → moderator only
- `GET /api/jobs` → returnează doar **active**
- `GET /api/admin/jobs` → returnează **toate** statusurile
- `POST /api/jobs/:id/approve` / `POST /api/jobs/:id/reject` → moderator only
- Date seed (admin) sunt marcate automat ca **active** (ocolesc fluxul de moderare)
- Câmpul `expiresAt` pe ambele tabele — anunțurile expirate se șterg automat după 24h de la expirare

### Chat cu Auto-Delete 24h
- Canalele de chat ale căror **primul mesaj** are >24h se șterg automat (toate mesajele din canal)
- `storage.deleteOldChatChannels()` → rulează orar prin cleanup job

### Imagini Auto-Generate pentru Evenimente
- La crearea unui eveniment, dacă nu se furnizează `imageUrl`, serverul generează automat o imagine din `https://picsum.photos` pe baza categoriei și titlului
- Categorii mapate: cultural → concert/festival, voluntariat → natură/mediu, sport → competiție, general → comunitate

### Cereri (Primăria) — Acces Privat
- Tab-ul **Cereri** nu mai este vizibil public — apare în bara de tab-uri **doar pentru utilizatori autentificați**
- Butonul compact **"Cerere"** adăugat în header-ul paginii Primăria (lângă butonul "Sesizare"), vizibil doar dacă utilizatorul este autentificat

### Recomandări personalizate
- Widget „Pentru tine" pe pagina principală (Home) — secțiune nouă în widget customizer
- `GET /api/recommendations` → endpoint autentificat, returnează max 6 iteme recomandate
- **Algoritm de scoring** bazat pe semnale reale din DB:
  - Categorii sesizări submise de utilizator → boost conținut din aceleași categorii
  - `notificationPrefs` → boost evenimente, comunitate, sesizări
  - Activitate marketplace & job listings → boost conținut similar
  - Urgența evenimentelor (apropierea datei) → scor crescut
  - Popularitatea evenimentelor (participantCount)
  - Alertele și anunțurile oficiale recente → bonus fix de prioritate
- **Tipuri de conținut recomandat:** evenimente, afaceri, postări, jobs, marketplace
- **Fallback pentru utilizatori noi** (fără activitate): evenimente viitoare + postări recente
- Widget dezactivabil din personalizatorul de pagină principală
- Carduri orizontale cu scroll, cu icon diferit per tip de conținut
- Utilizatori neautentificați văd un prompt de login în locul recomandărilor

### Tab Permisiuni (Admin)
- Tab nou "Permisiuni" vizibil doar pentru `administrator`
- Afișează toți utilizatorii non-admin cu editorul de permisiuni granulare
- Specialiștii sunt afișați primii (cu evidențiere teal)
- Permite configurarea accesului per-secțiune pentru orice utilizator

## Roluri și permisiuni

| Rol | Postări | Evenimente | Sesizări | Afaceri | Utilizatori | Sănătate/Social |
|---|---|---|---|---|---|---|
| administrator | CRUD + aprobare | CRUD + aprobare | CRUD + status + reply | CRUD + verify | CRUD | CRUD total |
| primar | CRUD + aprobare | CRUD + aprobare | CRUD + status + reply | CRUD + verify | – | CRUD total |
| viceprimar | CRUD | CRUD | status + reply | CRUD | – | CRUD total |
| functionar_public | – | – | status + reply | – | – | CRUD total |
| moderator | delete + aprobare | – | – | – | – | – |
| **specialist** | – | – | – | – | – | **permisiuni granulare configurate** |
| cetatean | community → pending | **propune → pending** | submit | **propune → pending** | – | programare la medic |

### Sistem de permisiuni granulare (rol specialist)

Rolul `specialist` (ex: medic, asistent social) are permisiuni configurate per-secțiune de administrator:
- **Secțiuni**: `health_campaigns`, `health_alerts`, `health_doctors`, `health_appointments`, `social_programs`, `posts`, `events`, `reports`, `businesses`
- **Acțiuni per secțiune**: `canRead`, `canWrite`, `canApprove`, `canDelete`
- **Configurare**: Admin → tab Utilizatori → card specialist → secțiune "Permisiuni granulare"
- **Backend**: middleware `requireSectionPermission(section, action)` verifică rolul + tabelul `user_permissions`
- **Frontend**: hook `useMyPermissions()` + `useHasPermission(section, action)`
- **Sanatate.tsx**: Tab "Programări" vizibil doar pentru cei cu `canApprove/health_appointments`; butoane add/delete pentru campanii/alerte

Marketplace/Anunțuri/Joburi: orice utilizator autentificat poate posta (nu necesită moderare).

## Conturi demo (seed)

| Username | Parolă | Rol |
|---|---|---|
| admin | admin123 | Administrator |
| primar | primar123 | Primar |
| viceprimar | vice123 | Viceprimar |
| functionar | func123 | Funcționar Public |
| moderator | mod123 | Moderator |
| cetatean | cet123 | Cetățean |

## Admin Panel — Tab-uri complete

| Tab | Acces | Ce se poate edita |
|---|---|---|
| Dashboard | admin/primar/viceprimar/funcționar | KPI-uri, sesizări nerezolvate, statistici |
| Postări | admin/primar/viceprimar/moderator | CRUD + moderare (aprobare/respingere) |
| Evenimente | admin/primar/viceprimar | CRUD + aprobare |
| Sesizări | admin/primar/viceprimar/funcționar | Status + răspuns admin + publicare |
| Afaceri | admin/primar/viceprimar | CRUD + verificare |
| Servicii | admin/primar/viceprimar/funcționar | CRUD servicii publice + status |
| Sănătate | admin/primar/viceprimar/funcționar | Campanii, Alerte, Medici, Programări, Prog.sociale |
| Comunitate | admin/primar/viceprimar/moderator | Marketplace, Joburi, Anunțuri comunitare |
| Notificări | admin/primar/viceprimar | Broadcast notificare în app + alertă critică push |
| Utilizatori | admin | CRUD + permisiuni granulare specialist |
| Roluri | admin | Matrice permisiuni per rol |
| Setări CMS | admin | Toate textele frontend (identitate, nav, pagini, geo) |

## Tabele DB

- `users` — autentificare și roluri + `notification_prefs` JSON
- `session` — sesiuni express (auto-creat de connect-pg-simple)
- `posts` — feed: announcements, alerts, community; câmp `status` (pending/approved/rejected)
- `events` — evenimente + participant count; câmpuri `status`, `category` (general/voluntariat/cultural/sport)
- `reports` — sesizări cetățeni; câmpuri `status`, `adminReply`, `visibility`, `userId`, `lat/lng`
- `businesses` — afaceri locale; câmp `verified` boolean
- `services` — servicii publice locale cu schedule JSON și geo
- `marketplace_items` — anunțuri marketplace local (produse/servicii/anunturi)
- `community_announcements` — anunțuri comunitare (pierdut/găsit/donație/meșteșugar/altele)
- `job_listings` — oferte de angajare locale (full_time/part_time/sezonier)
- `app_settings` — setări CMS editabile din admin
- `notifications` — notificări sistem cu categorie și userId (null = broadcast)
- `push_subscriptions` — abonamente Web Push

## Module noi (5 tab-uri adăugate)

### 1. Marketplace (`/afaceri` → tab Marketplace)
- Anunțuri locale pentru vânzare de produse, servicii, anunțuri comerciale
- Filtre pe categorie (Produse/Servicii/Anunțuri comerciale)
- Oricine autentificat poate posta; +3 puncte per anunț
- `GET /api/marketplace`, `POST /api/marketplace`, `PUT /api/marketplace/:id`, `DELETE /api/marketplace/:id`

### 2. Joburi locale (`/afaceri` → tab Joburi)
- Anunțuri de angajare din zona comunei: full-time, part-time, sezonier
- Filtre pe tip angajare
- `GET /api/jobs`, `POST /api/jobs`, `PUT /api/jobs/:id`, `DELETE /api/jobs/:id`

### 3. Anunțuri comunitare (`/comunitate` → tab Anunțuri)
- Anunțuri de tip pierdut/găsit/donație/meșteșugar/altele
- Fiecare anunț expiră în 14 zile (afișare informativă)
- `GET /api/announcements`, `POST /api/announcements`, `PUT /api/announcements/:id`, `DELETE /api/announcements/:id`

### 4. Voluntariat civic (`/evenimente` → tab Voluntariat)
- Events cu `category='voluntariat'` filtrate separat
- Banner cu număr total de voluntari înscriși (social proof)
- Buton verde "Mă înscriu ca voluntar" + toast cu mesaj motivațional

### 5. Transport public (`/servicii` → tab Transport)
- Orare autobuze Linia 19 (RAT Brașov) Hălchiu ↔ Brașov (orientative)
- Maxitaxi cu frecvență ridicată
- Info CFR Călători cu link la căutare tren
- Calculează automat plecările următoare față de ora curentă
- Taxi local cu numere de telefon

## Modul Servicii Locale

### Tabel DB
`services` — id, name, category, type, phone, address, lat, lng, schedule (JSON), status, created_at

### Categorii
| Categorie | Descriere |
|---|---|
| `medical` | Medic familie, farmacie, dispensar |
| `administratie` | Primărie, poliție locală |
| `educatie` | Școală, grădiniță |
| `utilitati` | Apă, electricitate, salubritate |
| `posta` | Oficiu poștal |

### API
- `GET /api/services` — public, returnează doar servicii `activ`
- `GET /api/admin/services` — admin/primar/viceprimar, toate
- `POST /api/services`, `PUT /api/services/:id` — admin/primar/viceprimar/functionar_public
- `DELETE /api/services/:id` — admin/primar

## Dark Mode

- Toggle lună/soare în header (buton `data-testid="button-theme-toggle"`)
- `client/src/hooks/use-theme.ts` — `useThemeState()` + `ThemeContext`
- Persistat în `localStorage` (`halchiu_theme`), respectă `prefers-color-scheme` la primul acces

## Widget Customization

- Buton "Personalizează" în hero-ul paginii principale
- `client/src/hooks/use-widgets.ts` — `useWidgets()` cu `prefs`, `toggle`, `reset`, `show`
- 5 widget-uri configurabile; persistate în `localStorage` (`halchiu_widget_prefs`)

## Tutorial Utilizatori Noi

- `client/src/components/tutorial-overlay.tsx` — overlay cu 5 pași
- Se afișează automat după 1.2s la prima vizită (flag `halchiu_tutorial_done` în localStorage)

## Offline Support

- Service Worker `halchiu-v2` / `halchiu-api-v2`
- API cache, fallback la array gol `[]` pentru API-uri când offline

## Preferințe Notificări

| Categorie | Descriere |
|---|---|
| `anunturi_oficiale` | Anunțuri, alerte și comunicări oficiale de la primărie |
| `sesizari` | Actualizări de status pentru sesizările trimise |
| `evenimente` | Evenimente noi sau modificări de program |
| `comunitate` | Postări noi aprobate în spațiul comunitar |
| `moderare` | Aprobări sau respingeri ale postărilor tale |
| `sistem` | Notificări tehnice și administrative |

## Modul Sănătate Locală + Asistență Socială

### Pagina `/sanatate` — 4 tab-uri
| Tab | Descriere |
|---|---|
| **Alerte** | Alerte de sănătate publică cu severitate (info/warning/critical): caniculă, epidemie, calitate apă, sanitare |
| **Campanii** | Campanii medicale: vaccinare, screening, caravane, prevenție — cu filtre rapide pe tip |
| **Medici** | Director medici de familie: program, status (activ/concediu), contact, înlocuitor, programare online |
| **Asistență** | Programe sociale: ajutor încălzire, cote lemne, vouchere, sprijin vârstnici — expandabile cu detalii |

### Tabele DB noi
- `health_campaigns` — campanii medicale (tip, grup țintă, perioadă, locație, status)
- `health_alerts` — alerte publice (tip, severitate, perioadă, status)
- `doctor_profiles` — profil medici (program JSON, status, înlocuitor, contact)
- `appointment_requests` — cereri programări online (doctor_id, pacient, telefon, dată dorită)
- `social_programs` — programe asistență socială (eligibilitate, perioadă, documente, contact)

### API-uri noi
- `GET/POST /api/health/campaigns` — campanii (POST: functionar_public+)
- `GET/POST/PUT/DELETE /api/health/alerts` — alerte (POST: viceprimar+)
- `GET/POST/PUT/DELETE /api/health/doctors` — medici (POST: functionar_public+)
- `GET/POST /api/health/appointments` — programări (POST: orice utilizator autentificat)
- `GET/POST/PUT/DELETE /api/social/programs` — programe sociale (POST: functionar_public+)

### Bottom nav extins
7 itemi (scrollabil orizontal): Acasă | Primăria | Servicii | **Sănătate** | Evenimente | Comunitate | Afaceri

## Fișiere cheie

- `shared/schema.ts` — toate tabelele + ROLES + ROLE_LABELS + OFFICIAL_ROLES + label constants pentru marketplace/anunțuri/joburi
- `server/auth.ts` — middleware requireAuth/requireRole + permission matrix
- `server/storage.ts` — CRUD complet pentru toate tabelele
- `server/routes.ts` — toate API routes + seedDatabase cu migrații `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE IF NOT EXISTS`
- `client/src/hooks/use-halchiu.ts` — hooks pentru toate modulele (posts/events/reports/businesses/marketplace/announcements/jobs)
- `client/src/hooks/use-auth.ts` — auth query + permission helpers
- `client/src/hooks/use-geolocation.ts` — geo gate (raza 15km Hălchiu)
- `client/src/pages/Admin.tsx` — panou admin: PostsTab, EventsTab, ReportsTab, BusinessesTab
- `client/src/pages/Primaria.tsx` — sesizări cu status + adminReply
- `client/src/pages/Afaceri.tsx` — 3 tabs: Afaceri / Marketplace / Joburi
- `client/src/pages/Comunitate.tsx` — 2 tabs: Discuții / Anunțuri
- `client/src/pages/Evenimente.tsx` — 2 tabs: Evenimente / Voluntariat
- `client/src/pages/Servicii.tsx` — 2 tabs: Servicii / Transport
- `client/src/components/location-gate.tsx` — ecran geo blocare
- `client/src/components/bottom-nav.tsx` — navigare mobilă

## Geolocație

- Raza zonei: 15 km față de centrul Hălchiu (45.7267°N, 25.5822°E)
- `/login` și `/admin` sunt exceptate de la verificarea geo
- Sesiunea geo se memorează în `sessionStorage`
