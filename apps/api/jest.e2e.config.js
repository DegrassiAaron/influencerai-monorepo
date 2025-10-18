// Configure ts-node BEFORE requiring it
process.env.TS_NODE_PROJECT = require('path').join(__dirname, 'tsconfig.jest.json');
require('ts-node/register/transpile-only');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      require.resolve('ts-jest'),
      {
        diagnostics: false,
        tsconfig: './tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@influencerai/core-schemas$': '<rootDir>/../../packages/core-schemas/src',
  },
  collectCoverageFrom: ['test/**/*.(t|j)s'],
  coverageDirectory: './coverage-e2e',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  globalSetup: '<rootDir>/test/global-setup-e2e.js',
  globalTeardown: '<rootDir>/test/global-teardown-e2e.js',
};
