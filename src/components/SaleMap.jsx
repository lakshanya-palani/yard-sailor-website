import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, getPublicLocation, hasValidCoordinates, requestUserLocation } from "../utils/location";
import "./SaleMap.css";
import { getSaleStatus, saleStatusLabel } from "../utils/saleTime";
import useSaleClock from "../utils/useSaleClock";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function SaleMap({
  sales: providedSales,
  selectedSaleId = null,
  selectionRequest = 0,
  onSelectSale,
  center = null,
  className = "",
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const fittedRef = useRef(false);
  const navigate = useNavigate();
  const [loadedSales, setLoadedSales] = useState([]);
  const now = useSaleClock(providedSales ?? loadedSales);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (providedSales !== undefined) return undefined;

    async function fetchSales() {
      const { data, error } = await supabase
        .from("sales")
        .select("id, title, description, address, lat, lng, images, start_time, end_time, status")
        .in("status", ["upcoming", "live"])
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (error) console.error("Error fetching yard sales:", error);
      else setLoadedSales(data || []);
    }

    fetchSales();
    window.addEventListener("yardSailorYardSalesUpdated", fetchSales);
    return () => window.removeEventListener("yardSailorYardSalesUpdated", fetchSales);
  }, [providedSales]);

  useEffect(() => {
    if (providedSales === undefined) requestUserLocation().then(setUserLocation);
  }, [providedSales]);

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-122.0308, 36.9741],
      zoom: 12,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      mapRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    const sales = providedSales ?? loadedSales.filter(sale => ["upcoming", "live"].includes(getSaleStatus(sale, now)));

    const validSales = sales.filter((sale) =>
      hasValidCoordinates(sale.lat, sale.lng)
    );

    validSales.forEach((sale, index) => {
      const latitude = Number(sale.lat);
      const longitude = Number(sale.lng);

      const popupContent = document.createElement("div");
      popupContent.className = "yard-sale-popup";
      if (sale.images?.[0]) {
        const image = document.createElement("img");
        image.src = sale.images[0];
        image.alt = sale.title;
        popupContent.appendChild(image);
      }
      const title = document.createElement("strong");
      title.textContent = sale.title;
      popupContent.appendChild(title);
      if (userLocation) {
        const distance = calculateDistanceMiles(userLocation.latitude, userLocation.longitude, latitude, longitude);
        const distanceText = document.createElement("span");
        if (distance != null) {
          distanceText.textContent = `${distance.toFixed(1)} miles away`;
          popupContent.appendChild(distanceText);
        }
      }
      const address = document.createElement("span");
      address.textContent = getPublicLocation(sale.address);
      popupContent.appendChild(address);
      if (sale.start_time) {
        const startTime = document.createElement("span");
        startTime.textContent = new Date(sale.start_time).toLocaleString();
        popupContent.appendChild(startTime);
      }
      if (sale.status) {
        const status = document.createElement("span");
        status.textContent = saleStatusLabel(sale, now);
        popupContent.appendChild(status);
      }
      const description = document.createElement("p");
      description.textContent = sale.description?.slice(0, 140) || "";
      popupContent.appendChild(description);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "View Yard Sale";
      button.addEventListener("click", () => navigate(`/yard-sale/${sale.id}`));
      popupContent.appendChild(button);

      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "sale-map-pin";
      pin.textContent = String(index + 1);
      pin.setAttribute("aria-label", `${index + 1}. ${sale.title}`);
      const marker = new mapboxgl.Marker({ element: pin, anchor: "bottom" })
        // Mapbox always expects longitude first, then latitude.
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent))
        .addTo(mapRef.current);
      marker.getElement().addEventListener("click", () => onSelectSale?.(sale.id));
      markersRef.current.set(sale.id, { marker, latitude, longitude });
    });
    if (!fittedRef.current && validSales.length && !center) {
      fittedRef.current = true;
      if (validSales.length === 1) mapRef.current.jumpTo({ center: [Number(validSales[0].lng), Number(validSales[0].lat)], zoom: 12 });
      else {
        const bounds = new mapboxgl.LngLatBounds();
        validSales.forEach(sale => bounds.extend([Number(sale.lng), Number(sale.lat)]));
        mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 12, duration: 0 });
      }
    }
  }, [loadedSales, navigate, onSelectSale, providedSales, userLocation, center, now]);

  useEffect(() => {
    markersRef.current.forEach(({ marker }, id) => {
      marker.getElement().classList.toggle("selected-yard-sale-marker", id === selectedSaleId);
    });

    const selected = markersRef.current.get(selectedSaleId);
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: [selected.longitude, selected.latitude], zoom: 13 });
      if (!selected.marker.getPopup().isOpen()) selected.marker.togglePopup();
    }
  }, [selectedSaleId, selectionRequest]);

  useEffect(() => {
    if (mapRef.current && center && hasValidCoordinates(center.latitude, center.longitude)) {
      mapRef.current.flyTo({ center: [Number(center.longitude), Number(center.latitude)], zoom: 12 });
    }
  }, [center]);

  return <div ref={mapContainer} className={`sale-map ${className}`.trim()} aria-label="Map of nearby yard sales" />;
}

export default SaleMap;
