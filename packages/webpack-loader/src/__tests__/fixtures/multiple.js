import { styled } from '@compiled/react';
import { blueviolet, blue, orange, purple, red, yellow } from './imports/colors';
// ↓↓↓ This should not have their styles extracted ↓↓↓
import { Orange } from './imports/css-prop';

export const Blue = styled.span`
  @media screen {
    color: red;
  }

  color: ${blueviolet};

  :focus {
    color: ${purple};
  }

  :hover {
    color: ${blue};
  }
`;

export const Red = styled.span`
  color: ${red};

  :hover {
    color: ${yellow};
  }

  :focus {
    color: ${orange};
  }
`;
