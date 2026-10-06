import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { EDITAR_MENSAGEM, GERAR_MENSAGEM } from '../../graphql/registros';
import { fmtTimestamp, infoErro } from '../../utils/datas';

export default function MensagemDiaria({ registro, onChanged, onPending, somenteLeitura = false, bloqueado = false }) {
  const inicial = registro.mensagemEditada ?? registro.mensagemIAOriginal ?? '';
  const [texto, setTexto] = useState(inicial);
  const [original, setOriginal] = useState(registro.mensagemIAOriginal || '');
  const [geradaEm, setGeradaEm] = useState(registro.geradaEm);
  const [salvo, setSalvo] = useState(inicial);
  const [info, setInfo] = useState('');
  const [erro, setErro] = useState('');
  const [gerar, geracao] = useMutation(GERAR_MENSAGEM);
  const [editar, edicao] = useMutation(EDITAR_MENSAGEM);
  const sujo = texto !== salvo;
  const trava = useRef(false);
  const campo = useRef(null);
  const busy = geracao.loading || edicao.loading;
  useEffect(() => { onPending?.(registro.id, sujo, busy); }, [onPending, registro.id, sujo, busy]);
  useEffect(() => () => { onPending?.(registro.id, false, false); }, [onPending, registro.id]);

  function aplicarRegistro(atualizado) {
    const mensagem = atualizado.mensagemEditada ?? atualizado.mensagemIAOriginal ?? '';
    setTexto(mensagem);
    setSalvo(mensagem);
    setOriginal(atualizado.mensagemIAOriginal || '');
    setGeradaEm(atualizado.geradaEm);
  }

  async function gerarMensagem() {
    if (trava.current || bloqueado || somenteLeitura) return;
    if (texto && !window.confirm('Regenerar substituirá também o texto editado. Continuar?')) return;
    trava.current = true;
    setErro('');
    setInfo('');
    try {
      const resultado = await gerar({ variables: { id: registro.id } });
      aplicarRegistro(resultado.data.gerarMensagemDiaria);
      await onChanged?.(resultado.data.gerarMensagemDiaria);
    } catch (falha) {
      const { code, msg } = infoErro(falha);
      const mensagem = code === 'IA_NOT_CONFIGURED'
        ? 'Geração por IA indisponível. Você ainda pode escrever a mensagem manualmente.'
        : code === 'IA_UNAVAILABLE'
          ? 'A IA está indisponível. Tente novamente mais tarde.'
          : msg;
      setErro(mensagem);
    } finally { trava.current = false; }
  }

  async function salvarMensagem() {
    if (trava.current || bloqueado || somenteLeitura || !sujo) return;
    trava.current = true;
    setErro('');
    setInfo('');
    try {
      const resultado = await editar({ variables: { id: registro.id, texto } });
      aplicarRegistro(resultado.data.editarMensagemDiaria);
      setInfo('Mensagem salva.');
      await onChanged?.(resultado.data.editarMensagemDiaria);
    } catch (falha) {
      setErro(infoErro(falha).msg);
    } finally { trava.current = false; }
  }

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(texto);
      setInfo(sujo ? 'Copiado; há alterações ainda não salvas.' : 'Copiado.');
    } catch {
      campo.current?.focus(); campo.current?.select();
      setInfo('Texto selecionado. Use Ctrl+C ou ⌘C, ou o menu Copiar.');
    }
  }

  return (
    <section className="mensagem-diaria" aria-label="Mensagem diária">
      <h4>Mensagem diária</h4>
      {!somenteLeitura && (
        <Button onClick={gerarMensagem} busy={geracao.loading} disabled={bloqueado || busy}>
          {texto ? 'Regenerar mensagem' : 'Gerar mensagem'}
        </Button>
      )}
      {(texto || original) && (
        <>
          {geradaEm && <small>Gerada em {fmtTimestamp(geradaEm)}</small>}
          <label htmlFor={`mensagem-${registro.id}`}>{somenteLeitura ? 'Mensagem diária' : 'Texto editável'}
            <textarea ref={campo} id={`mensagem-${registro.id}`} rows={6} value={texto} readOnly={somenteLeitura || bloqueado || busy} onChange={(evento) => { setTexto(evento.target.value); setInfo(''); }} />
          </label>
          <div className="aulas-acoes">
            {!somenteLeitura && <Button onClick={salvarMensagem} busy={edicao.loading} disabled={bloqueado || busy || !sujo || !texto.trim()}>Salvar revisão</Button>}
            <Button variant="secundario" onClick={copiarMensagem}>Copiar</Button>
          </div>
          {original && <details><summary>Texto original da IA</summary><p>{original}</p></details>}
        </>
      )}
      {erro && <ErrorMessage texto={erro} />}
      {info && <p className="aulas-ok" role="status">{info}</p>}
    </section>
  );
}