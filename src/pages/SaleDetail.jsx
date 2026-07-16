import { useParams } from 'react-router-dom'

function SaleDetail() {
  const { id } = useParams()

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Sale Detail</h1>
      <p>Showing details for sale ID: {id}</p>
    </div>
  )
}

export default SaleDetail