import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { OAuth2Handler } from "./OAuth2Handler";
import { Slack } from "./slack/types/index.d";
import { SlackWebhooks } from "./SlackWebhooks";
import { SlackApiClient } from "./SlackApiClient";
import { SlashCommandFunctionResponse } from "./SlashCommandHandler";
import { UserCredentialStore, UserCredential } from "./UserCredentialStore";
import "apps-script-jobqueue";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type DoGet = GoogleAppsScript.Events.DoGet;
type Commands = Slack.SlashCommand.Commands;
type MultiUsersSelectAction = Slack.Interactivity.MultiUsersSelectAction;
type BlockActions = Slack.Interactivity.BlockActions;
type StaticSelectAction = Slack.Interactivity.StaticSelectAction;
type ButtonAction = Slack.Interactivity.ButtonAction;
type InteractionResponse = Slack.Interactivity.InteractionResponse;
type AppMentionEvent =
  | Slack.CallbackEvent.AppMentionEvent
  | Record<string, any>;
type AppsManifest = Slack.Tools.AppsManifest;

const properties = PropertiesService.getScriptProperties();

const CLIENT_ID: string = properties.getProperty("CLIENT_ID") || "dummy";
const CLIENT_SECRET: string =
  properties.getProperty("CLIENT_SECRET") || "dummy";
let handler: OAuth2Handler;

const handleCallback = (request): HtmlOutput => {
  initializeOAuth2Handler();
  return handler.authCallback(request);
};

function initializeOAuth2Handler(): void {
  handler = new OAuth2Handler(
    CLIENT_ID,
    CLIENT_SECRET,
    PropertiesService.getUserProperties(),
    handleCallback.name
  );
}

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request: DoGet): HtmlOutput {
  // initializeOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.hasOwnProperty("logout")) {
    // handler.clearService();
    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_parent">refresh</a>.'
    );
    template.requestUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  // if (handler.verifyAccessToken()) {
  if (request.parameter.hasOwnProperty("token")) {
    const client = new SlackApiClient(request.parameter.token);
    const createResponse = client.createAppsManifest(createAppsManifest());

    const oAuth2Handler = new OAuth2Handler(
      createResponse.credentials.client_id,
      createResponse.credentials.client_secret,
      PropertiesService.getUserProperties(),
      handleCallback.name
    );

    const updateResponse = client.updateAppsManifest(createResponse.app_id, createAppsManifest(oAuth2Handler.authorizationUrl));

    const template = HtmlService.createTemplate(
      '<a href="<?!= oauthUrl ?>" target="_parent">Add to Slack</a>'
    );
    template.oauthUrl = oAuth2Handler.installUrl;

    return HtmlService.createHtmlOutput(template.evaluate());
  } else {
    const template = HtmlService.createTemplate(
      '<a href="https://api.slack.com/authentication/config-tokens#creating" target="_blank">Create configuration token</a><br />' +
        '<form action="<?!= redirectUrl ?>" method="get" target="_parent"><p>config tokens:<input type="text" name="token"></p><input type="submit" name="" value="Create App"></form>'
    );
    template.authorizationUrl = ScriptApp.getService().getUrl();
    template.redirectUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(template.evaluate());
  }
}

function createAppsManifest(authorizationUrl: string = null): AppsManifest {
  const appsManifest = {
    display_information: {
      name: "OpenAI Bot",
    }
  } as AppsManifest;

  if (authorizationUrl !== null) {
    appsManifest.features = {
      bot_user: {
        display_name: "open-ai"
      }
    };

    appsManifest.oauth_config = {
      redirect_urls: [authorizationUrl],
      scopes: {
        bot: OAuth2Handler.SCOPE.split(","),
      },
    };
  }

  return appsManifest;
}

const asyncLogging = (): void => {
  JobBroker.consumeAsyncJob((parameter: Record<string, any>) => {
    console.info(JSON.stringify(parameter));
  }, "asyncLogging");
};

const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

function doPost(e: DoPost): TextOutput {
  initializeOAuth2Handler();

  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCallbackEventListener("app_mention", executeAppMentionEvent);

  try {
    const process = slackHandler.handle(e);

    if (process.performed) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      JobBroker.enqueueAsyncJob(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const START_REACTION: string =
  properties.getProperty("START_REACTION") || "robot_face";

const executeAppMentionEvent = (event: AppMentionEvent): void => {
  const slackApiClient = new SlackApiClient(handler.token);
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(event.user)
  );
  const credential: UserCredential = store.getUserCredential(event.user);

  if (credential) {
    if (slackApiClient.addReactions(event.channel, START_REACTION, event.ts)) {
      JobBroker.enqueueAsyncJob(executeStartTalk, event);
    }
  } else {
    slackApiClient.postEphemeral(
      event.channel,
      `Not exists credential.`,
      event.user
    );
  }
};

const executeStartTalk = (): void => {
  initializeOAuth2Handler();
  JobBroker.consumeAsyncJob((event: AppMentionEvent) => {
    const client = new SlackApiClient(handler.token);
    client.chatPostMessage(event.channel, `<@${event.user}>\nHello.`, event.ts);
  }, "executeStartTalk");
};

function makePassphraseSeeds(user_id: string): string {
  return CLIENT_ID + user_id + CLIENT_SECRET;
}

export {};
