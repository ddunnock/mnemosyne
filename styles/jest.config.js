module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/*.(test|spec).+(ts|tsx|js)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.ts'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapping: {
        '\\.(css|less|scss)$': 'identity-obj-proxy'
    },
    testTimeout: 10000
};