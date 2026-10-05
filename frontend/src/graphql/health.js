import { gql } from '@apollo/client';

export const HEALTH = gql`
  query Health {
    health
  }
`;
