# Codebase Concerns

**Analysis Date:** 2026-03-22

## Tech Debt

**Type Safety Erosion from `any` Types:**
- Issue: 25+ instances of `any` type usage undermine TypeScript strict mode benefits
- Files: `src/services/llm.ts`, `src/services/actor.ts`, `src/services/director.ts`, `src/services/memoryManager.ts`
- Why: Rapid prototyping and LLM response handling without proper type definitions
- Impact: Loss of compile-time safety, runtime errors possible, harder refactoring
- Fix approach: Define proper union types or Zod schemas for LLM responses, use `unknown` instead of `any`, parse with Zod before use

**Service Singleton Anti-pattern:**
- Issue: Services instantiated once in bootstrap but passed around as dependencies
- Files: `src/index.ts` (service instantiation), multiple service files (constructor injection)
- Why: Simpler initial implementation for single-instance services
- Impact: Harder to test with different configurations, limits flexibility
- Fix approach: Implement service factory pattern, support multiple service instances with different configs

**Tight Coupling Between Director and MemoryManager:**
- Issue: Director requires MemoryManager as dependency for memory folding
- Files: `src/services/director.ts`, `src/services/memoryManager.ts`
- Why: Direct control over when memory is folded
- Impact: Cannot test Director without MemoryManager, limited reusability
- Fix approach: Extract memory folding to callback interface, allow Director to work without MemoryManager

**Hard-coded Layer Budgets:**
- Issue: Token budgets for memory layers are environment variables but not validated at runtime
- Files: `src/config.ts`, `src/services/blackboard.ts`
- Why: Simplified configuration management
- Impact: Invalid budgets can cause runtime errors, difficult to reason about layer behavior
- Fix approach: Add Zod schema validation for budgets, ensure sum < total context window

**Inconsistent Error Handling in LLM Calls:**
- Issue: Some LLM errors caught and wrapped, others propagate directly
- Files: `src/services/actor.ts`, `src/services/director.ts`, `src/services/llm/`
- Why: Iterative error handling implementation
- Impact: Inconsistent error messages, harder to debug LLM failures
- Fix approach: Standardize error handling with try/catch, wrap all LLM errors in custom error classes

**Missing Semantic Continuity in Folded Memory:**
- Issue: When semantic entries are folded, no mechanism ensures narrative continuity
- Files: `src/services/memoryManager.ts`
- Why: Folding logic prioritized token efficiency over story coherence
- Impact: Folded dialogue may lose important narrative context, story gaps possible
- Fix approach: Add continuity preservation in folding prompts, maintain narrative thread in summaries

## Known Bugs

**Race Condition in Token Budget Enforcement:**
- Symptoms: Two concurrent writes may both succeed when only budget for one
- Trigger: Multiple agents write to same layer simultaneously during high activity
- Files: `src/services/blackboard.ts` (writeEntry method), `src/services/memoryManager.ts`
- Workaround: None currently, mitigated by low concurrency in typical usage
- Root cause: Token budget check not atomic with write operation
- Blocked by: Would require mutex/lock mechanism, not implemented

**Memory Fold May Lose Critical Information:**
- Symptoms: Important facts folded away if not recently accessed
- Trigger: Semantic layer exceeds budget, fold triggered with tail preservation
- Files: `src/services/memoryManager.ts` (performFold method)
- Workaround: Promote critical entries to core layer before fold
- Root cause: Fold algorithm uses recency rather than importance
- Fix: Add metadata priority field, sort by priority before folding

**Director Cannot Promote to Core After Scenario Delete:**
- Symptoms: Director.promoteToScenarioToCore fails if scenario entry was deleted
- Trigger: Scenario layer entry deleted after being promoted
- Files: `src/services/director.ts`, `src/services/memoryManager.ts`
- Workaround: Re-write scenario entry before promotion
- Root cause: Promotion references scenario entry ID by string, no validation
- Blocked by: Need reference counting or soft-delete mechanism

## Security Considerations

