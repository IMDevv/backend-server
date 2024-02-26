import Elysia from "elysia";

export const httpLoggerPlugin = () => new Elysia().decorate('httpLogger', true);









