# CodeBot user guide

This guide is for the people who use CodeBot. It describes what the app does in this build. The names
of buttons and settings are the names that the app shows.

The last section, [Not in this build yet](#not-in-this-build-yet), lists what the PRD names and the
app does not have yet.

## Contents

- [Projects](#projects)
- [Chats](#chats)
- [Split panels](#split-panels)
- [File tree and git](#file-tree-and-git)
- [Short replies](#short-replies)
- [Slash commands](#slash-commands)
- [Folder lock levels](#folder-lock-levels)
- [Themes](#themes)
- [Advanced features](#advanced-features)
- [Local models](#local-models)
- [Status bar](#status-bar)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Account](#account)
- [Updates](#updates)
- [Not in this build yet](#not-in-this-build-yet)

## Projects

A project is a folder on your computer with its own agents and chats. The left bar shows the list of
your projects. Each row has the project name, its color, a small badge for the access level, and a
status dot.

The status dot has five states: Idle, Working, Done, Needs input and Error. A project keeps working
when you look at another project.

Create a project:

1. In the left bar, choose **New project**. On a new install, choose **Create a project**.
2. Enter a **Name**.
3. Choose the **Main folder**. The agents of the project work in this folder.
4. Optional: add **More folders**. The agents can also work in these folders.
5. Pick the **Access level** (see [Folder lock levels](#folder-lock-levels)). The default is Normal.
6. Optional: pick a **Color**, a **Default model** and **Project instructions**. All agents of the
   project get the instructions.
7. Choose **Create project**.

Change a project later: open the menu of the project row (or the settings button above its chat list)
and choose **Project settings**. The tabs are **General**, **Folders**, **Agents** and **Archive and
delete**.

Agents: a project has at least one agent. Each agent has a role (for example Developer or Reviewer),
instructions and a model. Add, edit and remove agents in the **Agents** tab. When you start a chat,
you pick the agent that runs it.

Archive a project to remove it from the list. Its chats and files stay. Open **Archived projects** to
restore it. Delete a project to remove the project, its agents and its chats. The files in the folders
stay.

## Chats

Each project has a chat list next to the main area.

- **New chat** at the top starts a new empty chat in the same project.
- Below it, the history shows all chats of the project, newest first, with a title and an age.
  **Pinned** chats are at the top.
- CodeBot makes the title of a chat from your first message. Choose **Rename** in the chat menu to
  change it.
- **Search chats** filters the list.
- The chat menu also has **Open to the side**, **Pin**, **Archive** and **Delete**. Delete asks for a
  confirmation and can be undone for a few seconds. **Show archived chats** opens the archive.
- Each chat has its own provider session. A chat shows its state: Running, Queued, Waiting for
  input or Failed, and the number of unread messages.
- A chat keeps running when you leave it or switch project.

Each chat can use its own model. The panel header has **Model of this chat**. New chats use the default
model of the project. The model cannot change while the chat runs a turn.

CodeBot compacts the context of a long chat by itself, as the engine did before.

## Split panels

The main area of a project is a dock. Each panel holds one thing:

- a chat,
- a file (editor or preview),
- the changes of a chat (**Changes**),
- the browser.

Use **Add a panel** to open one. The choices are **Chat from another project**, **File**, **Changes**
and **Browser**. A panel with a chat of another project shows the name of that project.

In the header of a panel:

- **Split right** and **Split down** split the main area.
- **Maximize the panel** and **Restore the panel size** change the size of one panel.
- **Close the panel** closes it.

Drag a panel to move it. Drag the edge between two panels to change their size. CodeBot saves the layout
of each project in this app and restores it at the next start.

The embedded browser opens as a panel. An agent that browses uses the same browser.

## File tree and git

In the project column, **Files** shows the file tree of the main folder and the added folders of the
current project. It changes when you switch project and it updates when files change on disk.

- Folders and files have colored icons by name and type.
- The tree marks files that git reports as added, modified, deleted, renamed, untracked, in conflict or
  ignored.
- The menu of a file has **Open**, **Open to the side**, **Reveal in file manager**, **Copy path**,
  **Rename** and **Delete**. Delete moves the item to the trash of the computer. The buttons above the
  tree make a **New file** or **New folder**.

**Git** shows the branch, how many commits you are ahead or behind, the changed files and the commit
history. Choose **Load more commits** for older commits. If the folder is not a git repository, or git
is not installed, the panel says so.

Open a file to see it in a panel:

- Code opens in an editor (Monaco). You can read and edit. Choose **Save** to write the file. If the
  file changes on disk, the editor offers **Reload** or **Overwrite**.
- Markdown shows rendered. Images, SVG, PDF, JSON and CSV show as a preview. Use **Source** to see the
  text.
- **Changes** lists the files that changed in the current chat. It needs a git repository. Open a file
  there to see the diff, in one column or side by side.

## Short replies

By default a chat shows the final answer of the agent. The tool calls, file reads, commands and
thinking are behind a one-line summary, for example "edited 3 files, ran 2 commands". Choose
**Details** to see the steps with their input, output, timeline and diffs. Choose **Hide details** to
close them. CodeBot loads the details only when you open them.

A code block that has more than 20 lines is folded. Choose **Show all** to open it and **Show less** to
fold it.

Settings, in **Settings > General**:

- **Reply view**: **Short** or **Detailed**. Detailed also shows the steps in the chat.
- **Reply rule**: the rule that every chat gets before all other style guidance. The default is:
  "Reply short and plain. Answer only what the user asked. No filler. Use Simplified Technical
  English." Edit it and choose **Save rule**, or choose **Use default rule**. An empty rule sends no
  rule. A change applies from the next turn.

A project can have its own reply rule. The engine supports it, but the project settings screen has no
field for it yet.

## Slash commands

Type `/` at the start of a message to open the command menu. Type more letters to filter it.

The list comes from the provider engine, not from documentation. For Claude Code, CodeBot starts the
engine once in the background, reads the commands that it reports, and saves them in the file
`slash-commands.json` in the user data folder. This costs no model tokens. CodeBot reads the list again
when the engine version changes. A new command from a provider update appears with no change in CodeBot.

The menu also lists your own commands and skills: the `.claude` folder of the project and the `.claude`
folder of your user. A badge shows the source: **Project**, **User**, **Plugin**, **MCP**, **Skill** or
**CodeBot**. A command that works only in a terminal has the badge **Terminal only**.

Most commands run as plain text and show their result in the chat. Three commands have their own
screen:

- `/model` picks the model.
- `/effort` (also `/thinking` and `/reasoning`) picks the thinking level.
- `/resume` lists the chats that the engine saved for the folder. A resumed chat opens as a new chat.
  This is for Claude Code.

If the menu says that the engine has not reported its commands yet, start a chat with that provider.

## Folder lock levels

The access level of a project says where its agents can work. You pick it when you create the project
and you can change it in the project settings. A change applies to new turns.

| Level | What the agent can do |
| --- | --- |
| **Strict** | Sees only the project folders. The agent runs in a sandbox or a container. |
| **Normal** (default) | Reads and writes only in the project folders. |
| **Open** | Has full access to this computer, as OpenBot has. |

In Normal and Strict, the agent gets a rule to stay in the folders, and the engine blocks writes
outside them. A tool that reads or searches outside the folders is blocked too. A deny cannot be
approved. If CodeBot cannot lock a provider on your computer, it refuses to start the turn. It never
runs the agent without the lock.

Strict needs more from the computer. On Windows, Strict for Claude Code needs the Claude sandbox, and it was
off in our tests. CodeBot then refuses the turn. Use Normal. The full table of providers and systems is in
[folder-lock.md](folder-lock.md).

## Themes

Open **Settings > Appearance**. In **Theme** choose **System**, **Light** or **Dark**, or a palette
file. **System** follows the light or dark setting of your computer and changes without a restart.
Dark is the default and is the OpenBot dark theme.

Each file in the `themes` folder of the user data folder is one more choice. You can copy
`codebot-dark.json` and edit it. The format of a palette file is in [themes.md](themes.md).

## Advanced features

Some OpenBot features are hidden. A hidden feature has no button, no settings row and no agent tool.
Your data stays. Turn them on in **Settings > Advanced features**:

| Switch | What it adds |
| --- | --- |
| Routines | Scheduled tasks and webhooks. Adds Schedule to the left bar and Routines to the agent settings. |
| Channels | Many agents in one chat. Adds Channels to the left bar. |
| Marketplace | Skills, agents and plugins to install. Adds the Marketplace button. |
| Slack, Discord, Telegram and WhatsApp | The chat app connectors. |
| Computer Use | Lets an agent see and control apps on this computer. |
| Remote desktop | Control the screen of this computer from another device. |

Only an owner or an admin of a server can change the switches of that server. Local skills and the
embedded browser are always on.

## Local models

A project or a chat can use a model on a server of your own network, for example Ollama, LM Studio or
vLLM on a DGX Spark.

1. Open the server settings and choose **Local servers**.
2. Choose **Add machine**, or **Find a machine** and enter a host name. CodeBot looks for Ollama,
   LM Studio and vLLM on their usual ports.
3. Enter a **Name** and the **Server address** (an OpenAI-compatible address, for example
   `http://192.168.1.41:8000/v1`). Add an **API key** if the server needs one.
4. Optional: add a **GPU status address** to see GPU load and memory.
5. Choose **Test**, then save.

Each machine is its own entry. Then pick a model of that machine as the default model of a project or
as the model of a chat. Without a local server, CodeBot works as before. Details are in
[local-models.md](local-models.md).

## Status bar

The bottom of the left bar shows the status of the server and the limits of each provider that reports
them: the 5-hour limit (**5h**) and the weekly limit (**Week**), each as a percentage left. A line for
each local machine shows if it is online. Click the bar to see each provider and each machine.

## Keyboard shortcuts

**Settings > Keyboard** lists the shortcuts and lets you change them. Some defaults (on macOS use Cmd in
place of Ctrl):

| Action | Windows and Linux |
| --- | --- |
| New chat | Ctrl+Shift+O |
| Previous or next chat | Alt+Shift+Up, Alt+Shift+Down |
| Search | Ctrl+K |
| Search in the chat | Ctrl+F |
| Focus the message box | Shift+Esc |
| Show or hide the left bar | Ctrl+B |
| Show all shortcuts | Ctrl+/ |

## Account

You do not need an account. Without one, CodeBot works with a local profile and sends no request to an
account service.

An account is for remote access (phone and other computers). The planned sign-in uses your Nextcloud
user name and password, through the account service on the home server. When Nextcloud removes or
disables a user, that user loses access. See [home-server.md](home-server.md) for the service. The
desktop sign-in screen of this build is still the old one (email code). Do not use it with CodeBot.

## Updates

CodeBot gets updates from a folder on your own server, not from GitHub. Open **Settings > Updates**.

- **Update server URL**: the folder with the update files. If your build has the URL built in, you do
  not need to set it. With no URL, CodeBot does not check for updates.
- CodeBot checks at start and then every hour. It downloads a new version in the background and then
  shows **Restart to update**.
- **Restart automatically when idle** restarts the app by itself when no agent works.

CodeBot still updates the provider CLIs (Claude Code, Codex and others) by itself.

If the build is not signed, the first start shows a warning. See [unsigned-builds.md](unsigned-builds.md).
On macOS, an unsigned build can download an update and still be refused at install. Then install the
new DMG by hand. The release steps for the owner are in [updates.md](updates.md).

## Not in this build yet

These are in the PRD and are not in the app yet. Other work packages build them.

| What | Package |
| --- | --- |
| Panels that close by themselves, a pin button, a 50% default width, and a browser panel with an address bar and a hand-over toggle | W14 |
| Shortcuts for switch project, split panel and close panel | W15 |
| Sign-in with Nextcloud in the desktop app and the settings for the service addresses | W04 |
| Dark Modern, Light Modern, high-contrast, warm dark and blue dark themes | W16 (PRD 16.3) |
| The home server as the engine (Phase 2): switch between "This computer" and "Home server" | W17 |
| The mobile app for the self-hosted services | W18 |
| The visible name "OpenBot Code" | One pass after all packages merge |
