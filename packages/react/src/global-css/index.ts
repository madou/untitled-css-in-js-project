import { createSetupError } from '../utils/error';

export default function globalCss(_styles: string[]): void {
  throw createSetupError();
}
