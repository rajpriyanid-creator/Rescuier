# App Sounds

Place the following audio files here for use in the app:

| File               | Format | Used For                           |
|--------------------|--------|------------------------------------|
| alert.mp3          | MP3    | Disaster alert banner sound        |
| seismic_alarm.mp3  | MP3    | Earthquake early warning alarm     |
| sos_sent.mp3       | MP3    | Confirmation when SOS is sent      |

**Requirements:**
- Keep files under 200KB each for fast loading
- Use 44.1 kHz, mono, 128 kbps MP3
- Free sources: freesound.org, mixkit.co (check licence)

These are loaded via `expo-av` Audio API in the app.
