---
title: "fix: Add Kimi Read-tool workaround prompt to Read-enabled agents"
type: fix
date: 2026-06-16
---

# fix: Add Kimi Read-tool workaround prompt to Read-enabled agents

## Summary

Inject a single critical instruction into every compound-engineering agent whose `tools:` allowlist includes `Read`, so agents stop retrying reads that return Kimi's "Wasted call" message. Add a regression test that fails when a new Read-enabled agent is added without the workaround.

## Problem Frame

Kimi returns a specific message when a `Read` call is wasted because the file has not changed since the last read:

> Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead.

Without explicit guidance, agents may retry the same read, burning tokens and looping. The fix is a prompt-level workaround: tell every agent that has the `Read` tool to recognize the message, stop reading that file, and move on.

## Requirements

- R1. Every compound-engineering agent whose `tools:` frontmatter includes `Read` must contain the exact Kimi workaround prompt.
- R2. The prompt must appear early in the agent body, immediately after the H1 title, so it is not diluted by longer persona or workflow sections.
- R3. The change must not break existing frontmatter validation (`tests/frontmatter.test.ts`, `tests/skill-agent-ce-prefix.test.ts`).
- R4. The change must not cause `bun run release:validate` to report drift.
- R5. A regression test must fail if a future agent is granted `Read` without including the workaround text.

## Key Technical Decisions

- **KTD-1. Scope is the `tools:` allowlist, not prose mentions of Read.** Only agents with `Read` in their frontmatter `tools:` list receive the prompt. Agents that discuss Read in their body but do not list it in `tools:` (e.g., `ce-session-historian`, which has no `tools:` line) are out of scope because they cannot invoke Read at runtime.
- **KTD-2. Insert the prompt immediately after the H1 heading.** Load-bearing instructions survive attention better near the top of the prompt. The standard insertion point is the blank line after the `# Title` heading and before the role paragraph or any leading note.
- **KTD-3. Enforce the convention with a test.** Following the existing `tests/skill-agent-ce-prefix.test.ts` pattern, add `tests/agent-read-workaround.test.ts` that scans all agent files, parses frontmatter, and asserts the workaround text is present whenever `tools` includes `Read`.

## Implementation Units

### U1. Inject Kimi Read workaround into all Read-enabled agents

- **Goal:** Add the exact workaround prompt to every compound-engineering agent whose `tools:` frontmatter includes `Read`.
- **Requirements:** R1, R2
- **Dependencies:** None
- **Files:**
  - `plugins/compound-engineering/agents/ce-adversarial-document-reviewer.md`
  - `plugins/compound-engineering/agents/ce-adversarial-reviewer.md`
  - `plugins/compound-engineering/agents/ce-agent-native-reviewer.md`
  - `plugins/compound-engineering/agents/ce-api-contract-reviewer.md`
  - `plugins/compound-engineering/agents/ce-architecture-strategist.md`
  - `plugins/compound-engineering/agents/ce-best-practices-researcher.md`
  - `plugins/compound-engineering/agents/ce-code-simplicity-reviewer.md`
  - `plugins/compound-engineering/agents/ce-coherence-reviewer.md`
  - `plugins/compound-engineering/agents/ce-correctness-reviewer.md`
  - `plugins/compound-engineering/agents/ce-data-integrity-guardian.md`
  - `plugins/compound-engineering/agents/ce-data-migration-reviewer.md`
  - `plugins/compound-engineering/agents/ce-deployment-verification-agent.md`
  - `plugins/compound-engineering/agents/ce-design-lens-reviewer.md`
  - `plugins/compound-engineering/agents/ce-feasibility-reviewer.md`
  - `plugins/compound-engineering/agents/ce-framework-docs-researcher.md`
  - `plugins/compound-engineering/agents/ce-git-history-analyzer.md`
  - `plugins/compound-engineering/agents/ce-issue-intelligence-analyst.md`
  - `plugins/compound-engineering/agents/ce-julik-frontend-races-reviewer.md`
  - `plugins/compound-engineering/agents/ce-learnings-researcher.md`
  - `plugins/compound-engineering/agents/ce-maintainability-reviewer.md`
  - `plugins/compound-engineering/agents/ce-pattern-recognition-specialist.md`
  - `plugins/compound-engineering/agents/ce-performance-oracle.md`
  - `plugins/compound-engineering/agents/ce-performance-reviewer.md`
  - `plugins/compound-engineering/agents/ce-previous-comments-reviewer.md`
  - `plugins/compound-engineering/agents/ce-product-lens-reviewer.md`
  - `plugins/compound-engineering/agents/ce-project-standards-reviewer.md`
  - `plugins/compound-engineering/agents/ce-reliability-reviewer.md`
  - `plugins/compound-engineering/agents/ce-repo-research-analyst.md`
  - `plugins/compound-engineering/agents/ce-scope-guardian-reviewer.md`
  - `plugins/compound-engineering/agents/ce-security-lens-reviewer.md`
  - `plugins/compound-engineering/agents/ce-security-reviewer.md`
  - `plugins/compound-engineering/agents/ce-security-sentinel.md`
  - `plugins/compound-engineering/agents/ce-spec-flow-analyzer.md`
  - `plugins/compound-engineering/agents/ce-swift-ios-reviewer.md`
  - `plugins/compound-engineering/agents/ce-testing-reviewer.md`