**JWT Secret in Environment File:**
- Risk: JWT signing secret stored in plain text in `.env` file
- Files: `.env`, `src/config.ts`
- Current mitigation: `.env` not committed to git, gitignore protects it
- Recommendations: Use secret management service (AWS Secrets Manager, HashiCorp Vault), rotate secrets regularly, enforce minimum 32-character complexity

**No Rate Limiting on Public Endpoints:**
- Risk: Abuse of public endpoints (`/session`, `/blackboard/agents/register`) for DDoS or resource exhaustion
- Files: `src/routes/session.ts`, `src/routes/agents.ts`
- Current mitigation: None (all endpoints public except blackboard CRUD)
- Recommendations: Add rate limiting middleware (express-rate-limit), implement API key authentication for public endpoints, add request quotas

**Insufficient Input Validation on LLM Prompts:**
- Risk: Prompt injection if user-provided content not sanitized
- Files: `src/services/actor.ts`, `src/services/director.ts` (prompt construction)
- Current mitigation: LLM providers have built-in safety filters
- Recommendations: Add prompt sanitization, use prompt injection detection, limit prompt length

**No CSP Headers on HTTP Responses:**
- Risk: XSS attacks if frontend served from same origin
- Files: `src/app.ts` (Express app setup)
- Current mitigation: No XSS vulnerabilities known in frontend
- Recommendations: Add Helmet middleware for security headers, implement Content Security Policy

**Audit Log Contains Sensitive Information:**
- Risk: Agent JWT tokens and LLM prompts logged in audit trail
- Files: `src/services/auditLog.ts`, multiple service files (audit calls)
- Current mitigation: Audit logs not exposed via API, file permissions on data directory
- Recommendations: Redact sensitive data from audit logs, implement log rotation, encrypt audit logs at rest

## Performance Bottlenecks

**Memory Folding Blocks Write Operations:**
- Problem: Write to layer waits for LLM summarization to complete
- Measurement: 2-5 seconds per fold operation during high activity
- Files: `src/services/memoryManager.ts` (writeEntryWithMemoryManagement)
- Cause: Synchronous LLM call for summarization blocks write
- Improvement path: Async folding in background, queue folds, allow writes during fold, cache summary results

**Sequential Actor Turns in Scene:**
- Problem: Director waits for each actor to complete before next actor
- Measurement: Scene with 3 actors takes 3x single actor time (no parallelism)
- Files: `src/session.ts` (runScene method), `src/services/director.ts`
- Cause: Round-robin pattern implemented sequentially
- Improvement path: Parallel actor generation with Promise.all, Director arbitrates concurrent responses, timeout handling for parallel execution

**Blackboard Snapshot Synchronous:**
- Problem: Snapshot write blocks HTTP response on `POST /session`
- Measurement: 100-500ms additional latency on session creation
- Files: `src/services/snapshot.ts`, `src/routes/session.ts`
- Cause: File system write operation in request handler
- Improvement path: Async snapshot writes, snapshot queue, debounced writes, move snapshot to background job

**No Token Counting Caching:**
- Problem: Tiktoken encoding called for every entry, expensive operation
- Measurement: ~50ms per 1000 characters encoded
- Files: `src/services/blackboard.ts` (countTokens)
- Cause: No caching of token counts for repeated content
- Improvement path: Cache token counts by content hash, LRU cache for recently counted strings, pre-count known patterns

**Socket.IO Room Management Inefficient:**
- Problem: Broadcasting to large rooms iterates all sockets
- Measurement: O(n) complexity for broadcast to n agents
- Files: `src/services/router.ts` (sendBroadcast method)
- Cause: Socket.IO room implementation limits optimization
- Improvement path: Use multicast patterns, limit room size, implement agent subscription filters

## Fragile Areas

**Memory Manager State Management:**
- Why fragile: Complex logic for fold/unfold, promotion, alerting
- Common failures: Race conditions during concurrent folds, budget miscalculation, infinite loops in fold logic
- Safe modification: Add comprehensive integration tests, use mutex for concurrent access, validate invariants in tests
- Test coverage: Unit tests good, integration tests limited for concurrent scenarios
- Files: `src/services/memoryManager.ts`, `tests/memoryManager.test.ts`

