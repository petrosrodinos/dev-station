# Offering an AI Coding Harness to Users With Cost Control

Goal: give users a Claude Code / Cursor CLI style tool that works with normal AI models (Claude, ChatGPT, etc.), while I control model access and spend. No need to build the harness or rebrand it.

Research date: 2026-09-28. Based on web search results only; verify star counts, licences and features on the repos before committing.

## 1. Ready-made open-source harnesses (bring your own key)

| Tool | Licence | Notes |
|---|---|---|
| OpenCode | MIT | Provider-agnostic terminal agent, accepts local models. Default general-purpose pick. |
| Kilo Code | MIT | VS Code, JetBrains, CLI and cloud. 500+ models, own keys, zero markup. |
| Cline | Apache-2.0 | Started as a VS Code extension. Standalone CLI now supports parallel agents and an SDK. |
| Goose | Apache-2.0 | Broader than coding, extends through MCP. |
| OpenHands | MIT | Autonomous agent, more of a platform than a CLI. |
| Aider | Apache-2.0 | Git-native. One result says no commits since May 2026, so it may be stalled. |
| Codex CLI | Apache-2.0 | OpenAI's own agent CLI, open source. |

## 2. Recommended setup: gateway in front of any harness

Users run an off-the-shelf harness, and every request goes through a gateway I own (LiteLLM proxy).

```
User's harness (OpenCode / Kilo / Cline / Codex CLI)
        |  uses a virtual key I issued
        v
   LiteLLM proxy (mine)  <- budgets, rate limits, model allowlist, logs
        |  uses my real provider keys
        v
   Anthropic / OpenAI / Google / etc.
```

- Users never see the real provider keys. Each user gets a virtual key.
- Budgets: per-user or per-team spend caps with daily or monthly resets. Requests stop at the cap.
- Model control: choose which models each key can use (cheap by default, Opus only for some users).
- Visibility: spend and usage tracking per key, user and team.
- Harness is swappable later as long as it accepts a custom OpenAI-compatible base URL.

### Caveats
- LiteLLM budget tracking is eventually consistent. A burst of concurrent requests can overshoot a cap slightly, so set caps a bit below the acceptable loss.
- Not verified: how each harness handles a budget-exceeded error from the proxy. Test before rollout.
- Some harnesses use Anthropic's native API format rather than OpenAI-compatible. LiteLLM can translate, but check tool calling works end to end.
- The search results said nothing specific about LiteLLM with coding agents. Test that pairing.

### Suggested first step
LiteLLM plus OpenCode, one test user with a capped key, confirm the budget cutoff behaves as wanted.

## 3. Cloud / self-hosted infrastructure options

Use these if I also want to host the dev environments, not only the model access.

- **Coder Agents**: native AI coding agent that runs entirely on self-hosted infrastructure (cloud VPC, on-prem, air-gapped). Model-agnostic (Anthropic, OpenAI, Google, AWS Bedrock, self-hosted models). Platform admins centrally control which models are available. Heavier, aimed at company teams with governance needs.
- **Warp Oz platform**: Enterprise plan can be self-hosted. A managed worker daemon connects to the platform and runs tasks in Docker containers, Kubernetes Jobs, or directly on hosts. Repo clones, source files, build artifacts and secrets stay on my infrastructure. More of a product than a harness I can adapt.
- **Hosted gateway alternative** (not researched): services like OpenRouter offer per-key limits, as an alternative to running LiteLLM myself.

## Sources

- [Best Open Source CLI Coding Agents in 2026 | Pinggy](https://pinggy.io/blog/best_open_source_cli_coding_agents/)
- [Kilo - Open Source AI Coding Agent](https://kilo.ai/)
- [Open-Source AI Coding Agents 2026: The Complete Comparison](https://wetheflywheel.com/en/guides/open-source-ai-coding-agents-2026/)
- [LiteLLM Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users)
- [LiteLLM Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [LiteLLM Team Budgets](https://docs.litellm.ai/docs/proxy/team_budgets)
- [Coder: Self-Hosted, AI Model Agnostic Coder Agents](https://coder.com/blog/self-hosted-ai-model-agnostic-coder-agents)
- [Self-Hosted AI Coding Agents: Your Options in 2026](https://aq.dev/guides/self-hosted-ai-coding-agents/)
