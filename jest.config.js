module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    //roots: [process.cwd()],
    roots: ['<rootDir>/authService/authHandler/src', '<rootDir>/authService/authHandler/src/tests'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
