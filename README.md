# Daily Standup Attendance Web

React + Vite attendance dashboard matching the Unity attendance tool.

## Features
- Same 30-member team seed data
- Present / Leave / Working From Home / In Meeting / Absent
- Date navigation and date picker
- Add/remove team members
- Search and status filtering
- Summary cards
- Selected-date PDF export
- JSON backup/import
- Automatic browser persistence via localStorage
- Responsive desktop/tablet/mobile UI
- GitHub Pages deployment through GitHub Actions

## Run locally
```bash
npm install
npm run dev
```

## Build locally
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
1. Create a GitHub repository, for example `daily-standup-attendance`.
2. Upload/push the project files to the repository's `main` branch.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment → Source**, select **GitHub Actions**.
5. Push to `main` or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
6. GitHub will publish the generated site at the repository's Pages URL.

The Vite configuration automatically uses `/<repository-name>/` when running inside the GitHub Actions build, while local development continues to use `/`.

## Data storage
Attendance is stored in browser `localStorage`. GitHub Pages hosts the frontend but does not provide a shared database, so different users/browsers will have separate attendance data. Use JSON Backup/Import to move data between browsers.
