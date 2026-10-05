export default function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="carregando" role="status">
      {texto}
    </div>
  );
}
