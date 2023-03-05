import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { OAuth2Handler } from "./OAuth2Handler";
import { Slack } from "./slack/types/index.d";
import { SlackWebhooks } from "./SlackWebhooks";
import { ConversationsRepliesResponse, SlackApiClient } from "./SlackApiClient";
import { OpenAiClient, Message, RoleType } from "./OpenAiClient";
import { UserCredentialStore, UserCredential } from "./UserCredentialStore";
import { SlackCredentialStore } from "./SlackCredentialStore";
import { SlackConfigurator } from "./SlackConfigurator";
import "apps-script-jobqueue";
import { NetworkAccessError } from "./NetworkAccessError";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type DoGet = GoogleAppsScript.Events.DoGet;
type HtmlTemplate = GoogleAppsScript.HTML.HtmlTemplate;
type BlockActions = Slack.Interactivity.BlockActions;
type ButtonAction = Slack.Interactivity.ButtonAction;
type InteractionResponse = Slack.Interactivity.InteractionResponse;
type AppMentionEvent = Slack.CallbackEvent.AppMentionEvent;
type MessageEvent = Slack.CallbackEvent.MessageEvent;
type MessageRepliedEvent = Slack.CallbackEvent.MessageRepliedEvent;
type AppsManifest = Slack.Tools.AppsManifest;
type Parameter = AppsScriptJobqueue.Parameter;

let handler: OAuth2Handler;

const handleCallback = (request): HtmlOutput => {
  initializeOAuth2Handler();
  return handler.authCallback(request);
};

const jobEventHandler = (event): void => {
  console.log(JSON.stringify(event));
};

function initializeOAuth2Handler(): void {
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);
  const credential = slackCredentialStore.getCredential();

  handler = new OAuth2Handler(
    credential,
    PropertiesService.getUserProperties(),
    handleCallback.name
  );
}

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request: DoGet): HtmlOutput {
  initializeOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.hasOwnProperty("logout")) {
    handler.clearService();
    const properties = PropertiesService.getScriptProperties();
    const slackCredentialStore = new SlackCredentialStore(properties);
    slackCredentialStore.removeCredential();
    const slackConfigurator = new SlackConfigurator();
    slackConfigurator.deleteApps();

    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_parent">refresh</a>.'
    );
    template.requestUrl = ScriptApp.getService().getUrl();
    return HtmlService.createHtmlOutput(template.evaluate());
  }
  // Reinstall the Slack app by accessing it with the get parameter `?reinstall=true`
  if (request.parameter.hasOwnProperty("reinstall")) {
    const slackConfigurator = new SlackConfigurator();
    const permissionsUpdated = slackConfigurator.updateApps(
      createAppsManifest([handler.callbackURL], handler.requestURL)
    );

    let template: HtmlTemplate;
    if (permissionsUpdated) {
      template = HtmlService.createTemplate(
        `You’ve changed the permission scopes your app uses. Please <a href="<?= reInstallUrl ?>" target="_parent">reinstall your app</a> for these changes to take effect.`
      );
      template.reInstallUrl = handler.reInstallUrl;
    } else {
      template = HtmlService.createTemplate(
        `Reinstallation is complete.<br /><a href="<?= requestUrl ?>" target="_parent">refresh</a>.`
      );
      template.requestUrl = ScriptApp.getService().getUrl();
    }
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle("");
  }

  if (handler.verifyAccessToken()) {
    const template = HtmlService.createTemplate(
      "OK!<br />" +
        '<a href="<?!= reInstallUrl ?>" target="_parent" style="align-items:center;color:#000;background-color:#fff;border:1px solid #ddd;border-radius:4px;display:inline-flex;font-family:Lato, sans-serif;font-size:16px;font-weight:600;height:48px;justify-content:center;text-decoration:none;width:236px"><svg xmlns="http://www.w3.org/2000/svg" style="height:20px;width:20px;margin-right:12px" viewBox="0 0 122.8 122.8"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"></path><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"></path><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"></path><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"></path></svg>Reinstall to Slack</a>'
    );
    template.reInstallUrl = handler.requestURL + "?reinstall=true";
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
      "Installation on Slack is complete"
    );
  }
  if (request.parameter.hasOwnProperty("token")) {
    return configuration(request.parameter);
  } else {
    const template = HtmlService.createTemplate(
      '<a href="https://api.slack.com/authentication/config-tokens#creating" target="_blank">Create configuration token</a><br />' +
        '<form action="<?!= requestURL ?>" method="get" target="_parent"><p>Configuration Tokens(Refresh Token):<input type="password" name="token" value="<?!= refreshToken ?>"></p><input type="submit" name="" value="Create App"></form>'
    );
    template.requestURL = handler.requestURL;
    template.refreshToken = new SlackConfigurator().refresh_token;
    return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
      "Start Slack application configuration."
    );
  }
}

