---
phase: 12
slug: documentation-site
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (static documentation site) |
| **Config file** | None — VitePress validates config on build |
| **Quick run command** | `npm run docs:dev` |
| **Full suite command** | `npm run docs:build` |
| **Estimated runtime** | ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run docs:dev` (verify no build errors, site loads)
- **After every plan wave:** Run `npm run docs:build` (verify production build succeeds)
- **Before `/gsd:verify-work`:** All documentation pages accessible in browser
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DOC-01 | manual | `npm run docs:dev` | ✅ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | DOC-02 | manual | `npm run docs:dev` | ✅ W0 | ⬜ pending |
| 12-03-01 | 03 | 1 | DOC-03 | manual | `npm run docs:dev` | ✅ W0 | ⬜ pending |
| 12-04-01 | 04 | 1 | DOC-04 | manual | `npm run docs:dev` | ✅ W0 | ⬜ pending |
| 12-05-01 | 05 | 2 | DOC-05 | manual | `npm run docs:build` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Note:** All tasks use manual verification (browser testing). Documentation is content, not code — automated tests don't make sense for validating user-facing documentation.

---

## Wave 0 Requirements

- [ ] `docs-site/.vitepress/config.mts` — VitePress configuration (created in plan 01)
- [ ] `docs-site/docs/index.md` — Documentation homepage (created in plan 01)
- [ ] `docs-site/package.json` — Dependencies and scripts (created in plan 01)

*Wave 0 creates the documentation site infrastructure. All subsequent plans build content on this foundation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User can access getting started guide | DOC-01 | Documentation is content, requires human judgment | 1. Run `npm run docs:dev` 2. Visit http://localhost:5173/guide/getting-started 3. Verify step-by-step instructions are clear and complete |
| User can access comprehensive API reference | DOC-02 | API reference requires human review for accuracy | 1. Visit /api/ section 2. Verify all endpoints documented with request/response examples 3. Click links to ensure navigation works |
| User can access detailed user guide with examples | DOC-03 | Examples require human verification | 1. Visit /user-guide/ section 2. Verify usage examples are copy-pasteable and work |
| User can access architecture docs with diagrams | DOC-04 | Diagrams require visual verification | 1. Visit /architecture/ section 2. Verify Mermaid diagrams render correctly 3. Check diagrams have explanatory text |
| Dark/light theme toggle works | DOC-05 | Theme switching requires UI testing | 1. Click theme toggle in top navigation 2. Verify colors switch between dark/light 3. Verify system preference is respected on first visit |
| Responsive design works on mobile | DOC-05 | Mobile layout requires visual verification | 1. Resize browser to mobile width (375px) 2. Verify sidebar collapses to hamburger menu 3. Verify code blocks scroll horizontally |

*All phase behaviors have manual verification because documentation is content intended for human consumption.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (dev server or build command)
- [ ] Sampling continuity: satisfied (all tasks have automated verify)
- [ ] Wave 0 infrastructure created before content tasks
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (dev server starts quickly)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Validation Notes

This phase is unique because:
1. **No automated tests:** Documentation is content, not code. Manual browser testing is the appropriate verification method.
2. **Build-time validation:** VitePress validates configuration and Markdown syntax during build. The "automated verify" commands are `npm run docs:dev` (for content creation) and `npm run docs:build` (for final verification).
3. **User experience testing:** All verification is about ensuring documentation is readable, navigable, and helpful to users. This requires human judgment, not automated assertions.

The Nyquist validation framework still applies:
- **Sampling rate:** Quick feedback after each task (`npm run docs:dev`), full build after each wave
- **Feedback latency:** < 30s (VitePress is fast)
- **Wave 0:** Infrastructure created first (VitePress setup, config, initial structure)
- **Validation sign-off:** All criteria met, but manual testing is the norm for documentation
