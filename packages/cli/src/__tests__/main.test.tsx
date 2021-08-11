import chalk from 'chalk';
import { AutoComplete } from 'enquirer';

import { castToJestMock } from './test-utils';

import presets from '../presets';
import main from '../main';

jest.mock('enquirer', () => ({
  AutoComplete: jest.fn(),
}));

jest.mock('../presets', () => ({
  mockedPreset: jest.fn(),
}));

describe('main', () => {
  beforeEach(() => {
    jest.spyOn(global.console, 'log').mockImplementation();
    jest.spyOn(global.console, 'warn').mockImplementation();
  });

  afterEach(() => {
    castToJestMock(global.console.log).mockReset();
    castToJestMock(global.console.warn).mockReset();
    castToJestMock(AutoComplete).mockReset();
    castToJestMock(presets.mockedPreset).mockReset();
  });

  const setup = async (preset: string) => {
    const cli = {
      flags: {
        preset,
      },
      input: [],
      unnormalizedFlags: { preset },
      pkg: {},
      help: '',
      showHelp: jest.fn(),
      showVersion: jest.fn(),
    };

    await main(cli);

    return {
      cli,
    };
  };

  it('should warn when invalid preset is provided as cli input', async () => {
    const { cli } = await setup('invalid-using-cli');

    expect(AutoComplete).not.toHaveBeenCalledTimes(1);

    expect(global.console.warn).toHaveBeenCalledWith(
      chalk.red('"invalid-using-cli" is not a valid preset. Please specify a valid one.')
    );

    expect(cli.showHelp).toHaveBeenCalledWith(1);

    expect(presets.mockedPreset).not.toHaveBeenCalledWith(cli);
  });

  it('should warn when invalid preset is provided using prompt', async () => {
    castToJestMock(AutoComplete).mockImplementation(() => ({
      run: () => Promise.resolve('invalid-using-prompt'),
    }));

    const { cli } = await setup('');

    expect(AutoComplete).toHaveBeenCalledWith({
      message: 'Select which preset would you like to run? 🤔',
      limit: 18,
      choices: ['mockedPreset'],
    });

    expect(global.console.warn).toHaveBeenCalledWith(
      chalk.red('"invalid-using-prompt" is not a valid preset. Please specify a valid one.')
    );

    expect(cli.showHelp).toHaveBeenCalledWith(1);

    expect(presets.mockedPreset).not.toHaveBeenCalledWith(cli);
  });

  it('should execute valid present when provided as cli input', async () => {
    castToJestMock(presets.mockedPreset).mockImplementation(() => jest.fn());

    const { cli } = await setup('mockedPreset');

    expect(AutoComplete).not.toHaveBeenCalledTimes(1);

    expect(presets.mockedPreset).toHaveBeenCalledWith(cli);
  });

  it('should execute valid present when provided using prompt', async () => {
    castToJestMock(presets.mockedPreset).mockImplementation(() => jest.fn());

    castToJestMock(AutoComplete).mockImplementation(({ choices }) => ({
      run: () => Promise.resolve(choices[0]),
    }));

    const { cli } = await setup('');

    expect(AutoComplete).toHaveBeenCalledWith({
      message: 'Select which preset would you like to run? 🤔',
      limit: 18,
      choices: ['mockedPreset'],
    });

    expect(presets.mockedPreset).toHaveBeenCalledWith(cli);
  });

  it('should find codemods in node modules', () => {
    expect(() => {
      require('@compiled/codemods/dist/transforms/emotion-to-compiled');
      require('@compiled/codemods/dist/transforms/styled-components-to-compiled');
    }).not.toThrow();
  });
});
