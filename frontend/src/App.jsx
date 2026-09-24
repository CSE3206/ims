/**
 * Route table. SHARED FILE — add your own routes and leave the rest alone.
 * Every route except /login sits behind <ProtectedRoute> inside <Layout>.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';


export default function App() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Evan — catalogue */}

        {/* Najmul — purchasing */}

        {/* Rukaiya — inventory & reporting */}

        {/* Evan — admin only */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
