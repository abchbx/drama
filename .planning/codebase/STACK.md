# Tech Stack

## Overview

DramaFlow is a multi-agent drama script generation system built on a shared blackboard architecture. The project follows a monorepo structure with separate backend and frontend packages.

## Backend

### Runtime & Language
- **Node.js**: v18+ (ES2022)
- **TypeScript**: v5.5+ with strict mode enabled
- **Module System**: ES Modules (`"type": "module"`)

### Core Frameworks
- **Express.js**: v4.19 - HTTP server and REST API framework
- **Socket.IO**: v4.8.3 - WebSocket real-time communication

### Key Dependencies

#### LLM Integration
- **openai**: v6.32.0 - OpenAI GPT API client
- **@anthropic-ai/sdk**: v0.80.0 - Anthropic Claude API client
- **tiktoken**: v1.0.0 - Token counting for OpenAI models

#### Data Validation & Types
- **zod**: v3.23.0 - Runtime schema validation and type inference
- **typescript**: v5.5.0 - Static type checking

#### Authentication & Security
- **jsonwebtoken**: v9.0.3 - JWT token generation and verification
- **cors**: v2.8.6 - Cross-origin resource sharing

#### Logging & Monitoring
- **pino**: v9.0.0 - High-performance JSON logger
- **pino-pretty**: v13.1.3 - Human-readable log formatting (dev)

#### Utilities
- **uuid**: v10.0.0 - UUID generation for session/actor IDs
- **dotenv**: v16.4.0 - Environment variable loading

### Development Tools
- **tsx**: v4.16.0 - TypeScript execution and watch mode
- **vitest**: v2.0.0 - Test runner with globals support
- **supertest**: v7.0.0 - HTTP assertion library for testing

### TypeScript Configuration
```json
{
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "strict": true,
  "noUncheckedIndexedAccess": true
}
```

## Frontend

### Runtime & Language
- **TypeScript**: ~5.6.2
- **Module System**: ES Modules

### Core Frameworks
- **React**: v18.3.1 - UI component library
- **Vite**: v6.0.7 - Build tool and dev server

### Key Dependencies

#### State Management
- **zustand**: v5.0.3 - Lightweight state management
- **react-hook-form**: v7.71.2 - Form state management
- **@hookform/resolvers**: v5.2.2 - Zod integration for forms

#### Visualization
- **reactflow**: v11.11.4 - Node-based graph visualization for agent communication

#### Real-time Communication
- **socket.io-client**: v4.8.3 - WebSocket client

#### Data Validation
- **zod**: v3.24.1 - Schema validation (same as backend)

#### Export
- **html2pdf.js**: v0.10.1 - PDF generation from HTML

### Vite Configuration
- Dev server port: 5174
- API proxy to localhost:3000
- HMR enabled with clientPort: 443 for CloudStudio

## Project Structure

```
/workspace/
├── src/                    # Backend source code
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── routes/            # Express route handlers
│   ├── app.ts             # Express app setup
│   ├── index.ts           # Server entry point
│   ├── session.ts         # Core session management
│   └── config.ts          # Environment configuration
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── lib/          # API clients and utilities
│   │   ├── store/        # Zustand stores
│   │   └── types/        # Frontend types
│   └── vite.config.ts    # Vite configuration
├── tests/                 # Test files
├── config/                # Configuration files
└── data/                  # Data persistence directory
```

## Build & Deployment

### Scripts
```bash
# Backend
npm run dev       # tsx watch src/index.ts
npm run build     # tsc compilation
npm run start     # node dist/index.js
npm test          # vitest run

# Frontend
cd frontend
npm run dev       # vite dev server
npm run build     # tsc && vite build
npm run preview   # vite preview
```

### Output
- Backend compiles to `dist/` directory
- Frontend builds to `frontend/dist/` directory
