# CodeBot project documents

CodeBot is a fork of OpenBot (github.com/nightly-labs/openbot) for internal use by its owner and his
team. These documents describe the fork. The other files in `docs/` come from upstream and describe
the engine that CodeBot keeps.

| Document | Content |
| --- | --- |
| [prd-status.md](prd-status.md) | Each PRD item with its status and proof |
| [decisions.md](decisions.md) | Choices made for the owner, and the work packages |
| [agent-brief.md](agent-brief.md) | Rules for build agents |
| [upstream-sync.md](upstream-sync.md) | How to take changes from upstream OpenBot |
| [updates.md](updates.md) | Application updates from your server and the one-command release |
| [unsigned-builds.md](unsigned-builds.md) | How to open unsigned builds on macOS and Windows |
| [windows-test-status.md](windows-test-status.md) | Result of each check and offline test suite on Windows |
| [user-guide.md](user-guide.md) | How to use CodeBot: projects, chats, panels, replies, commands, folder lock, themes |
| [home-server.md](home-server.md) | Home server: update server, Nextcloud login, account service, Signal and TURN |
| [account-service.md](account-service.md) | Account service, Nextcloud, Signal and TURN in detail |
| [folder-lock.md](folder-lock.md), [themes.md](themes.md), [local-models.md](local-models.md) | Design notes of these parts |
| [engine-reference.md](engine-reference.md) | Long text of the upstream README: provider setup, data folders, attachments |

## License and attribution (PRD 3.5)

CodeBot is a fork of OpenBot by Synthetify Labs. OpenBot is licensed under the PolyForm Noncommercial
License 1.0.0, and CodeBot keeps that license. These three parts stay in the repository, in the
installer and in every copy that someone gets:

- `LICENSE`: the license text.
- `NOTICE`: the OpenBot copyright line, the notices of third-party parts, and the contact for a
  commercial license.
- The copyright line in `electron-builder.yml`.

Do not remove or shorten them. The rename script keeps `LICENSE` and `NOTICE` as they are (decision
D3), and `check:branding` skips both files. CodeBot is for internal use only (PRD 1.3), so it does not
need a commercial license. Do not sell it and do not use it for commercial work.
