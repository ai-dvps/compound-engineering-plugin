# Compounding Engineering Plugin Development

## Versioning Requirements

**IMPORTANT**: Every change to this plugin MUST include updates to all three files:

1. **`.claude-plugin/plugin.json`** - Bump version using semver
2. **`CHANGELOG.md`** - Document changes using Keep a Changelog format
3. **`README.md`** - Verify/update component counts and tables

### Version Bumping Rules

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, major reorganization
- **MINOR** (1.0.0 → 1.1.0): New agents, commands, or skills
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, doc updates, minor improvements

### Pre-Commit Checklist

Before committing ANY changes:

- [ ] Version bumped in `.claude-plugin/plugin.json`
- [ ] CHANGELOG.md updated with changes
- [ ] README.md component counts verified
- [ ] README.md tables accurate (agents, commands, skills)
- [ ] plugin.json description matches current counts

### Directory Structure

```
agents/
├── review/     # Code review agents
├── research/   # Research and analysis agents
├── design/     # Design and UI agents
├── workflow/   # Workflow automation agents
└── docs/       # Documentation agents

skills/
├── ce-*/          # Core workflow skills (ce:plan, ce:review, etc.)
├── workflows-*/   # Deprecated aliases for ce:* skills
└── */             # All other skills
```

> **Note:** Commands were migrated to skills in v2.39.0. All former
> `/command-name` slash commands now live under `skills/command-name/SKILL.md`
> and work identically (Claude Code 2.1.3+ merged the two formats).

## Command Naming Convention

**Workflow commands** use `ce:` prefix to unambiguously identify them as compound-engineering commands:
- `/ce:plan` - Create implementation plans
- `/ce:review` - Run comprehensive code reviews
- `/ce:work` - Execute work items systematically
- `/ce:compound` - Document solved problems
- `/ce:brainstorm` - Explore requirements and approaches before planning

**Why `ce:`?** Claude Code has built-in `/plan` and `/review` commands. The `ce:` namespace (short for compound-engineering) makes it immediately clear these commands belong to this plugin. The legacy `workflows:` prefix is still supported as deprecated aliases that forward to the `ce:*` equivalents.

## Skill Compliance Checklist

When adding or modifying skills, verify compliance with skill-creator spec:

### YAML Frontmatter (Required)

- [ ] `name:` present and matches directory name (lowercase-with-hyphens)
- [ ] `description:` present and describes **what it does and when to use it** (per official spec: "Explains code with diagrams. Use when exploring how code works.")

### Reference Links (Required if references/ exists)

- [ ] All files in `references/` are linked as `[filename.md](./references/filename.md)`
- [ ] All files in `assets/` are linked as `[filename](./assets/filename)`
- [ ] All files in `scripts/` are linked as `[filename](./scripts/filename)`
- [ ] No bare backtick references like `` `references/file.md` `` - use proper markdown links

### Writing Style

- [ ] Use imperative/infinitive form (verb-first instructions)
- [ ] Avoid second person ("you should") - use objective language ("To accomplish X, do Y")

### AskUserQuestion Usage

- [ ] If the skill uses `AskUserQuestion`, it must include an "Interaction Method" preamble explaining the numbered-list fallback for non-Claude environments
- [ ] Prefer avoiding `AskUserQuestion` entirely (see `brainstorming/SKILL.md` pattern) for skills intended to run cross-platform

### Quick Validation Command

```bash
# Check for unlinked references in a skill
grep -E '`(references|assets|scripts)/[^`]+`' skills/*/SKILL.md
# Should return nothing if all refs are properly linked

# Check description format - should describe what + when
grep -E '^description:' skills/*/SKILL.md
```

## Documentation

See `docs/solutions/plugin-versioning-requirements.md` for detailed versioning workflow.
