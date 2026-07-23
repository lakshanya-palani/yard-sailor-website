import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '../lib/supabase'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

function Home() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [sales, setSales] = useState([])

  // Fetch sales from Supabase once on load
  useEffect(() => {
    async function fetchSales() {
      const { data, error } = await supabase
        .from('sales')
        .select('id, title, lat, lng')

      if (error) {
        console.error('Error fetching sales:', error)
      } else {
        setSales(data)
      }
    }

    fetchSales()
  }, [])

  // Set up the map once
  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.0308, 36.9741],
      zoom: 12
    })

    return () => mapRef.current.remove()
  }, [])

  // Add pins whenever sales data changes
  useEffect(() => {
    if (!mapRef.current || sales.length === 0) return

    sales.forEach((sale) => {
      // location comes back from Supabase as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
      const coords = sale.location?.coordinates
      if (!sale.lat || !sale.lng) return

      new mapboxgl.Marker()
        .setLngLat([sale.lng, sale.lat])
        .setPopup(new mapboxgl.Popup().setText(sale.title))
        .addTo(mapRef.current)
    })
  }, [sales])

  return (
    <div>
      <h1 style={{ padding: '1rem', fontFamily: 'sans-serif' }}>Yard Sailor</h1>
      <div ref={mapContainer} style={{ width: '100%', height: '500px' }} />
    </div>
  )
}

export default Home