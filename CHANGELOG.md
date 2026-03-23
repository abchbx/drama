# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-22

### Added
- Frontend web interface with React 18 + TypeScript + Vite
- Real-time visualization of agent communication using React Flow
- Script export in JSON, Markdown, and PDF formats
- Comprehensive documentation site built with VitePress
- Dashboard with session status and actor health monitoring
- Session parameter configuration UI
- LLM provider configuration UI (OpenAI, Anthropic, Mock)
- Session template management system
- Catppuccin Mocha dark theme implementation
- Sidebar navigation with tab system
- Toast notification system for user feedback
- Connection status indicator with Socket.IO reconnection support
- Global Error Boundary component for error handling
- User-friendly error messages with technical details
- Export retry functionality

### Fixed
- Socket.IO reconnection issues in frontend
- Export file download errors
- Frontend state persistence issues using sessionStorage
- Navigation state management across tabs

### Changed
- Updated error handling with standardized API responses
- Enhanced UI feedback for all user actions
- Improved export error handling with expandable technical details
- Added user-friendly Chinese language support in UI

### Technical
- Added React Error Boundary component for crash recovery
- Implemented API client with standardized error handling
- Added message virtual scrolling support (threshold: 100 messages)
- Configured Socket.IO event throttling (max 3 updates/second)
- Enhanced testing documentation with UAT checklist
- Configuration documentation complete
- Deployment documentation complete

### Documentation
- Added `docs/CONFIGURATION.md` - Complete configuration guide
- Added `docs/V1.2-UAT-CHECKLIST.md` - User acceptance testing checklist
- Added `docs/DEPLOYMENT.md` - Deployment guide
- Added `config/defaults.json` - Default configuration file
- Updated `README.md` with v1.2 features and frontend access

## [1.1.0] - Previous Release

### Added
- Shared blackboard architecture with layered memory management
- Director and Actor agent orchestration
- Socket.IO-based real-time messaging
- LLM provider abstraction (OpenAI, Anthropic)
- Memory folding for long-context control
- Chaos testing for resilience
- 104 unit and integration tests

### Technical
- Four-layer memory system: core, scenario, semantic, procedural
- Token-aware memory budgets
- Capability-based access control
- Heartbeat and timeout handling
- Audit logging and snapshot persistence

---

## [Unreleased]

### Planned (v1.3)
- Performance optimization (message virtual scrolling, Actor rotation optimization)
- Automated browser testing with Playwright
- Docker containerization
- Key management service integration
- Additional export formats and visualization enhancements
- Theme switching support (light/dark mode)
