'use strict';

// Include the serverless-slack bot framework
const slack = require('serverless-slack');

// The function that AWS Lambda will call
exports.handler = slack.handler.bind(slack);

const O = ':o:';
const X = ':heavy_multiplication_x:';
const NONE = ':grey_question:';

const FAILED_TO_FIND_USER = 'Sorry mate, not too sure who that is... Try again with /ttt @mention';
const PLAY_WITH_YOURSELF = `Sorry mate, you probably shouldn't play with yourself at work... Try again with /ttt @mention`;

const DEFEAT_WORDS = [
  'defeated',
  'destroyed',
  'crushed',
  'demolished',
  'beat'
];

function getDefeatWord() {
  return DEFEAT_WORDS[Math.floor(Math.random()*DEFEAT_WORDS.length)];
}

const newGame = [
  [
    NONE, NONE, NONE
  ],
  [
    NONE, NONE, NONE
  ],
  [
    NONE, NONE, NONE
  ]
];

const winStates = [
  [[0, 0], [1, 0], [2, 0]], // Horizontal
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [0, 1], [0, 2]], // Vertical
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 1], [2, 2]], // Diagonal
  [[2, 0], [1, 1], [0, 2]]
]

function hasWon(game, move) {
  return winStates.some(winState => {
    return winState.every(coord => game[coord[0]][coord[1]] === move)
  });
}

function hasTied(game) {
  return game.every(row => row.every(cell => cell !== NONE));
}

function gameToAttachments(game, player1, player2, nextTurn) {
  return game.map((row, rowNum) => {
    const actions = row.map((cell, colNum) => {

      const value = {
        player1, player2, nextTurn,
        x: rowNum, y: colNum
      };

      return {
        type: 'button',
        name: `${rowNum} ${colNum}`,
        text: cell,
        value: JSON.stringify(value)
      }
    });

    return {
      fallback: 'actions',
      callback_id: "ttt_move",
      actions: actions
    }
  });
}

function attachmentToGame(attachments) {
  return attachments.map((attachment, rowNum) => {
    return attachment.actions.map((row, rowNum) => {
      return row.text;
    });
  });
}

function resultAttachment(game, text, color) {
  let gameString = '';
  game.forEach(row => {
    row.forEach(cell => {
      gameString += cell;
    });

    gameString += '\n';
  });

  return {
    fallback: gameString,
    title: text,
    text: gameString,
    color: color
  }
}

// Slash Command handler
slack.on('/ttt', (msg, bot) => {
  const mention = msg.text.match(/@(\S*)/);
  if (!mention) {
    bot.reply(FAILED_TO_FIND_USER, true);
    return;
  }

  const player1 = msg.user_name;
  const player2 = mention[1];

  if (player1 === player2) {
    bot.reply(PLAY_WITH_YOURSELF, true);
  }

  bot.send('users.list').then(users => {
    const isUser = users.members.filter(u => u.name === player2).length;
    if (!isUser) {
      bot.reply(FAILED_TO_FIND_USER, true);
      return;
    }

    let message = {
      text: `@${player1} ${X} vs ${O} @${player2}`,
      attachments: gameToAttachments(newGame, player1, player2, X)
    };

    bot.reply(message);
  }).catch(err => {
    bot.reply(FAILED_TO_FIND_USER, true);
  })
});


// Interactive Message handler
slack.on('ttt_move', (msg, bot) => {
  const actionUser = msg.user.name;

  let move, nextMove;
  const actionData = JSON.parse(msg.actions[0].value);
  let game = attachmentToGame(msg.original_message.attachments);

  const x = actionData.x;
  const y = actionData.y;

  if (game[x][y] !== NONE) {
    console.log('Cell already played.');
    return;
  }

  const player1 = actionData.player1;
  const player2 = actionData.player2;

  let otherPlayer;

  if (player1 === actionUser) {
    move = X;
    nextMove = O;
    otherPlayer = player2;
  } else if (player2 === actionUser) {
    move = O;
    nextMove = X;
    otherPlayer = player1;
  } else {
    console.log('Not a player of the game.');
    return;
  }

  if (move !== actionData.nextTurn) {
    console.log('Not their turn.');
    return;
  }

  // Play the move.
  game[x][y] = move;

  let message;

  // Game logic here.
  if (hasWon(game, move)) {
    message = {
      attachments: [
        resultAttachment(game, `:trophy: @${actionUser} ${move} ${getDefeatWord()} ${nextMove} @${otherPlayer}!`, '#7CD197')
      ]
    };
  } else if (hasTied(game)) {
    message = {
      attachments: [
        resultAttachment(game, `@${actionUser} ${move} tied with ${nextMove} @${otherPlayer}`, '#F35A00')
      ]
    };
  } else {
    message = {
      text: `@${player1} ${X} vs ${O} @${player2}`,
      attachments: gameToAttachments(game, player1, player2, nextMove)
    };
  }

  // public reply
  bot.reply(message);
});
