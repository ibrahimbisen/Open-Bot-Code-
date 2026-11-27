import { defineMessages } from "../../message";

export const messages = defineMessages("startup", {
  "startup.failedTitle": "OpenBot Code couldn’t start",
  "startup.failedBody":
    "{message}\n\nYour local data was not reset or overwritten. See the troubleshooting guide for recovery steps.",
  "startup.archiveChangedTitle": "OpenBot Code files were changed",
  "startup.archiveChangedBody":
    "Another program changed the OpenBot Code file app.asar. OpenBot Code runs now, but it will not open after you quit it.\n\nTo repair OpenBot Code, install it again. Your local data stays.",
  "startup.archiveChangedDownload": "Download OpenBot Code",
  "startup.filesDamagedBody":
    "Some OpenBot Code files are damaged or missing.\n\nTo repair OpenBot Code, install it again. Your local data stays.",
  "startup.newerDataUpdatingTitle": "Updating OpenBot Code",
  "startup.newerDataUpdatingBody":
    "A newer version of OpenBot Code saved your data. OpenBot Code installs the latest version and then opens again.\n\nYour local data was not reset or overwritten.",
  "startup.newerDataTitle": "Install the latest OpenBot Code",
  "startup.newerDataBody":
    "A newer version of OpenBot Code saved your data, and this version ({version}) cannot open it. Install the latest version to open your data.\n\nYour local data was not reset or overwritten.",
  "startup.newerDataDownload": "Download OpenBot Code",
  "startup.newerDataGuide": "Open guide",
  "startup.newerDataQuit": "Quit",
  "startup.newerDataLoopTitle": "The latest OpenBot Code did not open",
  "startup.newerDataLoopBody":
    "A newer version of OpenBot Code saved your data, and this version ({version}) cannot open it. OpenBot Code {loopVersion} stopped before it opened several times in a row, so it is not installed again.\n\nInstall a version newer than {loopVersion} when one is available. To get help, open the guide.\n\nYour local data was not reset or overwritten.",
  "startup.newerDataReleases": "Show releases",
  "startup.recoveryWindowTitle": "OpenBot Code recovery",
  "startup.recoveryTitle": "OpenBot Code did not open",
  "startup.recoveryBody": {
    one: "OpenBot Code {version} stopped before it opened, {count} time in a row. Your local data was not reset or overwritten.",
    other:
      "OpenBot Code {version} stopped before it opened, {count} times in a row. Your local data was not reset or overwritten.",
  },
  "startup.recoveryHint":
    "Try again, or install the last version that opened. To get help, export the diagnostics and send the file with your report.",
  "startup.recoveryHintLatest":
    "OpenBot Code found no earlier version that can open your data. Try again, or install the latest version. To get help, export the diagnostics and send the file with your report.",
  "startup.recoveryRetry": "Try again",
  "startup.recoveryPreviousVersion": "Download previous version",
  "startup.recoveryLatestVersion": "Download latest version",
  "startup.recoveryExportDiagnostics": "Export diagnostics",
  "startup.recoveryOpenDataFolder": "Open data folder",
  "startup.recoveryQuit": "Quit",
  "startup.recoveryDiagnosticsSaved": "The diagnostics file is saved.",
  "startup.recoveryActionFailed": "OpenBot Code could not do this action.",
});
