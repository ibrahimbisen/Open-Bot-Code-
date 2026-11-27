# Open an unsigned build

Code signing is optional for internal use (PRD 12.8). A build that is not signed shows a warning
the first time. Do this only for builds that you or your team made.

## Windows

Windows SmartScreen shows "Windows protected your PC" for an unsigned installer.

1. Choose **More info**.
2. Choose **Run anyway**.

If the file comes from a download, you can also open the file properties, select **Unblock**, and
choose OK before you start the installer. The installer installs for the current user by default.
The updater checks the sha512 of each download against the metadata, and it does not check a
signature when the build has no publisher name.

## macOS

macOS Gatekeeper refuses an app that is not signed and notarized.

1. Open the DMG and drag CodeBot to Applications.
2. Do not double-click it the first time. Right-click (or Control-click) CodeBot and choose **Open**,
   then choose **Open** in the dialog.
3. If macOS still refuses (macOS 15 and later), open **System Settings > Privacy & Security**, scroll
   to the message about CodeBot, choose **Open Anyway**, and confirm with your password.

As an alternative, remove the download mark in a terminal:

```
xattr -dr com.apple.quarantine /Applications/CodeBot.app
```

Automatic updates on macOS need a code signature that stays the same between versions. An unsigned
build, or one that is only ad-hoc signed, does not download or install an update by itself: it shows
the new version, and Download opens the release page in the browser. Install the new DMG by hand as
above. To get automatic updates on macOS, sign the app with
one certificate every time (a Developer ID Application certificate, or a self-made code signing
certificate that all your Macs trust).

## Linux

The AppImage is not signed and needs no warning step. Make it executable once:

```
chmod +x CodeBot-<version>-x86_64.AppImage
```

The in-app updater replaces the AppImage file at "Restart to update". Keep the file in a folder that
your user can write to.
