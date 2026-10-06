import Button from '../../components/common/Button';
import { HABILIDADES, DESEMPENHOS } from '../../utils/datas';

export default function CamposRegistro({ id, valor, onChange, disabled = false }) {
  function alterar(indice, campo, conteudo) {
    onChange({ ...valor, avaliacoes: valor.avaliacoes.map((a, i) => i === indice ? { ...a, [campo]: conteudo } : a) });
  }
  return <div className="campos-registro">
    <label htmlFor={`observacao-${id}`}>Como foi nesta aula?</label>
    <textarea id={`observacao-${id}`} rows={3} value={valor.observacaoGeral} disabled={disabled}
      onChange={(e) => onChange({ ...valor, observacaoGeral: e.target.value })} />
    <details><summary>Adicionar avaliação por habilidade{valor.avaliacoes.length ? ` (${valor.avaliacoes.length})` : ''}</summary>
      {valor.avaliacoes.map((a, indice) => <fieldset className="avaliacao" key={indice} disabled={disabled}>
        <legend>Avaliação {indice + 1}</legend>
        <label htmlFor={`habilidade-${id}-${indice}`}>Habilidade</label>
        <select id={`habilidade-${id}-${indice}`} value={a.habilidade} onChange={(e) => alterar(indice, 'habilidade', e.target.value)}>
          {HABILIDADES.map(([v, titulo]) => <option key={v} value={v}>{titulo}</option>)}
        </select>
        <label htmlFor={`desempenho-${id}-${indice}`}>Desempenho</label>
        <select id={`desempenho-${id}-${indice}`} value={a.desempenho} onChange={(e) => alterar(indice, 'desempenho', e.target.value)}>
          {DESEMPENHOS.map(([v, titulo]) => <option key={v} value={v}>{titulo}</option>)}
        </select>
        {a.habilidade === 'outra' && <><label htmlFor={`outra-${id}-${indice}`}>Qual habilidade?</label><input id={`outra-${id}-${indice}`} value={a.outraDescricao || ''} onChange={(e) => alterar(indice, 'outraDescricao', e.target.value)} /></>}
        <label htmlFor={`avaliacao-obs-${id}-${indice}`}>Observação da avaliação (opcional)</label>
        <input id={`avaliacao-obs-${id}-${indice}`} value={a.observacao || ''} onChange={(e) => alterar(indice, 'observacao', e.target.value)} />
        <Button variant="secundario" disabled={disabled} onClick={() => onChange({ ...valor, avaliacoes: valor.avaliacoes.filter((_, i) => i !== indice) })}>Remover avaliação</Button>
      </fieldset>)}
      <Button variant="secundario" disabled={disabled} onClick={() => onChange({ ...valor, avaliacoes: [...valor.avaliacoes, { habilidade: 'speaking', desempenho: 'adequado', observacao: '', outraDescricao: '' }] })}>Adicionar habilidade</Button>
    </details>
  </div>;
}
