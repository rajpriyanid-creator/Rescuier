// This is a wrapper component that activates the seismic hook.
// Placed in RootLayout so it runs as long as the app is open.
import { useSeismicDetection } from '../../hooks/useSeismicDetection';
import { EarlyWarningAlert } from './EarlyWarningAlert';

export function SeismicDetector() {
  useSeismicDetection(true); // Activates accelerometer + STA/LTA in background
  return <EarlyWarningAlert />;
}
