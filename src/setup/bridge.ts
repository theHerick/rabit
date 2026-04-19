/**
 * Model bridge.
 * Validates that configured models are available. Now works with provider bindings.
 */

import chalk from 'chalk';
import { listModels } from '../tools/ollama';
import { loadConfig, ROLES } from '../config/agents';
import { RoleBinding } from '../providers';

export async function bridgeModels(): Promise<boolean> {
  process.stdout.write(chalk.cyan('[ Pre-Flight ] ') + 'Verificando modelos configurados...\n');

  const cfg = loadConfig();
  let ok = true;

  try {
    for (const role of ROLES) {
      const binding = cfg.models[role.key];
      process.stdout.write(chalk.gray(`  ${role.label} (${binding.provider}/${binding.model}) `));

      if (binding.provider === 'ollama') {
        try {
          const installed = await listModels();
          if (installed.includes(binding.model)) {
            console.log(chalk.green('ok'));
          } else {
            console.log(chalk.yellow('nao esta em ollama list (mas pode estar baixando)'));
          }
        } catch (err) {
          console.log(chalk.red('ollama indisponivel'));
          ok = false;
        }
      } else if (binding.provider === 'anthropic') {
        if (process.env.ANTHROPIC_API_KEY) {
          console.log(chalk.green('ok (API key detectada)'));
        } else {
          console.log(chalk.yellow('aviso: ANTHROPIC_API_KEY nao esta no ambiente'));
        }
      } else {
        console.log(chalk.red('provider desconhecido'));
        ok = false;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red('[ Falha ] ') + msg);
    return false;
  }

  if (ok) {
    console.log(chalk.green('[ OK ] ') + 'todos os modelos verificados.');
  }
  return ok;
}
