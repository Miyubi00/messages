import { Routes, Route, Navigate } from "react-router-dom";

// Halaman yang sudah ada
import PublicPage from "./pages/PublicPage";
import AdminPage from "./pages/AdminPage";

// Komponen dummy donasi baru (sesuaikan path folder-nya jika berbeda)
import DummyForm from "./pages/DummyForm"; 
import ObsOverlay from "./pages/ObsOverlay"; 

export default function App() {
  return (
    <Routes>
      {/* Rute project utama kamu */}
      <Route path="/" element={<PublicPage />} />
      <Route path="/admin" element={<AdminPage />} />

      {/* Rute baru untuk sistem dummy donasi */}
      <Route path="/dummy-form" element={<DummyForm />} />
      <Route path="/obs-overlay" element={<ObsOverlay />} />

      {/* Catch-all (jika user buka URL ngasal, lempar ke home) */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