- **Approach:** Insert the following block verbatim after the `# Title` heading and before the existing role paragraph or leading note:

  ```markdown
  CRITICAL INSTRUCTION: If any Read tool result says "Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead.", STOP calling Read on that file and move on. Do not retry reads that return this message.
  ```

  Preserve the original blank line before the role paragraph. Do not change frontmatter, tool lists, or any other body content.
- **Patterns to follow:** Existing agents that begin with a role paragraph after the H1 heading; keep the insertion mechanical and identical across all files.
- **Test scenarios:**
  - Happy path: after the edit, each listed agent file contains the exact prompt text after its H1 heading.
  - Edge case: agents that already have a leading note (e.g., `**Note: The current year is 2026.**`) still receive the prompt between the H1 and the note.
  - Error path: a malformed edit that corrupts YAML frontmatter is caught by `tests/frontmatter.test.ts`.
- **Verification:** Run `grep -F 'Wasted call' plugins/compound-engineering/agents/ce-*.md` and confirm 35 matches, one per file.

### U2. Add regression test for Read-enabled agent prompt

- **Goal:** Ensure every future Read-enabled agent includes the workaround without manual inspection.
- **Requirements:** R5
- **Dependencies:** U1
- **Files:**
  - `tests/agent-read-workaround.test.ts` (create)
  - `tests/skill-agent-ce-prefix.test.ts` (reference pattern only)
- **Approach:** Mirror the file-scanning pattern in `tests/skill-agent-ce-prefix.test.ts`. For each `plugins/compound-engineering/agents/*.md` file:
  1. Parse frontmatter with `parseFrontmatter` from `src/utils/frontmatter`.
  2. If `data.tools` is a string and includes `Read` (after splitting on commas and trimming), assert the body contains the exact Kimi workaround text.
  3. Support an optional `AGENT_EXEMPTIONS` set for documented edge cases (initially empty).
- **Patterns to follow:** `tests/skill-agent-ce-prefix.test.ts` for directory scanning and frontmatter parsing.
- **Test scenarios:**
  - Happy path: all 35 current Read-enabled agents pass.
  - Edge case: an agent with no `tools:` line is skipped.
  - Edge case: an agent with `tools:` that does not include `Read` is skipped.
  - Failure path: a new agent with `Read` but without the workaround text fails the test.
- **Verification:** `bun test tests/agent-read-workaround.test.ts` passes.

### U3. Validate frontmatter and release metadata

- **Goal:** Confirm the mass edit did not corrupt frontmatter or drift release-owned counts.
- **Requirements:** R3, R4
- **Dependencies:** U1, U2
- **Files:** None modified; validation reads all plugin manifests and tests.
- **Approach:** Run the full test suite and release validator. Because agent count did not change and the edit is prose-only, release validation should pass; running it confirms the assumption.
- **Test scenarios:**
  - Happy path: `bun test` passes.
  - Happy path: `bun run release:validate` reports no drift.
  - Error path: any frontmatter corruption fails `tests/frontmatter.test.ts`.
- **Verification:** Both commands exit zero.

## Scope Boundaries

### In scope

- The 35 compound-engineering plugin agents whose `tools:` frontmatter includes `Read`.
- Adding the identical Kimi workaround prompt to each of those agents.
- Adding one regression test to enforce the convention.

### Out of scope

- Agents without `Read` in their `tools:` allowlist, including `ce-session-historian`, `ce-figma-design-sync`, `ce-design-implementation-reviewer`, `ce-pr-comment-resolver`, and `ce-ankane-readme-writer`.
- Skills, commands, and MCP server definitions.
- The coding-tutor plugin.
- Changes to the underlying Kimi behavior or to the Read tool itself.

### Deferred to follow-up work

- None identified.

## Risks & Dependencies

- **Risk:** Inserting the prompt after the H1 heading could shift attention away from the persona for very short prompts. Mitigation: the instruction is one sentence and directly precedes the role paragraph, so it reads as a tool-use guardrail rather than a distraction.
- **Risk:** A future agent rename or file-extension change could break the regression test. Mitigation: the test uses the same directory-scan pattern as existing `tests/skill-agent-ce-prefix.test.ts`, which already handles the current `.md` extension.
- **Dependency:** None external.

## Sources & Research

- `tests/frontmatter.test.ts` — validates agent YAML frontmatter and `ce-` prefix; does not inspect body prose.
- `tests/skill-agent-ce-prefix.test.ts` — pattern for scanning all agent files and asserting a convention.
- `docs/solutions/skill-design/ce-prefix-required-for-skills-and-agents.md` — rationale for enforcing conventions via tests rather than prose alone.
- `docs/solutions/skill-design/post-menu-routing-belongs-inline.md` — load-bearing rules should live in the main loaded file, not references.
- `plugins/compound-engineering/AGENTS.md` "Naming Convention" and "Adding Components" — agent file structure and pre-commit checklist.
