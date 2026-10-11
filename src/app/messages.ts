import type { CameraErrorCode } from '../motor/camera';

/** Uitleg bij een camerafout, in kindvriendelijk Nederlands (+ een tip voor de volwassene). */
export const CAMERA_ERROR_TEXT: Record<CameraErrorCode, string> = {
  insecure: 'De camera werkt enkel via een beveiligde link (https). Open de app via de officiële link.',
  'no-api': 'Deze browser kan de camera niet gebruiken. Probeer Chrome.',
  denied: 'De app mag de camera niet gebruiken. Tik op het slotje naast het adres en zet "Camera" op "Toestaan".',
  'not-found': 'Er is geen (geschikte) camera gevonden op dit toestel.',
  busy: 'De camera is bezig in een andere app. Sluit die app en probeer opnieuw.',
  unknown: 'De camera kon niet starten. Probeer de pagina te herladen.',
};
