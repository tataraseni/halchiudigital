import { useState } from "react";

export type GeoStatus =
  | "idle"
  | "requesting"
  | "in_zone"
  | "outside_zone"
  | "denied"
  | "error"
  | "unlocked";

const HALCHIU_LAT = 45.7267;
const HALCHIU_LNG = 25.5822;
const ZONE_RADIUS_KM = 15;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SESSION_KEY = "halchiu_geo_unlocked";

export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "1" ? "unlocked" : "idle";
  });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const unlock = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setStatus("unlocked");
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(
          pos.coords.latitude,
          pos.coords.longitude,
          HALCHIU_LAT,
          HALCHIU_LNG
        );
        setDistanceKm(Math.round(km));
        if (km <= ZONE_RADIUS_KM) {
          setStatus("in_zone");
          // auto-unlock after confirmation delay
          setTimeout(unlock, 1800);
        } else {
          setStatus("outside_zone");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("error");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return { status, distanceKm, requestLocation };
}
