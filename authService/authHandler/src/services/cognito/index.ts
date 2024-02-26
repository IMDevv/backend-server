import {
  AdminAddUserToGroupCommand,
  AdminAddUserToGroupCommandOutput,
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  AdminCreateUserCommandOutput,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  AdminSetUserMFAPreferenceCommand,
  AdminSetUserMFAPreferenceCommandInput,
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandInput,
  AliasExistsException,
  AssociateSoftwareTokenCommand,
  AssociateSoftwareTokenCommandInput,
  AssociateSoftwareTokenCommandOutput,
  ChallengeNameType,
  CodeDeliveryFailureException,
  CodeMismatchException,
  CognitoIdentityProviderClient,
  ConcurrentModificationException,
  ConfirmForgotPasswordCommand,
  ConfirmForgotPasswordCommandInput,
  ConfirmForgotPasswordCommandOutput,
  ConfirmSignUpCommand,
  ConfirmSignUpCommandInput,
  ExpiredCodeException,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  GlobalSignOutCommandInput,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
  InitiateAuthRequest,
  InvalidPasswordException,
  NotAuthorizedException,
  PasswordResetRequiredException,
  RespondToAuthChallengeCommand,
  ChallengeResponseType,
  SignUpCommand,
  SignUpRequest,
  UserNotFoundException,
  VerifySoftwareTokenCommand,
  VerifySoftwareTokenCommandInput,
  RespondToAuthChallengeCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto, { randomBytes } from "crypto";
import getSecret from "../../utils/getSecrets";
import { AWSError, CustomErrorHandler } from "../../Transformers/errorClass";
import {
  CustomResponseHandler,
  responseData,
} from "../../Transformers/successResponse";
import redisClientInstance from "../../redis/redisServer";

export interface loginDetails {
  username: string;
  password: string;
}

type userAttributes = {
  username: string;
  phone: string;
  name: string;
  email: string;
};

type updateAdminUser = Partial<userAttributes> &
  Pick<userAttributes, "username">;

type confirmationParams = {
  username: string;
  verificationCode: string;
};

export enum validCodes {
  SUCCESS = "SUCCESS",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  NOT_FOUND = "NOT_FOUND",
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  PASSWORD_RESET = "PASSWORD_RESET",
}

export enum validErrorName {
  MISSING_PARAMS = "Missing Parameters",
  INVALID_PARAMS = "Invalid Parameters",
  USER_EXISTS = "User exists",
}

export interface res {
  result: {
    code: string;
    message: string;
    data?: {
      [key: string]: any;
    };
  };
}

export interface signUpDetails {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  mfaEnabled?: boolean;
  confirmPassword: string;
}

interface oAuthType {
  authType?: "LOGIN" | "REGISTER";
  email_verified?: boolean;
}

type oAuth = Pick<signUpDetails, "username"> &
  Partial<signUpDetails> &
  oAuthType;

let response: responseData = {
  code: validCodes.SYSTEM_ERROR,
  message: "An error has occurred",
};

class CognitoService {
  private config = {
    region: process.env.AWS_REGION ?? "eu-west-1",
  };
  private errorObject: AWSError | undefined;
  private userPoolId: string | undefined;
  private clientId: string | undefined;
  private secretHash: string | undefined;
  private tenantId: string | undefined;
  private cognitoIdentity!: CognitoIdentityProviderClient;
  private static instance: CognitoService;

  private constructor() {
    this.initialize().catch((e) => console.log(e));
  }

  public static getInstance(): CognitoService {
    if (!CognitoService.instance) {
      CognitoService.instance = new CognitoService();
    }
    return CognitoService.instance;
  }

  private async initialize(): Promise<CognitoService | void> {
    try {
      if (
        !this.userPoolId ||
        !this.clientId ||
        !this.secretHash ||
        !this.tenantId
      ) {
        console.log("Getting pool details.....");
        const { userPoolID, clientId, secretHash, tenantId }: any =
          await getSecret();
        console.log(secretHash);

        if (!userPoolID || !clientId || !secretHash || !tenantId) {
          this.errorObject = {
            code: validCodes.INVALID_REQUEST,
            name: "Invalid Values",
            message: "Missing Values from Secrets Manager",
            stack: `Missing Values from Secrets Manager, ${clientId}`,
          };
          CustomErrorHandler.handleAndThrowError(this.errorObject);
        }
        this.cognitoIdentity = new CognitoIdentityProviderClient(this.config);
        this.userPoolId = userPoolID;
        this.clientId = clientId;
        this.secretHash = secretHash;
        this.tenantId = tenantId;
      }
      return this;
    } catch (error) {
      console.error("Error initializing CognitoService:", error);
      CustomErrorHandler.handleAndThrowError(error);
    }
  }

  get ClientId(): string {
    return <string>this.clientId;
  }

  get UserPoolId(): string {
    return <string>this.userPoolId;
  }

  get tenant(): string {
    return <string>this.tenantId;
  }

  get secret(): string {
    return <string>this.secretHash;
  }

  get cognitoClient() {
    return this.cognitoIdentity;
  }

  private async validateAndThrowError(...values: any) {
    if (values.some((value: any) => !value)) {
      return true;
    } else {
      const message = "Missing Parameter Values";
      this.errorObject = {
        code: validCodes.INVALID_REQUEST,
        name: "Invalid Values",
        message: message,
        stack: message,
      };
      CustomErrorHandler.handleAndThrowError(this.errorObject);
    }
  }

  private async initiateAuth(username: string, password: string) {
    let authResult;

    const authenticate = async () => {
      const input: InitiateAuthCommandInput = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: this.hashSecret(username),
        },
      };
      const authCommand = new InitiateAuthCommand(input);
      const {
        ChallengeName,
        ChallengeParameters,
        AuthenticationResult,
        Session,
      } = await this.cognitoIdentity.send(authCommand);

      console.log("Initiate Auth", AuthenticationResult);
      if (ChallengeName === "NEW_PASSWORD_REQUIRED") {
        const params = {
          session: Session as string,
          newPassword: password,
          username,
        };
        console.log("Executing New Password Challenge");
        authResult = await this.newPasswordChallenge(params);
      } else {
        authResult = AuthenticationResult;
      }

      console.log("Oauth result: " + authResult)

      return authResult;
    };

    return await authenticate();
  }

  public async newPasswordChallenge({
    session,
    newPassword,
    username,
  }: {
    session: string;
    newPassword: string;
    username: string;
  }) {
    try {
      let challengeName = "NEW_PASSWORD_REQUIRED";

      const input: RespondToAuthChallengeCommandInput = {
        ChallengeName: <ChallengeNameType>challengeName,
        ClientId: this.clientId,
        ChallengeResponses: {
          NEW_PASSWORD: newPassword,
          USERNAME: username,
          SECRET_HASH: this.hashSecret(username),
        },
        Session: session,
      };

      console.log("New Password Params", input);

      const command = new RespondToAuthChallengeCommand(input);
      const res = await this.cognitoIdentity.send(command);

      return res.AuthenticationResult;
    } catch (e: any) {
      e.code = validCodes.INVALID_REQUEST;
      CustomErrorHandler.handleAndThrowError(e);
    }
  }

  private generatePlaceholderPassword(username: string): string {
    return username + "G#!l";
  }

  private enforcePasswordPolicy(password: string): string {
    const uppercaseCharacter = randomBytes(1).toString("hex").toUpperCase();
    const passwordWithUppercase = password.slice(0, -1) + uppercaseCharacter;
    return passwordWithUppercase + "G#";
  }

  // Google Auth Flow
  public async oauthFlow(
    { username, name, email, phone, authType, email_verified }: oAuth,
    set: any
  ) {
    let groupPromise: AdminAddUserToGroupCommandOutput | undefined = undefined;
    let poolPromise: AdminCreateUserCommandOutput | undefined = undefined;
    let initiateAuthResult: any = [];

    try {
      const userExists = await this.checkUserExistence(username);
      const password = this.generatePlaceholderPassword(username);

      if (userExists) {
        console.log("User Exists");
        initiateAuthResult = await this.initiateAuth(username, password);
      } else {
        // Register User to user pool

        const userAttributes: { Name: string; Value: string }[] = [];

        if (phone) {
          userAttributes.push({ Name: "phone_number", Value: phone });
        }
        if (email) {
          userAttributes.push({ Name: "email", Value: email });
          userAttributes.push({ Name: "email_verified", Value: "true" });
        }
        if (name) {
          userAttributes.push({ Name: "custom:full_names", Value: name });
        }
        // if (username) {
        //     userAttributes.push({ Name: "username", Value: username });
        // }

        const input: AdminCreateUserCommandInput = {
          UserPoolId: this.userPoolId,
          Username: username,
          UserAttributes: userAttributes,
          MessageAction: "SUPPRESS",
          TemporaryPassword: password,
          ForceAliasCreation: true,
          DesiredDeliveryMediums: ["EMAIL"],
        };

        const addToPoolCommand = new AdminCreateUserCommand(input);
        poolPromise = await this.cognitoIdentity.send(addToPoolCommand);

        // Add user to googleUsers Group

        const groupInput = {
          UserPoolId: this.userPoolId,
          Username: username,
          GroupName: "googleUsers",
        };
        const addToGroupCommand = new AdminAddUserToGroupCommand(groupInput);
        groupPromise = await this.cognitoIdentity.send(addToGroupCommand);

        //Initiate Auth to get tokens

        const initiatePromise = await this.initiateAuth(username, password);

        const [groupResult, poolResult, initiateResult] = await Promise.all([
          groupPromise,
          poolPromise,
          initiatePromise,
        ]);

        initiateAuthResult = initiateResult;
      }

      response = {
        code: validCodes.SUCCESS,
        message: "Successful Authenticated Via Oauth",
        data: initiateAuthResult,
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error: any) {
      error.code = validCodes.INVALID_REQUEST;
      CustomErrorHandler.handleAndThrowError(error);
    }
  }

  public async signup(
    {
      username,
      password,
      name,
      email,
      phone,
      mfaEnabled,
      confirmPassword,
    }: signUpDetails,
    set?: any
  ) {
    let groupPromise: AdminAddUserToGroupCommandOutput;

    try {
      const input: SignUpRequest = {
        ClientId: this.clientId,
        SecretHash: this.hashSecret(username),
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: "custom:full_names",
            Value: name,
          },
          {
            Name: "email",
            Value: email,
          },

          {
            Name: "phone_number",
            Value: phone,
          },
          {
            Name: "custom:tenant_id",
            Value: this.tenantId,
          },
        ],
      };
      const signupCommand = new SignUpCommand(input);
      const signupResponse = await this.cognitoIdentity.send(signupCommand);

      if (username && password) {
        const groupInput = {
          UserPoolId: this.userPoolId,
          Username: username,
          GroupName: "cognitoUsers",
        };
        const addToGroupCommand = new AdminAddUserToGroupCommand(groupInput);
        groupPromise = await this.cognitoIdentity.send(addToGroupCommand);
      }

      await Promise.all([groupPromise]);

      response = {
        code: validCodes.SUCCESS,
        message: "Successful Registered",
        data: signupResponse,
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error: any) {
      error.code = validCodes.INVALID_REQUEST;
      CustomErrorHandler.handleAndThrowError(error);
    }
  }

  public async signIn({ username, password }: loginDetails, set: any) {
    try {
      if (!username || !password) {
        const message = "Username and password are required";

        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: validErrorName.MISSING_PARAMS,
          message,
          status: 400,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      }

      const params: InitiateAuthRequest = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: this.hashSecret(username),
        },
      };
      const command = new InitiateAuthCommand(params);
      const cognitoResponse = await this.cognitoIdentity.send(command);
      console.log("---Cognito Sign In Response---", cognitoResponse);

      response = {
        code: validCodes.SUCCESS,
        message: "Successful Authentication",
        data: {
          cognitoResponse,
          isMfa: Boolean(cognitoResponse.ChallengeName),
          mfaDetails: cognitoResponse?.ChallengeName,
        },
      };

      if (
        cognitoResponse.ChallengeName &&
        cognitoResponse.ChallengeParameters
      ) {
        const challengeParams = {
          challengeParams: cognitoResponse.AuthenticationResult,
          challengeName: cognitoResponse.ChallengeName,
        };
        await redisClientInstance.setItem(
          `challengeParams-${username}`,
          JSON.stringify(challengeParams),
          3600
        );
      }

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        this.errorObject = {
          code: validCodes.UNAUTHORIZED,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: 400,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred while signing in:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  //Handle Refresh Tokens
  public async refreshToken(
    {  username, deviceKey }: {  username: string; deviceKey: string | undefined }, refreshToken: string,
    set: any
  ) {
    try {

        console.log("passed refresh: ", deviceKey)
      const params: InitiateAuthRequest = {
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          SECRET_HASH: this.hashSecret(username),
          USER_POOL_ID: this.UserPoolId,
         // DEVICE_KEY: deviceKey
        },
        ClientId: this.ClientId,
      };
      const command = new InitiateAuthCommand(params);
      const cognitoResponse = await this.cognitoIdentity.send(command);
      console.log("---Cognito refresh token response---", cognitoResponse);

      const accessToken = cognitoResponse.AuthenticationResult?.AccessToken;
      const idToken = cognitoResponse.AuthenticationResult?.IdToken;
      const newRefreshToken = cognitoResponse.AuthenticationResult?.RefreshToken;

      response = {
            code: validCodes.SUCCESS,
            message: "Tokens successfully refreshed",
            data: {
                AccessToken: accessToken,
                IdToken: idToken,
                RefreshToken: newRefreshToken
            },
          };

          return CustomResponseHandler.handleAndSendResponse(response);
      }

       catch (error) {
      if (error instanceof NotAuthorizedException) {
        this.errorObject = {
          code: validCodes.UNAUTHORIZED,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: 400,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred while refreshing tokens:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  //Update User Attributes
  public async updateUser(
    { username, phone, email, name }: updateAdminUser,
    set: any
  ) {
    console.log("---Update User Attributes---");

    try {
      if (!username) {
        const message = "Username is required";

        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: validErrorName.MISSING_PARAMS,
          message,
          status: 400,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      }

      const userAttributes: { Name: string; Value: string }[] = [];

      if (phone) {
        userAttributes.push({ Name: "custom:phone", Value: phone });
      }
      if (email) {
        userAttributes.push({ Name: "email", Value: email });
      }
      if (name) {
        userAttributes.push({ Name: "custom:full_names", Value: name });
      }

      const params: AdminUpdateUserAttributesCommandInput = {
        UserPoolId: this.userPoolId,
        Username: username,
        UserAttributes: userAttributes,
      };
      const command = new AdminUpdateUserAttributesCommand(params);
      const cognitoResponse = await this.cognitoIdentity.send(command);
      console.log("---Cognito Sign In Response---", cognitoResponse);

      response = {
        code: validCodes.SUCCESS,
        message: "User attributes updated",
        data: {
          cognitoResponse,
        },
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof AliasExistsException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  //Verify User on registration

  public async confirmSignup(
    { username, verificationCode }: confirmationParams,
    set: any
  ): Promise<res | void> {
    console.log("---Confirm Signup Request---");

    try {
      const input: ConfirmSignUpCommandInput = {
        ClientId: this.clientId,
        SecretHash: this.hashSecret(username),
        Username: username,
        ConfirmationCode: verificationCode,
        ForceAliasCreation: false,
      };

      const command = new ConfirmSignUpCommand(input);
      await this.cognitoIdentity.send(command);

      response = {
        code: validCodes.SUCCESS,
        message: "Account Verified",
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof AliasExistsException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof CodeMismatchException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof ExpiredCodeException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred while signing out:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async signOut(accessToken: string, set: any): Promise<res | void> {
    try {
      const token = Object.values(accessToken)[0];
      const authenticationData: GlobalSignOutCommandInput = {
        AccessToken: token,
      };

      const globalLogoutParams = new GlobalSignOutCommand(authenticationData);
      const cognitoResponse = await this.cognitoIdentity.send(
        globalLogoutParams
      );

      //console.log('---Logout Cognito Response---', cognitoResponse);

      response = {
        code: validCodes.SUCCESS,
        message: "Logged Out Successfully",
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        this.errorObject = {
          code: validCodes.UNAUTHORIZED,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof PasswordResetRequiredException) {
        this.errorObject = {
          code: validCodes.UNAUTHORIZED,
          name: error?.name,
          message: error?.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
          stack: error?.stack,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred while signing out:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async forgotPassword(
    { username }: { username: string },
    set: any
  ): Promise<res | void> {
    try {
      const userExists = await this.checkUserExistence(username);

      if (userExists) {
        const forgotPasswordCommand = new ForgotPasswordCommand({
          ClientId: this.clientId,
          SecretHash: this.hashSecret(username),
          Username: username,
        });

        const res = await this.cognitoIdentity.send(forgotPasswordCommand);

        response = {
          code: validCodes.SUCCESS,
          message: "Verification code sent to email",
          data: res,
        };

        return CustomResponseHandler.handleAndSendResponse(response);
      } else {
        this.errorObject = {
          code: validCodes.NOT_FOUND,
          name: validErrorName.INVALID_PARAMS,
          message: "Invalid Username. Username does not exist",
          status: 404,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      }
    } catch (error) {
      if (error instanceof CodeDeliveryFailureException) {
        this.errorObject = {
          code: validCodes.NOT_FOUND,
          name: error?.name,
          message: error.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof UserNotFoundException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred during forgot password:", error);
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      }
    }
  }

  public async confirmPasswordReset(
    { Username, ConfirmationCode, Password }: ConfirmForgotPasswordCommandInput,
    set: any
  ): Promise<res | void> {
    try {
      const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username,
        ConfirmationCode,
        Password,
        SecretHash: this.hashSecret(<string>Username),
      } as ConfirmForgotPasswordCommandInput);

      const res: ConfirmForgotPasswordCommandOutput =
        await this.cognitoIdentity.send(confirmForgotPasswordCommand);

      response = {
        code: validCodes.SUCCESS,
        message: "Password Reset",
        data: res,
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof InvalidPasswordException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof ExpiredCodeException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred during password change:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async checkUserExistence(username: string): Promise<boolean | void> {
    try {
      const params: AdminGetUserCommandInput = {
        UserPoolId: this.userPoolId,
        Username: username,
      };
      await this.cognitoIdentity.send(new AdminGetUserCommand(params));
      return true;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return false;
      } else {
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  private async associateTOTP(
    accessToken: string,
    session?: string
  ): Promise<AssociateSoftwareTokenCommandOutput | void> {
    try {
      const params: AssociateSoftwareTokenCommandInput = {
        AccessToken: accessToken,
        Session: session ?? undefined,
      };

      return await this.cognitoIdentity.send(
        new AssociateSoftwareTokenCommand(params)
      );
    } catch (error) {
      if (error instanceof ConcurrentModificationException) {
        this.errorObject = {
          code: validCodes.SYSTEM_ERROR,
          name: error?.name,
          message: "More than two modifications happening concurrently",
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async setUserMFA(
    username: string,
    set: any,
    mfaMethod?: boolean,
    preferredMfa?: boolean
  ): Promise<res | void> {
    try {
      const params: AdminSetUserMFAPreferenceCommandInput = {
        UserPoolId: this.userPoolId,
        Username: username,
        SoftwareTokenMfaSettings: {
          Enabled: mfaMethod ?? false,
          PreferredMfa: preferredMfa ?? false,
        },
      };

      console.log("User MFA Params: ", params);

      const res = await this.cognitoIdentity.send(
        new AdminSetUserMFAPreferenceCommand(params)
      );

      response = {
        code: validCodes.SUCCESS,
        message: "MFA Setting updated",
        data: res,
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof PasswordResetRequiredException) {
        this.errorObject = {
          code: validCodes.PASSWORD_RESET,
          name: error?.name,
          message: "Password reset required",
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async verifyTOTP(
    code: string,
    set: any,
    accessToken?: string,
    sessionToken?: string
  ): Promise<res | void> {
    try {
      const params: VerifySoftwareTokenCommandInput = {
        UserCode: code,
        AccessToken: accessToken ?? undefined,
        Session: sessionToken ?? undefined,
      };
      const res = await this.cognitoIdentity.send(
        new VerifySoftwareTokenCommand(params)
      );

      response = {
        code: validCodes.SUCCESS,
        message: "TOTP token validated",
        data: res,
      };

      return CustomResponseHandler.handleAndSendResponse(response);
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: "TOTP token mismatch",
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  public async mfaRequest(
    {
      username,
      code,
      session,
    }: { username: string; code: string; session?: string },
    set: any
  ): Promise<res | void> {
    try {
      const userExists = await this.checkUserExistence(username);
      let challengeName;
      let responseChallenge;

      if (userExists) {
        const key = `challengeParams-${username}`;
        const retrieveChallenges = await redisClientInstance.getItem(key);
        if (retrieveChallenges) {
          const params = JSON.parse(retrieveChallenges);
          challengeName = params.challengeName;
        }

        switch (challengeName) {
          case ChallengeNameType.SMS_MFA:
            responseChallenge = { SMS_MFA_CODE: code, USERNAME: username };
            break;
          case ChallengeNameType.SOFTWARE_TOKEN_MFA:
            responseChallenge = {
              USERNAME: username,
              SOFTWARE_TOKEN_MFA_CODE: code,
            };
            break;
          default:
            this.errorObject = {
              code: validCodes.INVALID_REQUEST,
              name: validErrorName.INVALID_PARAMS,
              message: "Acceptable MFA methods are SMS or Software Token",
              status: 400,
            };
            CustomErrorHandler.handleAndThrowError(this.errorObject);
        }

        const mfaRequestCommand = new RespondToAuthChallengeCommand({
          ClientId: this.clientId,
          ChallengeName: <ChallengeNameType>challengeName,
          Session: session ?? undefined,
          ChallengeResponses: responseChallenge,
        });

        const res = await this.cognitoIdentity.send(mfaRequestCommand);

        response = {
          code: validCodes.SUCCESS,
          message: "MFA Authenticated",
          data: res,
        };

        return CustomResponseHandler.handleAndSendResponse(response);
      } else {
        this.errorObject = {
          code: validCodes.NOT_FOUND,
          name: validErrorName.INVALID_PARAMS,
          message: "Invalid Username. Username does not exist",
          status: 404,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      }
    } catch (error) {
      if (error instanceof CodeMismatchException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: error.message ?? error?.name,
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else if (error instanceof ExpiredCodeException) {
        this.errorObject = {
          code: validCodes.INVALID_REQUEST,
          name: error?.name,
          message: "Expired MFA Code. Try again",
          status: error.$metadata.httpStatusCode,
        };
        CustomErrorHandler.handleAndThrowError(this.errorObject);
      } else {
        console.error("Error occurred during forgot password:", error);
        CustomErrorHandler.handleAndThrowError(error);
      }
    }
  }

  private hashSecret(username: string): string {
    console.log("Hash Username", username);
    console.log("Hash Secret", this.secretHash);
    console.log("Hash Username", this.clientId);
    return crypto
      .createHmac("SHA256", this.secretHash as string)
      .update(username + this.clientId)
      .digest("base64");
  }
}

//Export Singleton Class

export const cognitoClassType = CognitoService;

export const cognitoService = CognitoService.getInstance();
