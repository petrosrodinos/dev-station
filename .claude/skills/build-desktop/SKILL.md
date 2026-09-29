---
name: build-desktop
description: Build the Dev Station Electron app as an unpacked folder (not the NSIS installer) at C:\dev-station-release\win-unpacked. Use when the user says "build for desktop/electron", "build the app", or asks for the exe.
---

# Build desktop (unpacked)

Run without asking for confirmation. Output goes outside the Desktop folder because building into `app\release` fails with `EPERM` on the `win-unpacked.tmp` rename.

From `app/` (PowerShell):

```powershell
npm run build
npx electron-builder --dir --config.directories.output=C:\dev-station-release
```

- Do **not** try to delete `C:\dev-station-release` (removal is blocked); electron-builder overwrites `win-unpacked` in place.
- Do not use `npm run dist` (that builds the installer).
- Verify with `Get-Item "C:\dev-station-release\win-unpacked\Dev Station.exe"` and check its `LastWriteTime` is fresh.
- Report the exe path: `C:\dev-station-release\win-unpacked\Dev Station.exe` (needs the whole folder beside it).