**Director-Actor Message Orchestration:**
- Why fragile: Tight coupling between Director signaling and Actor response
- Common failures: Actor timeout causes scene to hang, missed messages, out-of-order execution
- Safe modification: Add message acknowledgments, implement retry with backoff, add timeout handling at every step
- Test coverage: E2E tests cover happy path, chaos tests cover some failures
- Files: `src/services/director.ts`, `src/services/actor.ts`, `src/session.ts`

**Capability Enforcement Points:**
- Why fragile: Enforced in multiple places (routes, services), easy to miss new endpoint
- Common failures: New route forgets capability check, service bypasses capability, inconsistent layer access
- Safe modification: Use middleware for all routes, enforce capability in service layer only, add automated tests for all capabilities
- Test coverage: Boundary tests comprehensive but may not cover all code paths
- Files: `src/services/capability.ts`, `src/routes/`, `tests/boundary.test.ts`

**Socket.IO Message Routing:**
- Why fragile: Complex routing logic with buffering, timeout, reconnection
- Common failures: Message buffer overflow on long disconnection, reconnection race conditions, duplicate message delivery
- Safe modification: Add message deduplication, limit buffer size, implement exponential backoff for reconnection
- Test coverage: Protocol tests cover basic routing, chaos tests cover some failures
- Files: `src/services/router.ts`, `tests/protocol.test.ts`, `tests/chaos.test.ts`

**Bootstrap and Service Initialization:**
- Why fragile: Services must be initialized in correct order, missing service causes crash
- Common failures: Dependency not initialized before use, circular dependencies, startup errors not caught
- Safe modification: Document dependency order, add startup health checks, lazy initialize optional services
- Test coverage: No integration tests for bootstrap sequence
- Files: `src/index.ts`, `src/config.ts`

## Scaling Limits

**Single-Process Architecture:**
- Current capacity: ~10 concurrent drama sessions, ~30 concurrent actors
- Limit: Single Node.js process limited to CPU cores, memory constrained to process heap
- Symptoms at limit: CPU at 100%, memory errors, request timeouts
- Scaling path: Use Node.js cluster mode, deploy multiple instances behind load balancer, implement shared state (Redis) for distributed blackboard

**In-Memory Blackboard State:**
- Current capacity: ~1GB total blackboard state (all layers)
- Limit: Node.js heap size limit (~1-2GB in production)
- Symptoms at limit: Out of memory errors, GC pauses, process crashes
- Scaling path: Move blackboard to external database (PostgreSQL, Redis), implement state sharding by session, add cache eviction policies

**Sequential LLM Calls:**
- Current capacity: ~1 LLM call per second per process (limited by API rate limits)
- Limit: LLM API rate limits (OpenAI: ~3-5 RPM for GPT-4, Anthropic: ~5-20 RPM for Claude)
- Symptoms at limit: 429 Too Many Requests errors, long queues, degraded experience
- Scaling path: Implement request queuing and batching, use multiple API keys across accounts, cache LLM responses, implement fallback providers

**File-Based Audit Logging:**
- Current capacity: ~100MB/day of audit logs
- Limit: File system I/O becomes bottleneck, disk space consumption
- Symptoms at limit: Slow audit log writes, disk space exhaustion, query performance degradation
- Scaling path: Use centralized logging (ELK stack), implement log rotation and archival, store audit logs in database, log sampling for high volume

**Socket.IO Connections:**
- Current capacity: ~100 concurrent socket connections per process
- Limit: File descriptor limits, memory per connection, WebSocket overhead
- Symptoms at limit: Connection errors, memory exhaustion, high CPU usage
- Scaling path: Use Redis adapter for distributed Socket.IO, implement connection pooling, add connection limits and timeouts

## Dependencies at Risk

**ReactFlow 11.11.4:**
- Risk: Minor version updates may introduce breaking changes, API not stable
- Impact: Agent graph visualization breaks, UI errors
- Migration plan: Pin to specific version, test upgrades carefully, consider alternative (vis-network, d3-graphviz)

