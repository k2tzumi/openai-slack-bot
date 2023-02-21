import { Slack } from "../src/slack/types/index.d";
import * from "@types/google-apps-script";
import { createInputApoKeyBlocks } from "../src/Code";

type DoGet = GoogleAppsScript.Events.DoGet;
type Commands = Slack.SlashCommand.Commands;

const properites = {
    getProperty: jest.fn(function () {
        return 'dummy';
    }),
    deleteAllProperties: jest.fn(),
    deleteProperty: jest.fn(),
    getKeys: jest.fn(),
    getProperties: jest.fn(),
    setProperties: jest.fn(),
    setProperty: jest.fn()
};

PropertiesService['getScriptProperties'] = jest.fn(() => properites);
PropertiesService['getUserProperties'] = jest.fn(() => properites);

const service = {
    setAuthorizationBaseUrl: jest.fn(function () {
        return this;
    }),
    setTokenUrl: jest.fn(function () {
        return this;
    }),
    setTokenFormat: jest.fn(function () {
        return this;
    }),
    setClientId: jest.fn(function () {
        return this;
    }),
    setClientSecret: jest.fn(function () {
        return this;
    }),
    setCallbackFunction: jest.fn(function () {
        return this;
    }),
    setPropertyStore: jest.fn(function () {
        return this;
    }),
    setScope: jest.fn(function () {
        return this;
    }),
    setTokenPayloadHandler: jest.fn(function () {
        return this;
    }),
};
OAuth2['createService'] = jest.fn(() => service);

describe('Code', () => {
    describe('createInputApoKeyBlocks', () => {
        it('ok', () => {
            const actual = createInputApoKeyBlocks();

            expect(actual[0]).toHaveProperty('text');
            expect(actual[0]).toHaveProperty('type');
        });
    });
});