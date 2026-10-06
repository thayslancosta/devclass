import { useRef, useState } from 'react';
import Button from '../../components/common/Button';
import { fmtTimestamp } from '../../utils/datas';

export default function FeedbackEditor({ feedback, alunoNome, texto, sujo, bloqueado, onTexto, onSalvar, onAcao, onGerar }) {
  const campo = useRef(null);
  const [info, setInfo] = useState('');
  const arquivado = feedback.status === 'arquivado';
  const enviado = feedback.statusEnvio === 'enviado';
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setInfo(sujo ? 'Copiado. Há alterações locais ainda não salvas; o envio não foi marcado.' : 'Copiado. O envio não foi marcado.');
    } catch {
      campo.current?.focus();
      campo.current?.select();
      setInfo('Texto selecionado. Use Ctrl+C ou ⌘C, ou o menu Copiar do dispositivo.');
    }
  }
  return (
    <div className="feedback-editor">
      <h4>Feedback {feedback.tipo}{alunoNome ? ` — ${alunoNome}` : ''}</h4>
      <label htmlFor={`texto-${feedback.id}`}>Texto para revisão</label>
      <textarea ref={campo} id={`texto-${feedback.id}`} rows={9} value={texto}
        readOnly={bloqueado || arquivado || enviado}
        onChange={(evento) => { setInfo(''); onTexto(evento.target.value); }} />
      {sujo && <p role="status">Alterações locais não salvas. Salve antes de marcar envio.</p>}
      {enviado && <p>Desmarque o envio antes de editar ou regenerar.</p>}
      {arquivado && <p>Restaure o feedback antes de editar ou alterar o envio.</p>}
      <div className="feedback-acoes">
        {!arquivado && !enviado && <Button disabled={bloqueado || !sujo || !texto.trim()} onClick={onSalvar}>Salvar alterações</Button>}
        <Button variant="secundario" onClick={copiar}>Copiar texto</Button>
        {!arquivado && <Button variant="secundario" disabled={bloqueado || (!enviado && sujo)} onClick={() => onAcao(enviado ? 'desmarcar' : 'marcar')}>
          {enviado ? 'Desmarcar envio' : 'Marcar como enviado'}
        </Button>}
        {!arquivado && !enviado && <Button variant="secundario" disabled={bloqueado} onClick={onGerar}>Regenerar com IA</Button>}
        <Button variant={arquivado ? 'secundario' : 'perigo'} disabled={bloqueado || sujo} onClick={() => onAcao(arquivado ? 'restaurar' : 'arquivar')}>
          {arquivado ? 'Restaurar' : 'Arquivar'}
        </Button>
        {sujo && <Button variant="secundario" disabled={bloqueado} onClick={() => {
          if (window.confirm('Descartar as alterações locais deste feedback?')) onTexto(null);
        }}>Descartar alterações</Button>}
      </div>
      {info && <p role="status">{info}</p>}
      {feedback.geradoEm && <p className="feedback-meta">Gerado em {fmtTimestamp(feedback.geradoEm)}</p>}
      {feedback.enviadoEm && <p className="feedback-meta">Envio confirmado em {fmtTimestamp(feedback.enviadoEm)}</p>}
      {feedback.textoIAOriginal && <details><summary>Ver texto original</summary><p className="feedback-original">{feedback.textoIAOriginal}</p></details>}
    </div>
  );
}
