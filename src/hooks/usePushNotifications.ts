import { useState, useEffect } from 'react';
import { getVapidPublicKey, subscribePush } from '../services/api';

function hexToBase64Url(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = (utenteId?: number, tesseratoId?: number) => {
  const [permesso, setPermesso] = useState<NotificationPermission>('default');
  const [iscritto, setIscritto] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermesso(Notification.permission);
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setIscritto(!!sub);
  };

  const attivaPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Il tuo browser non supporta le notifiche push'); return;
    }
    const permessoRichiesto = await Notification.requestPermission();
    setPermesso(permessoRichiesto);
    if (permessoRichiesto !== 'granted') { alert('Permesso notifiche negato'); return; }
    try {
      const keyRes = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(keyRes.data.public_key);
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const subJson = subscription.toJSON();
      await subscribePush({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        utente_id: utenteId || null,
        tesserato_id: tesseratoId || null
      });
      setIscritto(true);
      alert('Notifiche push attivate!');
    } catch (e) {
      console.error('Errore push:', e);
      alert('Errore durante l\'attivazione delle notifiche');
    }
  };

  return { permesso, iscritto, attivaPush };
};
