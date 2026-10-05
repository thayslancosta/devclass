import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PeriodoProvider } from './contexts/PeriodoContext';
import AppRoutes from './app/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PeriodoProvider>
          <AppRoutes />
        </PeriodoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
