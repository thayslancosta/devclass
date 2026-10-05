import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from './NotFoundPage';
import ProfessorLayout from '../components/layout/ProfessorLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LoginPage from '../features/auth/LoginPage';
import CadastroPage from '../features/auth/CadastroPage';
import MeusAlunosPage from '../features/alunos/MeusAlunosPage';
import AlunoPerfilPage from '../features/alunos/AlunoPerfilPage';
import TurmaAlunosTab from '../features/alunos/TurmaAlunosTab';
import AulasTab from '../features/aulas/AulasTab';
import AulaDetalhe from '../features/aulas/AulaDetalhe';
import TurmasPage from '../features/turmas/TurmasPage';
import TurmaPage, { TurmaTabPlaceholder } from '../features/turmas/TurmaPage';
import AdminUsersPage from '../features/admin/AdminUsersPage';

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
        <Route path="/turmas" element={<TurmasPage />} />
        <Route path="/turmas/:turmaId" element={<TurmaPage />}>
          <Route index element={<Navigate to="alunos" replace />} />
          <Route path="alunos" element={<TurmaAlunosTab />} />
          <Route path="aulas" element={<AulasTab />} />
          <Route path="aulas/:aulaId" element={<AulaDetalhe />} />
          <Route
            path="feedbacks"
            element={<TurmaTabPlaceholder titulo="Feedbacks da turma" descricao="Os feedbacks do semestre serão integrados na Fase 5." />}
          />
        </Route>
        <Route path="/alunos" element={<MeusAlunosPage />} />
        <Route path="/alunos/:alunoId" element={<AlunoPerfilPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute perfilExigido="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/usuarios" element={<AdminUsersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
