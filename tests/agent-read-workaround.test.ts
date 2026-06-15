import { readdirSync, readFileSync } from "fs"
import path from "path"
import { describe, expect, test } from "bun:test"
import { parseFrontmatter } from "../src/utils/frontmatter"

const PLUGIN_ROOT = path.join(process.cwd(), "plugins/compound-engineering")
const AGENTS_DIR = path.join(PLUGIN_ROOT, "agents")
const REF = `plugins/compound-engineering/agents/*.md`
const WORKAROUND_TEXT =
  'CRITICAL INSTRUCTION: If any Read tool result says "Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead.", STOP calling Read on that file and move on. Do not retry reads that return this message.'

// Exemptions from the Read-workaround rule. Add entries here only with a
// written reason — the exemption list shouldn't become a silent junk drawer.
const AGENT_EXEMPTIONS = new Set<string>([])

function agentHasReadTool(filePath: string): boolean {
  const { data } = parseFrontmatter(readFileSync(filePath, "utf8"), filePath)
  const tools = typeof data.tools === "string" ? data.tools : ""
  const toolList = tools.split(",").map((s) => s.trim())
  return toolList.includes("Read")
}

describe("compound-engineering agent Kimi Read workaround", () => {
  const agentFiles = readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !AGENT_EXEMPTIONS.has(entry.name),
    )
    .map((entry) => entry.name)

  for (const fileName of agentFiles) {
    const filePath = path.join(AGENTS_DIR, fileName)
    const hasRead = agentHasReadTool(filePath)

    test(`agent "${fileName}" ${hasRead ? "includes" : "skips"} the Read workaround`, () => {
      const { body } = parseFrontmatter(readFileSync(filePath, "utf8"), filePath)
      if (hasRead) {
        expect(
          body.includes(WORKAROUND_TEXT),
          `Agent "${fileName}" lists Read in tools: but does not include the Kimi Read workaround. ` +
            `Add the workaround text near the top of the agent body, or add "${fileName}" to ` +
            `AGENT_EXEMPTIONS in tests/agent-read-workaround.test.ts with a written reason.`,
        ).toBe(true)
      } else {
        // Agents without Read cannot receive the wasted-call message, so the
        // workaround is not required. This branch documents the negative case
        // and keeps the test deterministic if the prompt is ever added broadly.
        expect(body).toBeDefined()
      }
    })
  }
})
