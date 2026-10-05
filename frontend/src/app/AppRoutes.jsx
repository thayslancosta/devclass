import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from './NotFoundPage';
import ProfessorLayout from '../components/layout/ProfessorLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LoginPage from '../features/auth/LoginPage';
import CadastroPage from '../features/auth/CadastroPage';
import MeusAlunosPage from '../features/alunos/MeusAlunosPage';
import TurmasPlaceholder from '../features/turmas/TurmasPlaceholder';
import AdminPlaceholder from '../features/admin/AdminPlaceholder';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route
        element={
          <ProtectedRoute perfilExigido="professor">
            <ProfessorLayout />
          </ProtectedRoute>
        }
      >
        {/*
          PROVISÓRIO: /turmas e as rotas aninhadas de turma (/turmas/:turmaId,
          .../alunos, .../aulas, .../feedbacks) serão criadas pela Fase 2
          (João), que troca TurmasPlaceholder pelo dashboard real com Outlet
          para as abas da turma.
        */}
        <Route path="/turmas" element={<TurmasPlaceholder />} />
        <Route path="/alunos" element={<MeusAlunosPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute perfilExigido="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* PROVISÓRIO: substituído pela Fase 2 (João) pela listagem real. */}
        <Route path="/admin/usuarios" element={<AdminPlaceholder />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
