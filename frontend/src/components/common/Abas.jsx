export default function Abas({ id, label, itens, atual, onChange, disabled = false }) {
  function teclado(evento, indice) {
    const proximo = evento.key === 'ArrowRight' ? (indice + 1) % itens.length
      : evento.key === 'ArrowLeft' ? (indice + itens.length - 1) % itens.length
        : evento.key === 'Home' ? 0 : evento.key === 'End' ? itens.length - 1 : null;
    if (proximo === null) return;
    evento.preventDefault();
    evento.currentTarget.parentElement.children[proximo]?.focus();
  }
  return <div className="abas-simples" role="tablist" aria-label={label}>
    {itens.map(([valor, titulo], indice) => <button key={valor} id={`${id}-${valor}`} type="button" role="tab"
      aria-selected={atual === valor} aria-controls={`${id}-painel`} tabIndex={atual === valor ? 0 : -1}
      disabled={disabled} onKeyDown={(e) => teclado(e, indice)} onClick={() => onChange(valor)}>{titulo}</button>)}
  </div>;
}
