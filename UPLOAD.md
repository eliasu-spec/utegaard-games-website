# Utegaard Games site: upload notes

A static site with no build step and no server code. Every link and asset path is relative, so it works at the root of any domain.

**Do not upload this site until ES says it is ready.**

## Domain and host

- **Domain:** utegaardgames.com
- **Host:** FTP to Network Solutions, into the domain’s web root (**`htdocs`**; some plans call it `public_html` or `www`)
- The site is saved locally until ES gives the go-ahead to publish. Do not FTP, push, or otherwise put it live before then.

## Folder layout

The upload root holds only the pages, styles, scripts, and this file. All static media lives under `assets/`.

```
├── index.html              Utegaard Games studio home
├── everest-chess-3d.html   Full Everest Chess 3D marketing page
├── support.html            Support page (good to use as the App Store Connect "Support URL")
├── privacy.html            Privacy policy
├── css/styles.css
├── css/chrome.css          Header and footer styles used by the privacy page
├── js/main.js
├── assets/
│   ├── logos/
│   │   ├── utegaard-games-logo_v3b_transparent.png      Official v3b master (2400×1200)
│   │   ├── utegaard-games-logo_v3b_trimmed_transparent.png  Official trimmed source (1948×881)
│   │   ├── utegaard-games-logo_v3b_web-512_transparent.png  Official 512-wide web cut
│   │   ├── utegaard-games-logo.png / .webp              Optimized site hero (1800×814, alpha)
│   │   ├── utegaard-games-logo-header.png / .webp       Optimized header/footer mark (400×181, alpha)
│   │   ├── everest-chess-3d-logo.png / .webp
│   │   └── the-bluffs/          Placeholder for The Bluffs logo (see README there)
│   ├── animations/              Placeholder for motion (see README; golf cart intro is a canvas player)
│   ├── images/                  Screenshots, og-image, Furniture Rebellion art, app icon, App Store badge
│   ├── fonts/                   Fraunces + Inter (SIL Open Font License), subset to Latin, self-hosted
│   └── icons/                   favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192.png
└── UPLOAD.md                    This file (you do not need to upload it)
```

Browsers sometimes request `/favicon.ico` at the domain root. The file lives at `assets/icons/favicon.ico` and is linked from every page. If you want the automatic `/favicon.ico` request to succeed after go-live, copy that file to the web-root `favicon.ico` as well — only when ES says to upload.

## Official Utegaard Games logo (v3b)

The locked logo is **v3b** (the tipped, 10-degree whole-word variation). Source files in `assets/logos/` were copied from the brand pack, which matches the official library:

- **GitHub:** [github.com/eliasu-spec/utegaard-games-brand](https://github.com/eliasu-spec/utegaard-games-brand) → `logo/v3b-final/`
  - `logo/v3b-final/transparent/` — transparent, trimmed, 1024 square, and web-512
  - `logo/v3b-final/on-color/` — espresso, black, white, deep navy, dark teal
- Site-optimized copies (`utegaard-games-logo.png` / `.webp` and `…-header.png` / `.webp`) were resized from `utegaard-games-logo_v3b_trimmed_transparent.png` (1948×881) for 2× display, with the alpha channel kept and the artwork otherwise unchanged. There is no SVG: the 3D wordmark would flatten as a vector.
- Utegaard Games is a trade name, never a company (no Inc or LLC).
- The site must not be uploaded until ES says it is ready.

## Other assets and where they came from

| Site path | Source |
|---|---|
| assets/icons/app-icon files, favicon.ico | `eliasu-spec/everest-chess-3d` → `App/ChessMountain/Assets.xcassets/AppIcon.appiconset/AppIcon_1024_light.png` (resized; favicons use iOS-style rounded corners) |
| assets/logos/everest-chess-3d-logo.png / .webp | `App/ChessMountain/Assets.xcassets/SplashLogo.imageset/splash_logo@3x.png` (864×300) |
| assets/images/og-image.jpg | Studio social preview: the v3b logo on #0E0D0C, 1200×630 |
| assets/images/og-everest-chess-3d.jpg | Earlier Everest Chess 3D social preview, used on `everest-chess-3d.html` |
| assets/images/screens/iphone-01…07 | Official published App Store iPhone screenshots (mzstatic, resized to 720 px wide) |
| assets/images/screens/ipad-01-coach, ipad-02-themes-grid, ipad-06-board-topdown-threats | Official published App Store iPad screenshots (mzstatic, resized to 1400 px wide) |
| assets/images/app-store-badge-black-us.svg | Apple’s official “Download on the App Store” badge, black, US English, from tools.applemediaservices.com |
| assets/images/furniture-rebellion-header.jpg / .webp | Finished exploding-dresser header art: `/workspace/design/james-furniture-rebellion/_concepts/header/header-D_exploding-dresser_2400x800_opaque.png` |
| assets/images/furniture-rebellion-icon.jpg / .webp | Approved exploding-dresser icon: `…/D_exploding-dresser/D_exploding-dresser_icon-master-1024_APPROVED.png` (kept for later use; the home tile uses the header) |
| privacy.html | `eliasu-spec/everest-chess-3d-site` → `privacy.html`, with only site header/footer chrome added around the existing policy text |

## Uploading to Network Solutions (FTP/SFTP) — only after ES says ready

1. In Network Solutions, open **Account Manager → Hosting → Manage → FTP/SFTP** (or File Manager) to get the host, username, and password.
2. Connect with an FTP client such as FileZilla or Cyberduck. Use SFTP if your plan offers it.
3. Open the domain’s **web root**. On Network Solutions this is usually **`htdocs`**.
4. Upload the **contents** of this folder, not the folder itself, so the server looks like this:
   ```
   htdocs/index.html
   htdocs/everest-chess-3d.html
   htdocs/support.html
   htdocs/privacy.html
   htdocs/css/…  htdocs/js/…  htdocs/assets/…
   ```
   That way `index.html` is served at `/`. If you upload the folder itself, the site would only load at a subpath.
5. Upload in **binary** mode, or “Auto”, which FileZilla uses by default. That keeps images and fonts from getting corrupted.
6. If the host already put a placeholder `index.html` or `index.htm` / `default.html` in `htdocs`, delete or replace it so it doesn’t take priority over the new homepage.
7. Visit https://utegaardgames.com and check that the homepage, `/everest-chess-3d.html`, `/support.html`, and `/privacy.html` all load. If you still see the old page, force-refresh.

### After it is live (optional)
- **Social previews:** `og:image` uses a relative path (`assets/images/og-image.jpg`). Some link-preview services only accept absolute URLs, so once the site is live you can change it in `index.html` to `https://utegaardgames.com/assets/images/og-image.jpg` (in both `og:image` and `twitter:image`). You can also add `<link rel="canonical" href="https://utegaardgames.com/">` and `<meta property="og:url" …>`.
- **App Store Connect:** you can point the Support URL at `https://utegaardgames.com/support.html` and the Privacy Policy URL at `https://utegaardgames.com/privacy.html`. The GitHub Pages copies keep working until you change them.
- **HTTPS:** turn on the SSL certificate for the domain in Network Solutions so the site loads over https.

## Facts shown on the Everest Chess 3D page (from the live App Store listing, 9 Nov 2026)
- Subtitle: Learn & Play Friends, No Ads. Price $4.99 USD. iOS 18.0 or later, iPhone and iPad. English, Spanish, Portuguese.
- Rating: 5.0 from 2 ratings (US). The two reviews are quoted word for word. Update the reviews section by hand as more come in.
- Footer: © 2026 Utegaard Games · Developed by Elias Utegaard · support.utegaardgames@gmail.com
