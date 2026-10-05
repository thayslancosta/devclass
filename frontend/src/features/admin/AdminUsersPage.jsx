import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import Loading from '../../components/common/Loading';
import './admin.css';

export default function AdminUsersPage() {
  const { token, usuario } = useAuth();
  const [perfil, setPerfil] = useState('todos');
  const [situacao, setSituacao] = useState('todos');
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [alterando, setAlterando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro(null);
    adminService.listarUsuarios({
      token,
      perfil: perfil === 'todos' ? undefined : perfil,
      ativo: situacao === 'todos' ? undefined : situacao === 'ativo',
    }).then((lista) => {
      if (atual) setUsuarios(lista);
    }).catch((falha) => {
      if (atual) setErro(falha);
    }).finally(() => {
      if (atual) setCarregando(false);
    });
    return () => { atual = false; };
  }, [token, perfil, situacao]);

  async function salvarSituacao() {
    if (!alvo) return;
    setAlterando(true);
    setErro(null);
    setSucesso('');
    try {
      const atualizado = await adminService.alterarStatusUsuario({
        token,
        id: alvo.id,
        ativo: !alvo.ativo,
      });
      setUsuarios((lista) => {
        const correspondeSituacao = situacao === 'todos'
          || atualizado.ativo === (situacao === 'ativo');
        return correspondeSituacao
          ? lista.map((item) => item.id === atualizado.id ? atualizado : item)
          : lista.filter((item) => item.id !== atualizado.id);
      });
      setSucesso((atualizado.ativo ? 'Conta ativada: ' : 'Conta inativada: ') + atualizado.nome + '.');
      setAlvo(null);
    } catch (falha) {
      setErro(falha);
    } finally {
      setAlterando(false);
    }
  }

  return (
    <section className="pagina-admin">
      <header className="pagina-admin__topo">
        <div>
          <p className="sobretitulo">Administração</p>
          <h1>Contas de usuário</h1>
          <p className="texto-secundario">Consulte contas e altere a situação de acesso.</p>
        </div>
      </header>

      <div className="admin-filtros">
        <Field id="filtro-perfil" label="Perfil" as="select" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
          <option value="todos">Todos os perfis</option>
          <option value="professor">Professor</option>
          <option value="admin">Admin</option>
        </Field>
        <Field id="filtro-situacao" label="Situação" as="select" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
          <option value="todos">Todas</option>
          <option value="ativo">Ativas</option>
          <option value="inativo">Inativas</option>
        </Field>
      </div>

      {erro && <ErrorMessage erro={erro} />}
      {sucesso && <p className="admin-sucesso" role="status">{sucesso}</p>}
      {carregando && <Loading texto="Carregando contas..." />}
      {!carregando && !erro && usuarios.length === 0 && (
        <EmptyState
          titulo="Nenhuma conta encontrada"
          descricao="Tente mudar os filtros para consultar outras contas."
        />
      )}

      {!carregando && usuarios.length > 0 && (
        <div className="admin-tabela-wrap">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Email</th>
                <th scope="col">Perfil</th>
                <th scope="col">Situação</th>
                <th scope="col"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((conta) => {
                const propriaConta = conta.id === usuario?.id;
                return (
                  <tr key={conta.id}>
                    <td data-label="Nome">{conta.nome || '—'}{propriaConta ? ' (você)' : ''}</td>
                    <td data-label="Email">{conta.email}</td>
                    <td data-label="Perfil">{conta.perfil === 'admin' ? 'Admin' : 'Professor'}</td>
                    <td data-label="Situação">
                      <span className={'situacao-pill ' + (conta.ativo ? 'situacao-pill--ativa' : 'situacao-pill--encerrada')}>
                        {conta.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="admin-tabela__acao" data-label="Ação">
                      <Button
                        variant={conta.ativo ? 'perigo' : 'secundario'}
                        disabled={propriaConta || alterando}
                        title={propriaConta ? 'Sua própria conta não pode ser alterada aqui.' : undefined}
                        onClick={() => { setSucesso(''); setAlvo(conta); }}
                      >
                        {propriaConta ? 'Sua conta' : conta.ativo ? 'Inativar' : 'Ativar'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(alvo)}
        titulo={alvo?.ativo ? 'Inativar esta conta?' : 'Ativar esta conta?'}
        descricao={alvo?.ativo
          ? 'A conta perderá acesso no próximo login e as sessões atuais serão recusadas pelo backend.'
          : 'A conta poderá entrar novamente com as credenciais existentes.'}
        textoConfirmar={alvo?.ativo ? 'Inativar conta' : 'Ativar conta'}
        variantConfirmar={alvo?.ativo ? 'perigo' : 'primario'}
        busy={alterando}
        onCancelar={() => setAlvo(null)}
        onConfirmar={salvarSituacao}
      />
    </section>
  );
}
