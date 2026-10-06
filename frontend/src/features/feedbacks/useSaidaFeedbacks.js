import useEdicaoPendente from '../../hooks/useEdicaoPendente';

export default function useSaidaFeedbacks(pendente, executando) {
  useEdicaoPendente(pendente, executando, 'alterações de feedback');
}
