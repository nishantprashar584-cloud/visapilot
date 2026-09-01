import type { ItinerarySyncInput, ItinerarySyncResult } from "@/types";

type ItinerarySyncEventDetail = {
  itineraryEntries: ItinerarySyncInput["itineraryEntries"];
  result: ItinerarySyncResult;
};

const itinerarySyncEventName = "visapilot:itinerary-sync";

function getEventTarget(): EventTarget | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

export function publishItinerarySync(detail: ItinerarySyncEventDetail): void {
  const target = getEventTarget();

  if (!target) {
    return;
  }

  target.dispatchEvent(new CustomEvent<ItinerarySyncEventDetail>(itinerarySyncEventName, { detail }));
}

export function subscribeToItinerarySync(handler: (detail: ItinerarySyncEventDetail) => void): () => void {
  const target = getEventTarget();

  if (!target) {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<ItinerarySyncEventDetail>;
    handler(customEvent.detail);
  };

  target.addEventListener(itinerarySyncEventName, listener);

  return () => {
    target.removeEventListener(itinerarySyncEventName, listener);
  };
}