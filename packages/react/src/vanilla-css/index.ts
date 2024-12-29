import type cssMap from '../css-map';
import { createSetupError } from '../utils/error';

type CssMapOutput = ReturnType<typeof cssMap>;

const vanillaCss = (
  _classNames: (CssMapOutput[keyof CssMapOutput] | false | undefined | null)[]
): string | undefined => {
  throw createSetupError();
};

export default vanillaCss;
