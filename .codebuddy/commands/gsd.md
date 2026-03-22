---
name: gsd
description: Get Shit Done (GSD) - spec-driven development system. Usage: /gsd <command> [args]
argument-hint: "<command> [args] -- e.g. /gsd help, /gsd new-project, /gsd quick"
---

# Get Shit Done (GSD) v1.27.0

GSD is a meta-prompting, context engineering and spec-driven development system. All GSD workflow files, agents, templates, and references are installed in `.claude/` directory.

## Command Dispatch

When the user invokes `/gsd <command>`, you MUST:

1. **Read** the corresponding workflow file from `.claude/get-shit-done/workflows/<command>.md`
2. **Read** any agent files referenced in the workflow from `.claude/agents/gsd-*.md`
3. **Read** any templates/references from `.claude/get-shit-done/templates/` and `.claude/get-shit-done/references/`
4. **Execute** the workflow exactly as described, preserving all gates, validations, and processes

## Available Commands

### Core Workflow
| Command | Description |
|---------|-------------|
| `help` | Show all commands and usage guide |
| `new-project [--auto]` | Full init: questions -> research -> requirements -> roadmap |
| `discuss-phase [N] [--auto]` | Capture implementation decisions before planning |
| `plan-phase [N] [--auto]` | Research + plan + verify for a phase |
| `execute-phase <N>` | Execute all plans in parallel waves |
| `verify-work [N]` | Manual user acceptance testing |
| `ship [N] [--draft]` | Create PR from verified phase work |
| `next` | Auto-detect state and run next step |
| `fast <text>` | Inline trivial tasks, skips planning |
| `quick [--full] [--discuss] [--research]` | Ad-hoc task with GSD guarantees |
| `complete-milestone` | Archive milestone, tag release |
| `new-milestone [name]` | Start next version |
| `audit-milestone` | Verify milestone definition of done |

### Brownfield
| Command | Description |
|---------|-------------|
| `map-codebase [area]` | Analyze existing codebase |

### Phase Management
| Command | Description |
|---------|-------------|
| `add-phase` | Append phase to roadmap |
| `insert-phase [N]` | Insert urgent work between phases |
| `remove-phase [N]` | Remove future phase |
| `list-phase-assumptions [N]` | See intended approach before planning |
| `plan-milestone-gaps` | Create phases to close gaps from audit |

### UI Design
| Command | Description |
|---------|-------------|
| `ui-phase [N]` | Generate UI design contract |
| `ui-review [N]` | Visual audit of implemented frontend code |

### Session
| Command | Description |
|---------|-------------|
| `pause-work` | Create handoff when stopping mid-phase |
| `resume-work` | Restore from last session |
| `session-report` | Generate session summary |

### Code Quality
| Command | Description |
|---------|-------------|
| `review` | Cross-AI peer review |
| `pr-branch` | Create clean PR branch |
| `audit-uat` | Find phases missing UAT |

### Backlog & Threads
| Command | Description |
|---------|-------------|
| `plant-seed <idea>` | Capture forward-looking ideas |
| `add-backlog <desc>` | Add to backlog parking lot |
| `review-backlog` | Review and promote backlog items |
| `thread [name]` | Persistent context threads |

### Utilities
| Command | Description |
|---------|-------------|
| `settings` | Configure model profile and workflow |
| `set-profile <profile>` | Switch model profile (quality/balanced/budget) |
| `add-todo [desc]` | Capture idea for later |
| `check-todos` | List pending todos |
| `debug [desc]` | Systematic debugging with persistent state |
| `do <text>` | Route freeform text to right GSD command |
| `note <text>` | Idea capture - append, list, or promote |
| `health [--repair]` | Validate .planning/ directory integrity |
| `stats` | Display project statistics |
| `progress` | Where am I? What's next? |
| `update` | Update GSD with changelog preview |

## File Locations

- **Workflows**: `.claude/get-shit-done/workflows/<command>.md`
- **Agents**: `.claude/agents/gsd-<agent-name>.md`
- **Templates**: `.claude/get-shit-done/templates/<template>.md`
- **References**: `.claude/get-shit-done/references/<reference>.md`
- **Commands** (original Claude Code): `.claude/commands/gsd/<command>.md`
- **Planning data**: `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json)

## Execution Rules

1. Always read the workflow file FIRST before taking any action
2. Read ALL referenced agent/template/reference files mentioned in the workflow
3. Follow the workflow steps exactly - do not skip gates or validations
4. When spawning sub-tasks, read the corresponding agent prompt files
5. Use `read_file` to read workflow files, `search_file`/`search_content` for codebase analysis
6. Preserve atomic git commits per task as specified in the workflow
7. Update STATE.md after each significant action
