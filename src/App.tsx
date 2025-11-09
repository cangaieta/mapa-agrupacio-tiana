import { Routes, Route } from 'react-router-dom'
import MapViewer from './pages/MapViewer'
import MapEditor from './pages/MapEditor'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapViewer />} />
      <Route path="/edit" element={<MapEditor />} />
    </Routes>
  )
}

export default App
