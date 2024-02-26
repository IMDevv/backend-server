// import { describe, it, expect } from "bun:test";
// import { validateBearerToken } from "utils/validation";

// describe("Validate cognito bearer token", () => {
//     it("should validate bearer token", async () => {
//       const token = "eyJraWQiOiJmVVpWdkdjOWUwM1NJNTQ3MFVlaHJEQXZxcDZBdTMwb3dveHArVU1PWURnPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIwMzY3NmJiYi01ZGUxLTQ4MTYtYjEyOS1kZmMxZGNjMTFmNTIiLCJkZXZpY2Vfa2V5IjoiZXUtd2VzdC0xX2YzMjk1NmEyLWMwNmYtNDIxZS1hZjM3LTU5NWM0NzAwNjViYyIsImNvZ25pdG86Z3JvdXBzIjpbImdvb2dsZVVzZXJzIl0sInJvbGVzIjoiY2xpZW50IiwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tXC9ldS13ZXN0LTFfME1ObUNoU3JZIiwiY2xpZW50X2lkIjoiNzljYm92NHBpcHJiM3JmbGNrcXRubHRiNnAiLCJvcmlnaW5fanRpIjoiNmUzYzI3ZjgtZGM0NC00ZmZiLWE1ZDMtNWIyMjU3MmJhZjJhIiwiZXZlbnRfaWQiOiIxNDY1MDU2YS1lZDZiLTRmNzQtOTYxZS00MzJiMjY3YTFmZTQiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNzA3OTE0ODM2LCJleHAiOjE3MDc5MTg0MzYsImlhdCI6MTcwNzkxNDgzNiwianRpIjoiNjVhMmIyOWMtYzcwMC00ZGVjLTk0YmItZGZhNGYxZjQwY2YwIiwidXNlcm5hbWUiOiIxMTI2MTUzNDg0MjQ4MTI4MTAyMzMifQ.2QEFP-pknI9_74T514q1swf9-tepO-ToGg8FVfDiys4QsSOMNpHrzcMv9CLbHAdeylcB7pVWElxxHvXbfd45pRVuqw4lrWYrutEKxgO7hZnDFIAioLQUHKO1bC1avXB3aa-84iFY2IyE-QOEQSBDOil-WDmXk04MwEgr3FzTWqZIs-FaQimD4NlkOudVbRrAeZ8RomUbRKXhM1EEXLCzVv-4ZGd60Jlsims34GNKm2W5bXbxPzv67BbTTtpOBZDXZNiVATV1YX05EPaNaWl1HDrr4_nrcIl9mANkBV_aJToHyb-p7IUp6IduuE9i_IBZz50i5m9n0VivL7RrWU4Q7g"

//       const result = await validateBearerToken(token);

//       console.log("Bearer token Test", result);

//       expect(result).toBeTruthy();

//     })
// })