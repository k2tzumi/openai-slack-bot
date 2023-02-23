[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
![ci](https://github.com/k2tzumi/openai-slack-bot/workflows/ci/badge.svg)

What is this?
==============================


This is a Slack bot that uses OpenAI's service to chat with AI on Slack. You can have natural and engaging conversations with the bot using text-davinci-003 model, which is one of the most advanced natural language models available. The bot can answer your questions, generate texts, and have fun with you.

I created this bot using Google apps script for Slack, which is a simple and convenient way to run scripts on the cloud without setting up servers or databases. You can use this bot by inviting it to your channel and sending messages to it.

This project is a reimplementation of the following bot for discord, adapted for Slack:  
https://github.com/openai/gpt-discord-bot

# Installation

## Prerequisites

- npm
- clasp  
`npm install -g @google/clasp`
- make
- GAS Library  
  - [OAuth2](https://github.com/googleworkspace/apps-script-oauth2)
  - [JobBroker](https://github.com/k2tzumi/apps-script-jobqueue)

## Steps

1. Enable Google Apps Script API  
https://script.google.com/home/usersettings
2. Clone this repository to your local machine.
3. Run `make push` to install the dependencies and the necessary libraries, authenticate with Google, create a new GAS project and upload the code.
4. Run `make deploy` to deploy the project as a web app.  
The first time you publish it as a web application, you will need to authorize it, so please follow the steps below.
Open the script editor. (`make open`)  
Click Deploy > New deployment.  
Select Web app as the deployment type.  
Choose who can access your web app and who will execute it.  
Click Deploy.  
For more information, please refer to the official Google documentation.  
https://developers.google.com/apps-script/concepts/deployments
5. Run `make application` to open the deployed web app in your browser. Follow the instructions on the web app to install the Slack app and perform OAuth authentication. The web app will automatically upload the App manifest to Slack and configure the necessary settings for you.

# How to use

This bot uses OpenAI's service to chat with AI on Slack. The usage is as follows.  

1. Invite bots to your channel (e.g. /invite @open-ai)
2. To send a message to bot, type `@open-ai` and enter the message content (e.g., `@open-ai Hello`)  
Only for the first time, enter your OpenAI API Key. This is required for the bot to access OpenAI’s service.  
To get an API Key, please visit this URL (and create an account if necessary).   
https://platform.openai.com/account/api-keys  
Once you enter your API Key, you can chat freely with the bot.
3. The bot will reply to your message in a thread (e.g., `Hello! I'm OpenAI. I'm happy to talk to you.`)
4. If you have more questions about the reply, send a message in that thread (e.g., `What do you like?`)
5. The bot will answer with the context of the conversation (e.g., `I like natural language processing and artificial intelligence technologies. What do you like?`)