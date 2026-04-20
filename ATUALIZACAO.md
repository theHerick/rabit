<div align="center">
  
```
     ██████╗  █████╗ ██████╗ ██╗████████╗
     ██╔══██╗██╔══██║██╔══██║██║╚══██╔══╝
  ██████╔╝███████║██████╔╝██║   ██║
  ██╔══██╗██╔══██║██╔══██║██║   ██║
  ██║  ██║██║  ██║██████╔╝██║   ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝
```

**Persistent Memory · Unified Context · MCP Integration**

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Stability](https://img.shields.io/badge/stability-stable-green)

</div>

---

## O que há de novo?

Esta atualização traz o **Ra-Bit Memory System**, unificando o contexto entre modelos locais (Ollama) e a nuvem (Claude Code).

### 🧠 Memória Persistente (Inspirada no `claude-mem`)

O Rabit agora possui um cérebro de longo prazo. Ele não esquece o que você decidiu em sessões passadas.

- **Captura de Observações**: Cada decisão de arquitetura, erro de teste ou implementação bem-sucedida é gravada automaticamente.
- **Sumarização Semântica**: Um novo **Memory Agent** entra em ação ao final de cada projeto para comprimir logs brutos em resumos inteligentes, economizando tokens e mantendo o essencial.
- **Busca Vetorial**: Usamos o Ollama para gerar embeddings e realizar buscas semânticas em tempo real, injetando o passado no seu prompt atual.

---

### 🌐 Integração Unificada (MCP Server)

Agora o Rabit fala a língua oficial da Anthropic. Implementamos um servidor **Model Context Protocol (MCP)** nativo.

- **Link com Claude Code CLI**: Você pode conectar o seu `claude` (CLI oficial) diretamente à base de dados do Rabit.
- **Ferramentas Compartilhadas**: O Claude oficial ganha acesso às ferramentas `mem_search` e `mem_record`, permitindo que ele "leia e escreva" na memória do Rabit.
- **Unificação Total**: Configure uma vez e tenha a mesma memória tanto no Rabit (Ollama/Claude) quanto no seu terminal padrão.

---

### 🛠️ Melhorias na Interface

- **Menu de Linkagem**: Adicionamos a opção `[ Link Unified Memory (MCP) ]` no menu principal.
- **Menu Brain**: Visualização aprimorada da árvore de conhecimento e resumos semânticos.

---

## Como Atualizar

1. Puxe as últimas mudanças:
```bash
git pull origin main
```

2. Instale as novas dependências:
```bash
npm install
```

3. Recompile o projeto:
```bash
npm run build
```

---

<div align="center">

Desenvolvido por [Herick B. Tiburski](https://github.com/theHerick)

</div>