function configuration(data: { [key: string]: string }): HtmlOutput {
  const slackConfigurator = new SlackConfigurator(data.token);
  const credentail = slackConfigurator.createApps(createAppsManifest());
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);

  slackCredentialStore.setCredential(credentail);

  const oAuth2Handler = new OAuth2Handler(
    credentail,
    PropertiesService.getUserProperties(),
    handleCallback.name
  );

  slackConfigurator.updateApps(
    createAppsManifest([oAuth2Handler.callbackURL], oAuth2Handler.requestURL)
  );

  const template = HtmlService.createTemplate(
    '<a href="<?!= installUrl ?>" target="_parent" style="align-items:center;color:#000;background-color:#fff;border:1px solid #ddd;border-radius:4px;display:inline-flex;font-family:Lato, sans-serif;font-size:16px;font-weight:600;height:48px;justify-content:center;text-decoration:none;width:236px"><svg xmlns="http://www.w3.org/2000/svg" style="height:20px;width:20px;margin-right:12px" viewBox="0 0 122.8 122.8"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"></path><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"></path><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"></path><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"></path></svg>Add to Slack</a>'
  );
  template.installUrl = oAuth2Handler.installUrl;

  return HtmlService.createHtmlOutput(template.evaluate()).setTitle(
    "Slack application configuration is complete."
  );
}

function createAppsManifest(
  redirectUrls: string[] = [],
  requestUrl = ""
): AppsManifest {
  const appsManifest = {
    display_information: {
      name: "OpenAI Bot",
    },
  } as AppsManifest;

  if (redirectUrls.length !== 0 && requestUrl !== "") {
    appsManifest.features = {
      bot_user: {
        display_name: "open-ai",
      },
    };

    appsManifest.oauth_config = {
      redirect_urls: redirectUrls,
      scopes: {
        bot: OAuth2Handler.SCOPE.split(","),
      },
    };

    appsManifest.settings = {
      event_subscriptions: {
        request_url: requestUrl,
        bot_events: ["app_mention", "message.channels", "message.groups"],
      },
      interactivity: {
        is_enabled: true,
        request_url: requestUrl,
      },
    };
  }

  return appsManifest;
}

const asyncLogging = (parameter: Parameter): boolean => {
  console.info(JSON.stringify(parameter));
  return true;
};

function doPost(e: DoPost): TextOutput {
  initializeOAuth2Handler();
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);
  const credentail = slackCredentialStore.getCredential();
  const slackHandler = new SlackHandler(credentail.verification_token);

  slackHandler.addCallbackEventListener("app_mention", executeAppMentionEvent);
  slackHandler.addCallbackEventListener("message", executeMessageEvent);
  slackHandler.addInteractivityListener("button", executeButton);
  try {
    const process = slackHandler.handle(e);

    if (process.performed) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      JobBroker.enqueueAsyncJob<Parameter>(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const executeButton = (blockActions: BlockActions): Record<string, never> => {
  const action = blockActions.actions[0] as ButtonAction;
  const response: InteractionResponse = {};

  const webhook = new SlackWebhooks(blockActions.response_url);

  switch (action.action_id) {
    case "submit_action":
      const apiKey =
        blockActions.state.values.api_key_input.api_key_input_action.value;
      const openAiClient = new OpenAiClient(apiKey);

      try {
        openAiClient.listModels();

        const store = new UserCredentialStore(
          PropertiesService.getUserProperties(),
          makePassphraseSeeds(blockActions.user.id)
        );

        store.setUserCredential(blockActions.user.id, {
          apiKey: apiKey,
        } as UserCredential);
        response.delete_original = "true";
      } catch (e) {
        if (e instanceof NetworkAccessError) {
          response.replace_original = "true";
          response.text = e.message;
          break;
        }
      }

      break;
  }

  if (!webhook.invoke(response)) {
    throw new Error(
      `executeButton faild. event: ${JSON.stringify(blockActions)}`
    );
  }

  return {};
};

const executeAppMentionEvent = (event: AppMentionEvent): void => {
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(event.user)
  );
  const credential = store.getUserCredential(event.user);

  if (credential) {
    if (addReactions(event.channel, event.ts)) {
      JobBroker.enqueueAsyncJob<AppMentionEvent>(executeStartTalk, event);
    }
  } else {
    const slackApiClient = new SlackApiClient(handler.token);
    slackApiClient.postEphemeral(
      event.channel,
      `Not exists credential.`,
      event.user,
      createInputApoKeyBlocks()
    );
  }
};

interface ReplyTalkParameter {
  thread_ts: string;
  channel: string;
  user: string;
  text: string;
  prevMessages: Message[];
}

const executeMessageRepliedEvent = (event: MessageRepliedEvent): void => {
  const thread_ts = event.thread_ts;
  const channel = event.channel;
  const text = event.text;

  const slackApiClient = new SlackApiClient(handler.token);
  const response = slackApiClient.conversationsReplies(channel, thread_ts);

  if (isBotReplyInThread(response)) {
    if (addReactions(event.channel, event.ts)) {
      const prevMessages: Message[] = response.messages
        .sort((a, b) => Number(a.ts) - Number(b.ts))
        .map((message) => {
          return {
            role: message.hasOwnProperty("bot_id")
              ? RoleType.Assistant
              : RoleType.User,
            content: message.text,
          };
        });
      const user = getValidUser(response);
      const replyTalkParameter = {
        thread_ts,
        channel,
        user,
        text,
        prevMessages,
      } as ReplyTalkParameter;

      JobBroker.enqueueAsyncJob<ReplyTalkParameter>(
        executeReplyTalk,
        replyTalkParameter
      );
    }
  }
};

function isBotReplyInThread(
  conversationsRepliesResponse: ConversationsRepliesResponse
): boolean {
  const botIds = conversationsRepliesResponse.messages
    .map((message) =>
      message.hasOwnProperty("bot_id") ? message.bot_id : null
    )
    .filter((id) => id !== null);

  if (botIds.length === 0 || typeof botIds[0] !== "string") {
    return false;
  }

  const slackApiClient = new SlackApiClient(handler.token);
  const response = slackApiClient.infoBots(botIds[0]);

  const slackConfigurator = new SlackConfigurator();

  return slackConfigurator.app_id === response.bot.app_id;
}

function addReactions(channel: string, timestamp: string): boolean {
  const properties = PropertiesService.getScriptProperties();
  const START_REACTION: string =
    properties.getProperty("START_REACTION") || "robot_face";
  const slackApiClient = new SlackApiClient(handler.token);

  return slackApiClient.addReactions(channel, START_REACTION, timestamp);
}

function getValidUser(
  conversationsRepliesResponse: ConversationsRepliesResponse
): string | null {
  const users = conversationsRepliesResponse.messages
    .map((message) => (message.hasOwnProperty("user") ? message.user : null))
    .filter((user) => user !== null);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (typeof user !== "string") {
      continue;
    }
    const store = new UserCredentialStore(
      PropertiesService.getUserProperties(),
      makePassphraseSeeds(user)
    );

    const credential = store.getUserCredential(user);

    if (credential !== null) {
      return user;
    }
  }

  return null;
}

