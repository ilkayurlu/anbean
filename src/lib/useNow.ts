"use client";

import { useCallback, useSyncExternalStore } from "react";

/* eslint-disable react-hooks/immutability --
 * useSyncExternalStore'un belgelediği desen budur: abone olunan şey React
 * dışında yaşayan, değişebilir bir zamanlayıcı deposudur. Değişim yalnızca
 * subscribe/unsubscribe geri çağırmalarında olur, render sırasında değil. */

/**
 * Ortak "şimdi" saati.
 *
 * useSyncExternalStore ile kurulur: useEffect içinde setState yok (kaskad
 * render yok), aynı aralığı kullanan bileşenler tek bir setInterval paylaşır
 * ve sekme arka planda olsa bile tarayıcı zamanlayıcıyı kısar.
 *
 * Sunucu görüntüsü null döner; sayaç bileşenleri bunu "--:--" gibi bir
 * yer tutucuyla çizer, böylece hidrasyon uyuşmazlığı olmaz.
 */
type Store = {
  value: number;
  listeners: Set<() => void>;
  timer: number | null;
};

const stores = new Map<number, Store>();

function getStore(intervalMs: number): Store {
  let store = stores.get(intervalMs);
  if (!store) {
    store = { value: Date.now(), listeners: new Set(), timer: null };
    stores.set(intervalMs, store);
  }
  return store;
}

export function useNow(active = true, intervalMs = 1000): number | null {
  const store = getStore(intervalMs);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!active) return () => {};
      store.listeners.add(onChange);
      if (store.timer === null) {
        store.timer = window.setInterval(() => {
          store.value = Date.now();
          store.listeners.forEach((listener) => listener());
        }, intervalMs);
      }
      return () => {
        store.listeners.delete(onChange);
        if (store.listeners.size === 0 && store.timer !== null) {
          window.clearInterval(store.timer);
          store.timer = null;
        }
      };
    },
    [active, intervalMs, store],
  );

  const getSnapshot = useCallback(() => (active ? store.value : null), [active, store]);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
