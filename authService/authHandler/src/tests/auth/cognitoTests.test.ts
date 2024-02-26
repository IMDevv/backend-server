// import { cognitoService, signUpDetails, validCodes} from "../../services/cognito";
// import {randomBytes} from "crypto";
// import {
//     AdminAddUserToGroupCommand,
//     AdminAddUserToGroupCommandOutput,
//     SignUpCommandOutput
// } from "@aws-sdk/client-cognito-identity-provider";
// import { mock } from "bun:test";


// const enforcePasswordPolicy = (password: string): string  => {
//     const uppercaseCharacter = randomBytes(1).toString('hex').toUpperCase();
//     const passwordWithUppercase = password.slice(0, -1) + uppercaseCharacter;
//     return passwordWithUppercase + 'G#';
// }

// jest.mock('@aws-sdk/client-cognito-identity-provider');
// //const delayAndLogSpy = jest.spyOn(global, 'delayAndLog'); => Spying on a method not a method in a class

// describe('Cognito Auth Class', () => {

//     let cognitoAuth: typeof cognitoService;

//     beforeAll(() => {
//         cognitoAuth = cognitoService;
//         return cognitoAuth;
//     });

//     beforeEach(() => {
//         jest.clearAllMocks();
//     });

//     describe("Test Signup Function", () => {

//         const signUpCommandMockResult = {
//             CodeDeliveryDetails: {
//                 AttributeName: 'email',
//                 DeliveryMedium: 'EMAIL',
//                 Destination: 'iantester@gmail.com',
//             },
//             UserConfirmed: false,
//             UserSub: 'mockedUserSub',
//         };

//         test('throws error for missing username or password', async () => {
//             const invalidData = [
//                 { username: '', password: 'Robert9AG#' },
//                 { username: 'validUsername', password: '' },
//             ];

//             for (const data of invalidData) {
//                 expect.assertions(1);
//                 try {
//                     await cognitoAuth.signup(<signUpDetails>data, jest.fn());
//                 } catch (error: any) {
//                     console.log("Error Assertion", error)
//                     expect(error.code).toBe(validCodes.INVALID_REQUEST);
//                 }
//             }
//         });

//         test("Is function", () => {
//             expect(typeof cognitoAuth.signup).toBe("function");
//         })

//         test("Handle Cognito Signup and Add Group Outputs", () => {

//             const mockSignUpResponse: SignUpCommandOutput = {
//                 $metadata: {
//                     requestId: expect.any(String),
//                     httpStatusCode: 200
//                 },
//                 UserConfirmed: expect.any(Boolean),
//                 CodeDeliveryDetails: {
//                     Destination: expect.any(String),
//                     DeliveryMedium: 'EMAIL',
//                     AttributeName: expect.any(String),
//                 },
//                 UserSub: expect.any(String)
//             };

//             jest.spyOn(cognitoService.cognitoClient, 'send').mockResolvedValueOnce(mockSignUpResponse as never);

//             const mockAddToGroupResponse: AdminAddUserToGroupCommandOutput = {
//                 $metadata: {
//                     requestId: expect.any(String),
//                     httpStatusCode: 200,
//                 }
//             };
//             jest.spyOn(cognitoService.cognitoClient, 'send').mockResolvedValueOnce(mockAddToGroupResponse as never);

//         })

//         test('should handle signup successfully', async () => {

//             const signupSpy = jest.spyOn(cognitoAuth, "signup");
//             const signupParams = {
//                 username: "Roberto",
//                 name: "Ian Tester",
//                 email: "iantester@gmail.com",
//                 phone: "+254789494939",
//             } as signUpDetails;

//             signupParams.password = enforcePasswordPolicy(signupParams.username);
//             signupParams.confirmPassword = signupParams.password



//             const result = await cognitoAuth.signup(signupParams);
//             const expectedResponse = {
//                 code: validCodes.SUCCESS,
//                 message: 'Successful Registered',
//                 data: signUpCommandMockResult,
//             };
//             expect(signupSpy).toHaveBeenCalledWith(signupParams);
//             expect(result).toMatchObject(expectedResponse);
//             signupSpy.mockClear();
//         });
//     })

// });