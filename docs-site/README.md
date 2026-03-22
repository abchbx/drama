# Documentation Site

This is the VitePress documentation site for the Multi-Agent Drama System.

## Development

### Install Dependencies

```bash
cd docs-site
npm install
```

### Start Development Server

```bash
npm run docs:dev
```

The dev server will start on http://localhost:5173

### Build Production Version

```bash
npm run docs:build
```

The production build will be generated in `.vitepress/dist/`.

### Preview Production Build

```bash
npm run docs:preview
```

The preview server will start on http://localhost:4173

## Project Structure

```
docs-site/
├── .vitepress/          # VitePress configuration
│   └── config.mts
├── docs/                 # Documentation content
│   ├── index.md          # Homepage
│   ├── guide/           # Getting started and concepts
│   ├── api/             # API reference
│   ├── user-guide/       # User documentation
│   └── architecture/     # Architecture docs
├── package.json          # Dependencies and scripts
└── .vitepress/dist/     # Production build output (generated)
```

## Documentation Sections

- **Guide** - Getting started, quick start, core concepts
- **API Reference** - Complete HTTP API documentation
- **User Guide** - Session management, configuration, export, troubleshooting
- **Architecture** - System overview, components, data flow

## Deployment

The documentation site is a static site that can be deployed to:

- GitHub Pages
- Vercel
- Netlify
- Any static hosting service

### GitHub Pages Deployment

1. Build the site: `npm run docs:build`
2. Push the `docs-site/.vitepress/dist` directory to GitHub Pages branch
3. Configure GitHub Pages to serve from `dist/` directory

### Vercel Deployment

1. Build the site: `npm run docs:build`
2. Link your Vercel project to this repository
3. Configure build command: `cd docs-site && npm run docs:build`
4. Configure output directory: `docs-site/.vitepress/dist`

### Netlify Deployment

1. Build the site: `npm run docs:build`
2. Link your Netlify site to this repository
3. Configure build command: `cd docs-site && npm run docs:build`
4. Configure publish directory: `docs-site/.vitepress/dist`

## Features

- **Dark/Light Theme Toggle** - Built-in VitePress feature
- **Mobile-Responsive Design** - Works on all screen sizes
- **Local Search** - Search across all documentation pages
- **Syntax Highlighting** - Code blocks with language-specific highlighting
- **Mermaid Diagrams** - Architecture and data flow diagrams
- **Copy-Pasteable Examples** - All code examples ready to use

## Configuration

VitePress is configured in `.vitepress/config.mts`:

- Navigation structure
- Sidebar organization
- Search functionality
- Theme customization
- Social links

## Related Resources

- [Main Repository](https://github.com/abchbx/drama)
- [Project README](../README.md)
- [API Documentation](docs/api/index.md)
- [Architecture Docs](docs/architecture/overview.md)
