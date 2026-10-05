import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from './NotFoundPage';
import ProfessorLayout from '../components/layout/ProfessorLayout';
import AdminLayout from '../components/layout/AdminLayout';
import LoginPage from '../features/auth/LoginPage';
import CadastroPage from '../features/auth/CadastroPage';
import MeusAlunosPage from '../features/alunos/MeusAlunosPage';
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
          <Route
            path="alunos"
            element={<TurmaTabPlaceholder titulo="Alunos da turma" descricao="A lista de alunos e matrículas será integrada na Fase 3." />}
          />
          <Route
            path="aulas"
            element={<TurmaTabPlaceholder titulo="Aulas da turma" descricao="O planejamento e o histórico de aulas serão integrados na Fase 4." />}
          />
          <Route
            path="feedbacks"
            element={<TurmaTabPlaceholder titulo="Feedbacks da turma" descricao="Os feedbacks do semestre serão integrados na Fase 5." />}
          />
        </Route>
        <Route path="/alunos" element={<MeusAlunosPage />} />
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
