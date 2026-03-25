---
title: "Promoting review-beta to stable must update orchestration callers in the same change"
category: skill-design
date: 2026-03-23
module: plugins/compound-engineering/skills
component: SKILL.md
tags:
  - skill-design
  - beta-testing
  - rollout-safety
  - orchestration
  - review-workflow
severity: medium
description: "When ce:review-beta is promoted to stable, update lfg/slfg in the same PR so they pass the correct mode instead of inheriting the interactive default."
related:
  - docs/solutions/skill-design/beta-skills-framework.md
  - docs/plans/2026-03-23-001-feat-ce-review-beta-pipeline-mode-beta-plan.md
---

## Problem

`ce:review-beta` introduces an explicit mode contract:

- default `interactive`
- `mode:autonomous`
- `mode:report-only`

That is correct for direct user invocation, but it creates a promotion hazard. If the beta skill is later promoted over stable `ce:review` without updating its orchestration callers, the surrounding workflows will silently inherit the interactive default.

For the current review workflow family, that would be wrong:

- `lfg` should run review in `mode:autonomous`
- `slfg` should run review in `mode:report-only` during its parallel review/browser phase

Without those caller changes, promotion would keep the skill name stable while changing its contract, which is exactly the kind of boundary drift that tends to escape manual review.

## Solution

Treat promotion as an orchestration contract change, not a file rename.

When promoting `ce:review-beta` to stable:

1. Replace stable `ce:review` with the promoted content
2. Update every workflow that invokes `ce:review` in the same PR
3. Hardcode the intended mode at each callsite instead of relying on the default
4. Add or update contract tests so the orchestration assumptions are executable

For the review workflow family, the expected caller contract is:

- `lfg` -> `ce:review mode:autonomous`
- `slfg` parallel phase -> `ce:review mode:report-only`
- any mutating review step in `slfg` must happen later, sequentially, or in an isolated checkout/worktree

## Why This Lives Here

This is not a good `AGENTS.md` note:

- it is specific to one beta-to-stable promotion
- it is easy for a temporary repo-global reminder to become stale
- future planning and review work is more likely to search `docs/solutions/skill-design/` than to rediscover an old ad hoc note in `AGENTS.md`

The durable memory should live with the other skill-design rollout patterns.

## Prevention

- When a beta skill changes invocation semantics, its promotion plan must include caller updates as a first-class implementation unit
- Promotion PRs should be atomic: promote the skill and update orchestrators in the same branch
- Add contract coverage for the promoted callsites so future refactors cannot silently drop required mode flags
- Do not rely on “remembering later” for orchestration mode changes; encode them in docs, plans, and tests

## Lifecycle Note

This note is intentionally tied to the `ce:review-beta` -> `ce:review` promotion window.

Once that promotion is complete and the stable orchestrators/tests already encode the contract:

- update or archive this doc if it no longer adds distinct value
- do not leave it behind as a stale reminder for a promotion that already happened

If the final stable design differs from the current expectation, revise this doc during the promotion PR so the historical note matches what actually shipped.
