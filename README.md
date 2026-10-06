<div align="center">

<img src="public/pluginpulse-mark-512.png" width="96" height="96" alt="PluginPulse logo">

# PluginPulse

### Release health for public GitHub repositories

Inspect releases, downloadable assets, issue pressure, and repository activity from one focused dashboard—without creating an account or supplying an API token.

[![Live site](https://img.shields.io/badge/Live_site-2F5BFF?style=for-the-badge&logo=githubpages&logoColor=white)](https://flennium.github.io/PluginPulse/)
[![Deployment](https://img.shields.io/github/actions/workflow/status/flennium/PluginPulse/deploy.yml?branch=main&style=for-the-badge&label=deployment)](https://github.com/flennium/PluginPulse/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/flennium/PluginPulse?style=for-the-badge)](LICENSE)

</div>

---

## What it does

PluginPulse turns an `owner/repository` identifier—or a complete GitHub repository URL—into an operational release overview.

- Latest published release and downloadable assets
- Git tag and source-archive fallback for projects that do not use GitHub Releases
- Asset sizes and download counts
- Recent release history
- Exact open-issue count when GitHub Search supports the repository, with an open-items fallback when it does not
- Stars, forks, language, license, topics, and default branch
- Last repository activity and remaining public API allowance
- Direct links back to every relevant GitHub source

All information comes from GitHub's public REST API. PluginPulse stores no credentials and requests no repository permissions.

## Try it

Open **[PluginPulse](https://flennium.github.io/PluginPulse/)** and enter a repository such as:

```text
flennium/LightStaff
```

Complete GitHub URLs work too:

```text
https://github.com/PaperMC/Paper
```

## Interface states

The application handles the states that matter in normal use:

| State | Behavior |
| --- | --- |
| Loading | Reports each scan stage while repository data is collected |
| Not found | Explains that the repository must exist and be public |
| Rate limited | Shows when the public GitHub allowance resets |
| No releases | Links to repository tags instead of presenting an empty panel |
| Network failure | Provides a clear recovery action |

## Built with

| Layer | Technology |
| --- | --- |
| Interface | React 18 + TypeScript |
| Build system | Vite |
| Data | GitHub REST API |
| Icons | Lucide React |
| Typography | Manrope + JetBrains Mono |
| Testing | Vitest |
| Hosting | GitHub Pages |

## Local development

Prerequisites: Node.js 20 or newer and npm.

```bash
git clone https://github.com/flennium/PluginPulse.git
cd PluginPulse
npm install
npm run dev
```

The development server prints the local URL after startup.

## Quality checks

Run the same checks used by the deployment workflow:

```bash
npm run lint
npm test
npm run build
```

Every push to `main` must pass linting, unit tests, and the production build before GitHub Pages is deployed.

## API limits

PluginPulse intentionally uses unauthenticated requests so visitors never need to paste a token into a website. GitHub currently allows 60 unauthenticated REST API requests per hour per originating IP address. The repository view displays the remaining allowance returned by GitHub.

Successful reports are cached in the browser for five minutes. Repeating the same lookup during that window does not consume more API requests. The cache stays on the visitor's device and contains only public repository data.

## Accessibility

- Semantic headings, landmarks, tables, and status announcements
- Full keyboard operation with visible focus indicators
- Touch-friendly interactive targets
- High-contrast text and controls
- Responsive desktop and mobile layouts
- Reduced-motion behavior that removes the traveling scan animation while preserving status text

## Deployment

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) validates and builds the application before publishing `dist/` to GitHub Pages.

Because the site is hosted below `/PluginPulse/`, the Vite base path is configured in [`vite.config.ts`](vite.config.ts).

## Project structure

```text
src/
├── App.tsx          Main interface and application states
├── github.ts        GitHub REST API client and input parsing
├── github.test.ts   Repository-input unit tests
├── format.ts        Dates, numbers, and file-size formatting
├── styles.css       Responsive visual system
├── types.ts         GitHub response types
└── main.tsx         Application entry point
```

## Privacy and security

- No analytics or trackers
- No cookies created by the application
- No authentication tokens requested or stored
- No write access to GitHub accounts or repositories
- Only public repository information is displayed

## License

Released under the [MIT License](LICENSE).

<div align="center">

Built by [Mokhtari Abderrahmane](https://github.com/flennium)

</div>
