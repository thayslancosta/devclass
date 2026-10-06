import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import CamposRegistro from './CamposRegistro';
import MensagemDiaria from './MensagemDiaria';
import { HABILIDADES, DESEMPENHOS } from '../../utils/datas';
import { linhaAlterada, podeEditarLinha } from '../aulas/aulaEdicao';

export function ConteudoRegistro({ registro }) {
  return <div className="historico-registro">
    {registro.observacaoGeral && <p>{registro.observacaoGeral}</p>}
    {(registro.avaliacoes || []).map((a, i) => <p key={i}>
      <strong>{a.habilidade === 'outra' ? a.outraDescricao : HABILIDADES.find(([v]) => v === a.habilidade)?.[1]}</strong>
      {' · '}{DESEMPENHOS.find(([v]) => v === a.desempenho)?.[1]}{a.observacao ? ` · ${a.observacao}` : ''}
    </p>)}
  </div>;
}
export default function RegistroAluno({ edicao, linha, onChange, onConsultar, onResolver, onSituacao, onMensagemPendente, onMensagemSalva, bloqueado, mensagemPendente }) {
  const l = linha; const permite = podeEditarLinha(edicao, l);
  const semConsulta = !l.conhecido || l.carregando || Boolean(l.erroConsulta);
  const estado = l.carregando ? 'Carregando' : l.erro || l.erroConsulta || l.conflito ? 'Erro'
    : l.estado === 'Salvando' ? 'Salvando' : linhaAlterada(l) ? 'Alterações pendentes' : l.registro ? 'Salvo' : 'Vazio';
  return <article className="registro-aluno registro-edicao" aria-label={`Registro de ${l.aluno.nome}`}>
    <header className="registro-cab"><h3>{l.aluno.nome}</h3><span className="tag" role="status">{estado}</span></header>
    {l.matricula.status !== 'ativa' && <p>Matrícula encerrada — histórico preservado.</p>}
    {l.aluno.status !== 'ativo' && <p>Cadastro inativo.</p>}
    {l.erroConsulta && <><ErrorMessage texto={l.erroConsulta} /><Button onClick={onConsultar} disabled={bloqueado || l.carregando}>Tentar consulta novamente</Button></>}
    {l.erro && <ErrorMessage texto={l.erro} />}
    {!permite && <p className="aulas-aviso">Turma, aula, matrícula ou cadastro fora da situação ativa. Consulte os registros e as mensagens abaixo.</p>}
    {(permite || linhaAlterada(l)) && <CamposRegistro id={l.matricula.id} valor={l.rascunho} onChange={onChange} disabled={bloqueado || mensagemPendente || semConsulta || !permite || Boolean(l.conflito) || Boolean(l.incerto)} />}
    {!permite && l.registro && <ConteudoRegistro registro={l.registro} />}
    {l.conflito && <div className="aulas-aviso">
      <h4>Versão salva</h4>
      {l.conflito.remoto ? <ConteudoRegistro registro={l.conflito.remoto} /> : <p>Não há registro ativo disponível.</p>}
      <h4>Seu rascunho</h4><ConteudoRegistro registro={l.rascunho} />
      <div className="aulas-acoes">
        <Button disabled={bloqueado} variant="secundario" onClick={() => onResolver(false)}>Usar texto salvo</Button>
        <Button disabled={bloqueado || !permite} onClick={() => {
          if (window.confirm('Manter seu rascunho para substituir o texto salvo na próxima ação de salvar?')) onResolver(true);
        }}>Manter minha edição</Button>
      </div>
    </div>}
    {l.registro && <>
      <details className="registro-secundario"><summary>Mensagem diária{l.registro.mensagemEditada ? ' — texto salvo' : ''}</summary>
        <MensagemDiaria key={l.registro.id} registro={l.registro} onChanged={onMensagemSalva} onPending={onMensagemPendente}
          somenteLeitura={!permite} bloqueado={bloqueado || linhaAlterada(l) || Boolean(l.incerto) || Boolean(l.conflito)} />
      </details>
      <Button variant="perigo" disabled={bloqueado || mensagemPendente || linhaAlterada(l) || Boolean(l.incerto) || Boolean(l.conflito)} onClick={() => onSituacao(l.registro, true)}>Arquivar registro</Button>
    </>}
    {!!l.historicos.length && <details className="registro-secundario"><summary>Registros arquivados ({l.historicos.length})</summary>
      {l.historicos.map((r) => <section key={r.id}>
        <ConteudoRegistro registro={r} />
        {(r.mensagemEditada || r.mensagemIAOriginal) && <MensagemDiaria registro={r} somenteLeitura />}
        {!l.registro && permite && <Button variant="secundario" disabled={bloqueado || mensagemPendente || linhaAlterada(l)} onClick={() => onSituacao(r, false)}>Restaurar registro</Button>}
      </section>)}
    </details>}
  </article>;
}
