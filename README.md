# Spaces

Spaces is a Tauri-based desktop application that provides a GUI interface for AI-assisted software development. It wraps the [OpenCode](https://github.com/opencode-ai/opencode) CLI tool, enabling developers to create isolated coding environments ("Spaces") for AI-powered collaboration.

## Features

- **Repository Management**: Connect git repositories and create isolated "Spaces" for AI-assisted coding
- **AI Chat Interface**: Chat with AI agents about your code, with support for multiple agents and models
- **Git Diff Viewer**: View uncommitted changes in a visual diff interface
- **Task Management**: Track tasks locally and optionally import from Asana
- **Multi-Provider Support**: Connect to Groq for enhanced AI model capabilities (e.g., branch name generation)
- **Auto-Updates**: Built-in update checker with automatic download and installation

## Architecture

```
apps/desktop/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── routes/             # TanStack Router route components
│   ├── stores/             # Zustand state management
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions and Tauri API bindings
├── src-tauri/              # Rust backend (Tauri commands)
│   └── src/
│       ├── main.rs         # Application entry point
│       ├── config.rs       # Config file management
│       ├── git.rs          # Git operations (diffs, status)
│       ├── opencode.rs     # OpenCode server management
│       └── spaces.rs       # Space cloning and management
└── index.html              # Entry HTML
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TanStack Router, Zustand
- **UI Components**: react-aria-components, Tailwind CSS
- **Backend**: Tauri 2 (Rust), tokio, reqwest
- **State Management**: Zustand stores for chat, sessions, agents, models, and config
- **AI Integration**: @opencode-ai/sdk, @ai-sdk/groq

## Development

```bash
# Install dependencies
bun install

# Run development server
cd apps/desktop && bun run dev

# Build for production
cd apps/desktop && bun run build
```

## Configuration

Spaces stores configuration in `~/.space/config.json`:
- Groq API key for enhanced AI features
- Asana Personal Access Token for task import
- List of configured spaces with their tasks

## Requirements

- [OpenCode CLI](https://github.com/opencode-ai/opencode) must be installed and available in PATH
- macOS (uses macOS private APIs for window transparency)
- Git

## License

MIT
