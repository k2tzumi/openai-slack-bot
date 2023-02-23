[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
![ci](https://github.com/k2tzumi/openai-slack-bot/workflows/ci/badge.svg)

What is this?
==============================

Slack bot that uses the [completes API](https://beta.openai.com/docs/api-reference/completions) to talk in a text-davinci-003 model.  

 I implemented a bot with Google apps script for Slack based on the following project.  
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

1. Join the channel for bot on Slack
2. To send a message to bot, type `@open-ai` and enter the message content (e.g., `@open-ai Hello`)
3. Bot will reply to your message in a thread (e.g., `Hello! I'm OpenAI. I'm happy to talk to you.`)
4. If you have more questions about the reply, send a message in that thread (e.g., `What do you like?`)
5. Bot will answer with context of the conversation (e.g., `I like natural language processing and artificial intelligence technologies. What do you like?`)