import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk';

const CLAWPOWERS_SYSTEM_CONTEXT = [
  'ClawPowers wrapper is active.',
  'Preserve stock OpenClaw behavior by default.',
  'When ClawPowers-provided skills are available, prefer them over duplicated wrapper logic.',
  'Keep behavior maintainable: library capabilities live in clawpowers, wrapper logic stays thin.'
].join(' ');

const clawPowersOpenClawPlugin = {
  id: 'clawpowers-agent',
  name: 'ClawPowers Agent',
  description: 'Thin ClawPowers wrapper plugin for stock OpenClaw runtimes.',
  configSchema: emptyPluginConfigSchema,
  register(api: OpenClawPluginApi) {
    api.on('before_prompt_build', (payload) => {
      const messages = (payload as { messages?: Array<{ content?: unknown }> }).messages ?? [];
      const hasMarker = messages.some((message) => {
        if (typeof message?.content !== 'string') return false;
        return message.content.includes('[ClawPowers-Agent]');
      });

      if (!hasMarker) return undefined;

      return {
        prependSystemContext: CLAWPOWERS_SYSTEM_CONTEXT,
      };
    });
  },
};

export default clawPowersOpenClawPlugin;

