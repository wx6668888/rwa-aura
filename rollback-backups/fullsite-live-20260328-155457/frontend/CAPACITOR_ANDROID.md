# RWA Protocol Android (Capacitor)

## Current setup

- Runtime shell: `Capacitor + Android`
- App id: `org.rwaprotocol.app`
- App name: `RWA Protocol`
- Web source for updates: `https://rwa.lat`
- Native project path: `frontend/android`

## Commands

```bash
cd /www/wwwroot/rwaprotocol.dpdns.org/frontend
npm run cap:sync
npm run cap:open
```

## Build APK/AAB

1. Run `npm run cap:sync`
2. Run `npm run cap:open` (opens Android Studio)
3. In Android Studio:
   - Build debug APK: `Build -> Build Bundle(s) / APK(s) -> Build APK(s)`
   - Build release AAB: `Build -> Generate Signed Bundle / APK`

## Update strategy

- Web/UI changes:
  - Deploy to `https://rwa.lat`
  - App reflects updates without shipping a new APK
- Native/plugin changes:
  - Re-run `npm run cap:sync`
  - Rebuild and publish a new Android package

## Notes

- Keep domain HTTPS valid (required).
- Wallet flows should use WalletConnect/deeplink for best Android compatibility.
- If you change Capacitor plugins, always re-run `npm run cap:sync`.
