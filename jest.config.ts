import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  extensionsToTreatAsEsm: ['.ts'],
//  transform: {
//    "\\.jsx?$": "babel-jest",
//    "\\.tsx?$": ["ts-jest", {useESM: true}],
//  },
}

export default jestConfig