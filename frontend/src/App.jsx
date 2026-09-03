/**
 * Route table. SHARED FILE — add your own routes and leave the rest alone.
 * Every route except /login sits behind <ProtectedRoute> inside <Layout>.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Categories from './pages/Categories.jsx';
import Suppliers from './pages/Suppliers.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import StockMovements from './pages/StockMovements.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Evan — catalogue */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />

        {/* Najmul — purchasing */}
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />

        {/* Rukaiya — inventory & reporting */}
        <Route path="/sales-orders" element={<SalesOrders />} />
        <Route path="/stock" element={<StockMovements />} />
        <Route path="/reports" element={<Reports />} />

        {/* Evan — admin only */}
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
