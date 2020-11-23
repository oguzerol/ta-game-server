const io = require("socket.io")(5000, {
  cors: {
    origin: "*",
  },
});
const {
  PLAYER,
  createNewGame,
  joinGame,
  findGame,
  makeAttempt,
  leaveGame,
} = require("./utils");

//Fake DB
let gamesState = [];

const onLeave = (state, id) => {
  const [newState, updatedGame] = leaveGame(state, id);
  gamesState = newState;
  if (updatedGame) {
    io.to(updatedGame.id).emit("game", updatedGame);
  }
};

io.on("connection", (socket) => {
  socket.on("create-game", ({ user, isSingleUser }) => {
    socket.userId = user.id;
    if (isSingleUser) {
      const game = createNewGame({ user, isSingleUser });
      gamesState.push(game);
      socket.join(game.id);
      io.to(game.id).emit("game", game);
    } else {
      const startedGame = gamesState.find(
        (game) => game.playerTwo === null && game.winner === null
      );
      if (!startedGame) {
        const game = createNewGame({ user });
        gamesState.push(game);
        socket.join(game.id);
        io.to(game.id).emit("game", game);
      } else {
        gamesState = joinGame(gamesState, startedGame.id, user);
        socket.join(startedGame.id);
        io.to(startedGame.id).emit(
          "game",
          findGame(gamesState, startedGame.id)
        );
      }
    }
  });

  socket.on("make-attempt", (attempt) => {
    gamesState = makeAttempt(gamesState, attempt);
    const game = findGame(gamesState, attempt.gameId);
    io.to(attempt.gameId).emit("game", game);

    if (game.playerTwo && game.playerTwo.id === PLAYER.id) {
      setTimeout(() => {
        const fakeAttempt = {
          gameId: attempt.gameId,
          user: PLAYER,
          number: [-1, 0, 1][Math.floor(Math.random() * 3)],
        };
        gamesState = makeAttempt(gamesState, fakeAttempt);

        io.to(attempt.gameId).emit(
          "game",
          findGame(gamesState, attempt.gameId)
        );
      }, 600);
    }
  });

  socket.on("page-leave", () => onLeave(gamesState, socket.userId));
  socket.on("disconnect", () => onLeave(gamesState, socket.userId));
});
