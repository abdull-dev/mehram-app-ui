import React from "react";
import { View, type ViewProps } from "react-native-web";

/**
 * `react-native-maps` for the web — one call site, the city picker's
 * confirmation map.
 *
 * Rendered as a plain OpenStreetMap tile behind a pin, which is what the native
 * screen shows too (it passes a `UrlTile` pointing at the same tiles). A static
 * image needs no map library and no API key; the screen only ever displays a
 * location, it never lets you pan or search on the map itself.
 */
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

interface MapViewProps extends ViewProps {
  region?: Region;
  initialRegion?: Region;
  children?: React.ReactNode;
}

/** Web Mercator: longitude is linear, latitude is not. */
function tileFor(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        n,
    ),
  };
}

export default function MapView({
  region,
  initialRegion,
  children,
  style,
  ...rest
}: MapViewProps) {
  const target = region ?? initialRegion;
  const zoom = 11;
  const tile = target ? tileFor(target.latitude, target.longitude, zoom) : null;

  return (
    <View {...rest} style={style}>
      {tile && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            backgroundColor: "#E8E4F3",
            backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {children}
    </View>
  );
}

/** The pin. Positioned by the parent, so it only has to draw itself. */
export function Marker({ pinColor = "#7C5AE0" }: { pinColor?: string }) {
  return (
    <View
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 18,
        height: 18,
        marginTop: -9,
        marginLeft: -9,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: "#fff",
        backgroundColor: pinColor,
      }}
    />
  );
}

/** The native screen supplies its own tile URL; here the tile is the map. */
export function UrlTile(_: { urlTemplate?: string; maximumZ?: number }) {
  return null;
}

export const PROVIDER_DEFAULT = undefined;
export const PROVIDER_GOOGLE = "google";
