import { db } from '../db';
import { getExpiryInfo, formatDateToISO } from './unitConverter';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

export function getNotificationPermissionStatus(): NotificationStatus {
  if (!('Notification' in window)) {
    return { supported: false, permission: 'denied' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
}

// Find items in pantry that are expired or expiring within 3 days
export async function getExpiringItems() {
  const pantryItems = await db.pantry.toArray();
  const expiring = pantryItems.filter(item => {
    if (!item.expiryDate) return false;
    const info = getExpiryInfo(item.expiryDate);
    return info.status === 'expired' || info.status === 'warning';
  });

  return expiring;
}

// Check and trigger local notification if appropriate
export async function checkAndSendExpiryNotification(force: boolean = false): Promise<{ sent: boolean; message: string; itemCount: number }> {
  if (!('Notification' in window)) {
    return { sent: false, message: 'Nettleseren støtter ikke lokale varsler.', itemCount: 0 };
  }

  const expiringItems = await getExpiringItems();
  if (expiringItems.length === 0) {
    return { sent: false, message: 'Ingen matvarer er i ferd med å gå ut på dato.', itemCount: 0 };
  }

  const todayStr = formatDateToISO(new Date());
  const settings = await db.settings.get('global-settings');

  // If not forced and already checked today, skip
  if (!force && settings?.lastNotificationCheckDate === todayStr) {
    return { sent: false, message: 'Allerede varslet i dag.', itemCount: expiringItems.length };
  }

  if (Notification.permission !== 'granted') {
    return { sent: false, message: 'Varslingstillatelse er ikke innvilget.', itemCount: expiringItems.length };
  }

  // Format message
  const itemNames = expiringItems.slice(0, 3).map(i => i.name).join(', ');
  const moreText = expiringItems.length > 3 ? ` og ${expiringItems.length - 3} andre` : '';
  const title = `⚠️ ${expiringItems.length} matvare${expiringItems.length === 1 ? '' : 'r'} går ut på dato snart!`;
  const body = `Sjekk ${itemNames}${moreText} i matvarelageret for å unngå matsvinn.`;

  // Try service worker notification first (better on Android PWA)
  let sentViaSW = false;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'expiry-alert',
          vibrate: [200, 100, 200]
        } as NotificationOptions);
        sentViaSW = true;
      }
    }
  } catch (swErr) {
    console.warn('Service worker notification failed, falling back to window Notification:', swErr);
  }

  if (!sentViaSW) {
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png'
      });
    } catch (winErr) {
      console.warn('Window Notification error:', winErr);
    }
  }

  // Update last check date
  if (settings) {
    await db.settings.update(settings.id, {
      lastNotificationCheckDate: todayStr
    });
  }

  return {
    sent: true,
    message: `${title}: ${body}`,
    itemCount: expiringItems.length
  };
}

// Test notification helper for user to verify right away
export async function sendTestNotification(): Promise<boolean> {
  if (!('Notification' in window)) {
    alert('Nettleseren din støtter ikke web-varsler.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (granted !== 'granted') {
      alert('Varslingstillatelse ble avslått. Vennligst tillat varsler i nettleserinnstillingene.');
      return false;
    }
  }

  const title = '🥦 MatApp: Holdbarhetsvarsling fungerer!';
  const body = 'Du vil motta påminnelser når matvarer i lageret nærmer seg utløpsdato.';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [100, 50, 100]
        } as NotificationOptions);
        return true;
      }
    }
  } catch (e) {
    console.warn('SW notification fallback to window notification', e);
  }

  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png'
    });
    return true;
  } catch (err) {
    console.error('Kunne ikke sende testvarsel:', err);
    return false;
  }
}
