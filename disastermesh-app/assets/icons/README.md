# App Icons

Place the following files here before building:

| File                  | Size       | Used For                      |
|-----------------------|------------|-------------------------------|
| icon.png              | 1024×1024  | App icon (iOS + Android)      |
| splash.png            | 1284×2778  | Splash screen                 |
| adaptive-icon.png     | 1024×1024  | Android adaptive icon         |
| notification-icon.png | 96×96      | Android notification icon     |

**Requirements:**
- All files must be PNG
- `icon.png` and `adaptive-icon.png` should have a transparent or solid background
- `notification-icon.png` must be **white on transparent** (Android requirement)
- `splash.png` background colour matches `app.json` backgroundColor: `#0f172a`

Generate all sizes from a single source SVG using:
```bash
npx expo-optimize  # or use Expo's EAS build which auto-resizes
```
