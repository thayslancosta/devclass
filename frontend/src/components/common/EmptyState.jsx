export default function EmptyState({ titulo, descricao, acao }) {
  return (
    <div className="estado-vazio">
      <p style={{ margin: 0, fontWeight: 500, color: 'var(--cor-texto)' }}>{titulo}</p>
      {descricao && <p style={{ margin: '4px 0 0' }}>{descricao}</p>}
      {acao && <div style={{ marginTop: 'var(--espaco-3)' }}>{acao}</div>}
    </div>
  );
}
