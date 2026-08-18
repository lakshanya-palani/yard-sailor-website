import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "../lib/supabase";
import { calculateDistanceMiles, getPublicLocation, hasValidCoordinates, requestUserLocation } from "../utils/location";
import "./SaleMap.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function SaleMap({
  sales: providedSales,
  selectedSaleId = null,
  onSelectSale,
  center = null,
  className = "",
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const navigate = useNavigate();
  const [loadedSales, setLoadedSales] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (providedSales !== undefined) return undefined;

    async function fetchSales() {
      const { data, error } = await supabase
        .from("sales")
        .select("id, title, description, address, lat, lng, images, start_time, status")
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
    requestUserLocation().then(setUserLocation);
  }, []);

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

    const sales = providedSales ?? loadedSales;

    const validSales = sales.filter((sale) =>
      hasValidCoordinates(sale.lat, sale.lng)
    );

    validSales.forEach((sale) => {
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
        status.textContent = sale.status.charAt(0).toUpperCase() + sale.status.slice(1);
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

      const marker = new mapboxgl.Marker({ color: "#ef403a" })
        // Mapbox always expects longitude first, then latitude.
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent))
        .addTo(mapRef.current);
      marker.getElement().addEventListener("click", () => onSelectSale?.(sale.id));
      markersRef.current.set(sale.id, { marker, latitude, longitude });
    });
  }, [loadedSales, navigate, onSelectSale, providedSales, userLocation]);

  useEffect(() => {
    markersRef.current.forEach(({ marker }, id) => {
      marker.getElement().classList.toggle("selected-yard-sale-marker", id === selectedSaleId);
    });

    const selected = markersRef.current.get(selectedSaleId);
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: [selected.longitude, selected.latitude], zoom: 14 });
      if (!selected.marker.getPopup().isOpen()) selected.marker.togglePopup();
    }
  }, [selectedSaleId]);

  useEffect(() => {
    if (mapRef.current && center && hasValidCoordinates(center.latitude, center.longitude)) {
      mapRef.current.flyTo({ center: [Number(center.longitude), Number(center.latitude)], zoom: 12 });
    }
  }, [center]);

  return <div ref={mapContainer} className={`sale-map ${className}`.trim()} aria-label="Map of nearby yard sales" />;
}

export default SaleMap;
