Alright — here’s a **complete, build-ready plan** you can hand to an AI agent.
This is structured like a real product spec + architecture doc so it doesn’t drift into chaos.

---

# 🧠 PRODUCT VISION

**Name (working):** Termspace
**Category:** GUI-first terminal workspace manager

> A desktop app where developers manage projects as visual workspaces, each containing terminals, layouts, and reusable command blocks — fully persistent and GUI-driven.

---

# 🎯 CORE PRINCIPLES (non-negotiable)

1. **GUI-first**

   * Everything clickable, draggable, discoverable
   * No required config files

2. **Zero mental overhead**

   * No remembering commands/layouts
   * Everything saved automatically

3. **Workspace = project**

   * One project → one saved environment

4. **Instant restore**

   * Open app → resume exactly where you left off

---

# 🏗️ TECH STACK (fixed)

### Framework

* Wails

### Frontend

* React + TypeScript

### Terminal rendering

* xterm.js

### Backend (Go)

* PTY handling → `creack/pty`
* State → JSON (MVP), SQLite (later)

---

# 🧩 SYSTEM ARCHITECTURE

## Layers

### 1. Backend (Go)

Responsibilities:

* spawn/manage terminal processes
* manage sessions/panes
* persist/load workspace state
* execute commands

---

### 2. Frontend (React)

Responsibilities:

* UI rendering
* layout management
* user interaction
* state visualization

---

### 3. Bridge (Wails)

* Go functions exposed to frontend
* async command execution

---

# 📦 DATA MODEL (strict)

```ts
type Workspace = {
  id: string
  name: string
  path: string
  createdAt: number
  updatedAt: number
  tabs: Tab[]
  commands: Command[]
}

type Tab = {
  id: string
  name: string
  panes: Pane[]
}

type Pane = {
  id: string
  cwd: string
  processId?: number
  layout: LayoutNode
}

type LayoutNode =
  | { type: "split"; direction: "horizontal" | "vertical"; children: LayoutNode[] }
  | { type: "pane"; paneId: string }

type Command = {
  id: string
  name: string
  command: string
  group?: string
  variables?: { name: string; default?: string }[]
}
```

---

# 🧠 FEATURE SET

---

## 🔹 1. Workspace system (MVP critical)

### Features:

* Create / rename / delete workspace
* Open workspace (restores everything)
* Auto-save on change

### UI:

* Dashboard (grid/list)
* Search + quick open

---

## 🔹 2. Terminal panes

### Features:

* Split horizontally/vertically
* Resize via drag
* Close/move panes
* Tabs per workspace

### UX:

* Right-click → split
* Drag edges to resize

---

## 🔹 3. Persistent sessions

### Must restore:

* layout
* working directory
* commands running (optional MVP: restart instead)

---

## 🔹 4. Command Blocks (core differentiator)

### Features:

* create/edit/delete commands
* group commands
* run with click
* assign to pane

### UX:

* sidebar panel
* click → run
* drag → pane

---

## 🔹 5. Command execution

### Behavior:

* run in selected pane
* if none → create new pane

---

## 🔹 6. Command history → save

* right-click terminal output
* “Save as Command”

---

## 🔹 7. Workspace restore

### On app launch:

* show last opened workspace
* option to restore all

---

# 🖥️ UI DESIGN

---

## 🔹 Main layout

```text
+--------------------------------------------------+
| Sidebar (Workspaces / Commands)                  |
|--------------------------------------------------|
| Tabs                                             |
|--------------------------------------------------|
| Pane Layout Area (terminals)                     |
|                                                  |
+--------------------------------------------------+
```

---

## 🔹 Sidebar

Tabs:

* Workspaces
* Commands

---

## 🔹 Command Panel

* grouped list
* click → run
* right-click → edit/delete

---

## 🔹 Pane system

* grid-based split view
* draggable dividers
* active pane highlight

---

# 🎨 UX PRINCIPLES

* No hidden features
* Everything visible or searchable
* Right-click menus everywhere
* Drag & drop > buttons when possible

---

# ♿ ACCESSIBILITY

Must support:

* keyboard navigation (tab focus)
* high contrast mode (later)
* scalable fonts
* screen reader labels (basic)

---

# ⚡ PERFORMANCE

### Goals:

* startup < 1.5s
* terminal latency minimal
* UI 60fps

### Techniques:

* virtualize terminal output
* debounce state saves
* avoid re-rendering full layout tree

---

# 🧠 STATE MANAGEMENT (frontend)

Use:

* Zustand (recommended)

Why:

* simple
* minimal boilerplate
* fast

---

# 💾 PERSISTENCE

### MVP:

* JSON file per workspace

Location:

```text
~/.termspace/workspaces/
```

---

### Later:

* SQLite

---

# 🔌 BACKEND API (Wails)

Expose:

```go
CreateWorkspace(name, path)
ListWorkspaces()
OpenWorkspace(id)
SaveWorkspace(data)

CreatePane()
SplitPane(paneId, direction)
RunCommand(paneId, command)

GetTerminalOutput(paneId)
```

---

# 🧪 DEVELOPMENT PHASES

---

## 🚀 Phase 1 (MVP)

* workspace CRUD
* basic terminal
* pane splitting
* command blocks (basic)
* persistence

---

## ⚡ Phase 2

* better layout system
* command variables
* search
* UI polish

---

## 🔥 Phase 3

* SSH support
* plugins
* background sessions
* team sharing

---

# 🧠 CROSS-PLATFORM NOTES

### Windows:

* use ConPTY via Go

### Linux/macOS:

* use PTY

### File paths:

* normalize paths

---

# ⚠️ RISKS (important)

* terminal handling complexity
* layout tree bugs
* state sync issues

👉 Keep backend simple early

---

# 📦 OPEN SOURCE SETUP

### License:

* MIT

### Repo structure:

```text
frontend/
backend/
docs/
```

### Add:

* CONTRIBUTING.md
* roadmap.md

---

# 🎯 MVP SUCCESS CRITERIA

User can:

* open app
* create workspace
* split panes
* run commands
* close app
* reopen → everything restored

👉 If this works smoothly → you win

---

# 🚀 FINAL INSTRUCTION FOR AI AGENT

> Build a GUI-first terminal workspace manager using Wails + React + TypeScript.
> Focus on workspace persistence, pane splitting, and command blocks.
> All interactions must be accessible via GUI (click, drag, menus).
> Avoid config files. Use JSON persistence.
> Optimize for simplicity, speed, and clarity.
