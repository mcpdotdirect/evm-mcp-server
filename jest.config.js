/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "NodeNext"
        }
      }
    ]
  },
  injectGlobals: true,
  transformIgnorePatterns: [
    "node_modules/(?!(viem|zod|@modelcontextprotocol)/)"
  ]
};