const executeMessageEvent = (event: MessageEvent): void => {
  if (event.hasOwnProperty("thread_ts") && !event.hasOwnProperty("bot_id")) {
    const messageRepliedEvent = event as MessageRepliedEvent;
    executeMessageRepliedEvent(messageRepliedEvent);
  }
};

function createInputApoKeyBlocks(): Record<string, any>[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Please enter your API Key*\nAPI Key can be issued <https://platform.openai.com/account/api-keys|here>",
      },
    },
    {
      type: "input",
      block_id: "api_key_input",
      element: {
        type: "plain_text_input",
        action_id: "api_key_input_action",
        placeholder: {
          type: "plain_text",
          text: "Enter your API Key",
        },
      },
      label: {
        type: "plain_text",
        text: "API Key",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Submit",
          },
          style: "primary",
          action_id: "submit_action",
        },
      ],
    },
  ];
}

const SYSTEM_PROMPT = `You are a helpful Slack bot assistant!
Please answer the current question accurately, taking into account your knowledge and the content of our previous conversations.
If you need additional information to provide this accurate response, please ask a question.
Please use Slack's markdown notation when dealing with code and URLs in your responses.
Knowledge cutoff: 0.9
Current date: ${new Date().toISOString()}`;

const executeStartTalk = (event: AppMentionEvent): boolean => {
  initializeOAuth2Handler();
  const messages: Message[] = [
    {
      role: RoleType.System,
      content: SYSTEM_PROMPT,
    },
    {
      role: RoleType.User,
      content: event.text,
    },
  ];

  const replay = callOpenAi(event.user, messages);

  const client = new SlackApiClient(handler.token);
  client.chatPostMessage(event.channel, replay, event.ts);

  return true;
};

function callOpenAi(user: string, messages: Message[]): string {
  const store = new UserCredentialStore(
    PropertiesService.getUserProperties(),
    makePassphraseSeeds(user)
  );

  const credential = store.getUserCredential(user);
  const openAiClient = new OpenAiClient(credential.apiKey);
  const response = openAiClient.chatCompletions(messages);

  if (response.hasOwnProperty("choices")) {
    const replay = response.choices[0].message.content;
    if (replay === "") {
      console.info(`No replay. response:${replay}`);

      return "I don't know what you're talking about for a second. :smirk:";
    }
    return replay;
  } else {
    return "Oops. Something went wrong. :cold_sweat:";
  }
}

const executeReplyTalk = (parameter: ReplyTalkParameter): boolean => {
  initializeOAuth2Handler();
  const messages: Message[] = [];

  messages.push({ role: RoleType.System, content: SYSTEM_PROMPT });
  messages.concat(...parameter.prevMessages);
  messages.push({ role: RoleType.User, content: parameter.text });

  const replay = callOpenAi(parameter.user, messages);

  const client = new SlackApiClient(handler.token);
  client.chatPostMessage(parameter.channel, replay, parameter.thread_ts);

  return true;
};

function makePassphraseSeeds(user_id: string): string {
  const properties = PropertiesService.getScriptProperties();
  const slackCredentialStore = new SlackCredentialStore(properties);
  const credentail = slackCredentialStore.getCredential();

  return credentail?.client_id + user_id + credentail?.client_secret;
}

export { doPost, doGet, createInputApoKeyBlocks, jobEventHandler };
