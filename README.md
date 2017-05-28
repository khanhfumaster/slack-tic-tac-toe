# tic-tac-toe for Slack

![](./ttt.gif)

Check it out here: http://lonely.engineer/tic-tac-toe

## Setup

- Install serverless: `npm i -g serverless`
- Configure your AWS credentials
- Put your Slack App credentials in serverless.yml.
- Deploy it: `serverless deploy`

### Code

- All the Slack related is handled by the `slack-serverless` npm module.
- All the game logic and commands live in `src/index.js`