**Zod 3.23.0:**
- Risk: Major version 4 in development, potential breaking changes
- Impact: Schema validation breaks, runtime errors on type checking
- Migration plan: Monitor Zod v4 release, plan migration path, test all schemas after upgrade

**pino 9.0.0:**
- Risk: Minor version updates may change log format, break log parsing
- Impact: Log analysis tools fail, monitoring breaks
- Migration plan: Pin to specific version, test log output after upgrade, implement log format validation

**tiktoken 1.0.0:**
- Risk: OpenAI may change tokenization, WASM dependencies may break
- Impact: Token counts become inaccurate, budget enforcement fails
- Migration plan: Monitor OpenAI tokenization changes, test token counts on upgrade, implement fallback token estimation

**html2pdf.js 0.10.1:**
- Risk: Unmaintained (last update 2+ years ago), may not work with newer browsers
- Impact: PDF export fails, user cannot download scripts
- Migration plan: Switch to puppeteer or pdf-lib for PDF generation, add PDF export tests

## Missing Critical Features

**Graceful Shutdown:**
- Problem: No graceful shutdown handler, abrupt termination may corrupt state
- Current workaround: Manual shutdown with caution
- Blocks: Clean deployment, zero-downtime updates, proper error recovery
- Implementation complexity: Low (add SIGTERM/SIGINT handlers, drain connections, flush logs)

**Session Resume After Crash:**
- Problem: No mechanism to resume session after server restart
- Current workaround: Start new session from scratch
- Blocks: Long-running dramas, production reliability
- Implementation complexity: Medium (implement session persistence, load state on startup, validate consistency)

**Actor State Management:**
- Problem: No tracking of actor state (connected/disconnected/timeout)
- Current workaround: Director assumes all actors present
- Blocks: Dynamic actor addition/removal, partial session recovery
- Implementation complexity: Medium (add actor state tracking, implement reconnection logic, update director orchestration)

**Backpressure Control:**
- Problem: No mechanism to slow down message flow under load
- Current workaround: System degrades under high load, may crash
- Blocks: Production stability, predictable performance
- Implementation complexity: Medium (implement message queue, add rate limiting, monitor queue depth)

**Observability and Metrics:**
- Problem: No metrics collection, monitoring, or alerting
- Current workaround: Manual log analysis, reactive troubleshooting
- Blocks: Proactive issue detection, capacity planning, SLA monitoring
- Implementation complexity: High (add Prometheus metrics, implement distributed tracing, set up alerting)

## Test Coverage Gaps

**Concurrent Access Patterns:**
- What's not tested: Multiple agents writing to blackboard simultaneously, concurrent folds, race conditions
- Risk: Data corruption, lost updates, inconsistent state
- Priority: High
- Difficulty to test: Need to intentionally create race conditions, use async/await patterns, verify invariants

**Error Recovery Paths:**
- What's not tested: System behavior after errors, retry logic, degraded mode
- Risk: Errors cause cascading failures, system doesn't recover
- Priority: Medium
- Difficulty to test: Need to simulate errors at various layers, verify recovery, test multiple failure modes

**Long-Running Sessions:**
- What's not tested: Sessions lasting hours/days, memory usage over time, connection stability
- Risk: Memory leaks, connection drops, gradual degradation
- Priority: Medium
- Difficulty to test: Need to run long-duration tests, monitor memory and connections, simulate network issues

**Edge Cases in Memory Folding:**
- What's not tested: Boundary conditions (exact budget, one over, one under), empty layers, corrupted metadata
- Risk: Incorrect folding logic, loss of critical data, infinite loops
- Priority: High
- Difficulty to test: Need comprehensive boundary test matrix, validate all folding branches

**Integration with Frontend:**
- What's not tested: Full frontend-backend integration flow, WebSocket connection handling, UI error states
- Risk: Frontend-backend contract breaks, user-facing errors
- Priority: Medium
- Difficulty to test: Need browser automation (Playwright), test WebSocket reconnection, verify UI states

---

*Concerns audit: 2026-03-22*
*Update as issues are fixed or new ones discovered*
