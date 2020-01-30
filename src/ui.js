'use strict';

// TODO: extract anonymous functions to Chess.UI member functions where it makes sense (e.g. drag&drop handlers)
// TODO: receive the div id as an argument
// TODO: implement getters for the most common selectors (which are now constants)
// TODO: show captured pieces next to the board
// TODO: tablet drag&drop
// TODO: click-click moving (=no drag&drop)

/**
 * Chess user interface implementation. A chessboard is created as a html table.
 * Chess pieces are created as html divs, and placed as children of the chessboard tds.
 * Dragging and dropping is implemented with jQuery UI's draggable.
 * Chess game state (position.js) and computer player (ai.js) are wired to the pieces. Computer is the black player.
 * @constructor
 */
Chess.UI = function() {
  /** @type {!Chess.Position} */
  this.chessPosition = new Chess.Position();

  /** @type {!Chess.AI} */
  this.ai = new Chess.AI();
};

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_ID = '#chessboard';

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_TABLE = Chess.UI.CHESSBOARD_ID + ' table';

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_SQUARE = Chess.UI.CHESSBOARD_ID + ' table tr td';

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_PIECE = Chess.UI.CHESSBOARD_SQUARE + ' div';

/**
 * @const
 * @type {string}
 */
Chess.UI.CHESSBOARD_PIECES_AND_SQUARES =
  Chess.UI.CHESSBOARD_SQUARE + ', ' + Chess.UI.CHESSBOARD_PIECE;

/**
 * Creates a new chessboard table under an element with id="chessboard"
 */
Chess.UI.makeBoard = function() {
  let table = $('<table>');
  let filesRow =
    '<tr><th></th>' +
    'abcdefgh'
      .split('')
      .map(
        /** @param {string} x @return {string} */ function(x) {
          return '<th class="file">' + x + '</th>';
        }
      )
      .join('') +
    '<th></th></tr>';
  table.append(filesRow);

  for (let row = 0; row < Chess.RANKS; ++row) {
    let rank = Chess.LAST_RANK - row;
    let tr = $('<tr>');
    table.append(tr);

    let rankCell = '<th class="rank">' + (Chess.RANKS - row) + '</th>';
    tr.append(rankCell);

    for (let file = 0; file < Chess.FILES; ++file) {
      let td = $('<td>');
      let color = Chess.isLight(rank, file) ? 'light' : 'dark';
      td.attr('id', Chess.getAlgebraic(rank, file));
      td.attr(
        'title',
        'Algebraic: ' +
          Chess.getAlgebraic(rank, file) +
          '\nRank: ' +
          rank +
          '\nFile: ' +
          file +
          '\nIndex: ' +
          Chess.getIndex(rank, file) +
          '\nColor: ' +
          color
      );
      td.addClass(color);
      tr.append(td);
    }

    tr.append(rankCell);
  }

  table.append(filesRow);
  $(Chess.UI.CHESSBOARD_ID).append(table);
};

/**
 * Clears move related classes from chessboard table cells
 */
Chess.UI.clearMoving = function() {
  $(Chess.UI.CHESSBOARD_PIECES_AND_SQUARES).removeClass(
    'from to positional capture double-push en-passant promotion castle king-castle queen-castle'
  );
};

/**
 * Removes dragging and dropping capabilities from chessboard table cells
 */
Chess.UI.clearDragging = function() {
  $(Chess.UI.CHESSBOARD_PIECE + '.ui-draggable').draggable('destroy');
  $(Chess.UI.CHESSBOARD_SQUARE + '.ui-droppable').droppable('destroy');
};

/** Adds chess pieces to the chessboard
 */
Chess.UI.prototype.updatePieces = function() {
  $(Chess.UI.CHESSBOARD_PIECE).remove();
  $(Chess.UI.CHESSBOARD_SQUARE).removeClass(
    'white black turn last-move ' + Chess.PIECE_NAMES.join(' ')
  );

  let whites = this.chessPosition.getColorBitboard(Chess.PieceColor.WHITE);
  let blacks = this.chessPosition.getColorBitboard(Chess.PieceColor.BLACK);

  for (let index = 0; index < Chess.RANKS * Chess.FILES; ++index) {
    let td = $('#' + Chess.getAlgebraicFromIndex(index));

    for (let piece = Chess.Piece.PAWN; piece <= Chess.Piece.KING; ++piece) {
      if (this.chessPosition.getPieceBitboard(piece).isSet(index)) {
        let isTurn =
          this.chessPosition.getTurnColor() === Chess.PieceColor.WHITE
            ? whites.isSet(index)
            : blacks.isSet(index);

        let div = $('<div>');
        div.attr(
          'title',
          td.attr('title') +
            '\nPiece: ' +
            Chess.PIECE_NAMES[piece] +
            '\nColor: ' +
            (whites.isSet(index) ? 'white' : 'black')
        );
        div.text(
          Chess.getPieceCharacter(
            piece,
            whites.isSet(index)
              ? Chess.PieceColor.WHITE
              : Chess.PieceColor.BLACK
          )
        );

        let elements = div.add(td);
        elements.addClass(Chess.PIECE_NAMES[piece]);
        elements.toggleClass('white', whites.isSet(index));
        elements.toggleClass('black', blacks.isSet(index));
        elements.toggleClass('turn', isTurn);

        td.append(div);

        break;
      }
    }
  }

  let lastMove = this.chessPosition.getLastMove();
  if (lastMove !== null) {
    $('#' + Chess.getAlgebraicFromIndex(lastMove.getFrom())).addClass(
      'last-move'
    );
    $('#' + Chess.getAlgebraicFromIndex(lastMove.getTo())).addClass(
      'last-move'
    );
    // TODO: en passant, castling
  }
};

/**
 * Adds chessboard cell hover, and chess piece dragging and dropping capabilities to the chessboard
 */
Chess.UI.prototype.updateMoves = function() {
  let moves = this.chessPosition.getMoves();

  $('#moves').html(
    '<a href="#" id="undo" class="' +
      (this.chessPosition.canUndo() ? 'can' : 'cannot') +
      '">undo</a><br/>' +
      '<a href="#" id="auto" class="' +
      (moves.length > 0 ? 'can' : 'cannot') +
      '">auto</a><br/>' +
      moves
        .map(
          /**
           * @param {!Chess.Move} move
           * @param {number} index
           * @return {string}
           */
          function(move, index) {
            return (
              '<a href="#" id="' + index + '">' + move.getString() + '</a><br/>'
            );
          }
        )
        .join('')
  );

  $(Chess.UI.CHESSBOARD_PIECES_AND_SQUARES).removeClass('can-move');
  moves.forEach(
    /** @param {!Chess.Move} move */ function(move) {
      let td = $('#' + Chess.getAlgebraicFromIndex(move.getFrom()));
      let elements = td.add(td.children());
      elements.addClass('can-move');
    }
  );

  /** @type {boolean} */
  let dragging = false;
  let ui = this;

  $(Chess.UI.CHESSBOARD_PIECE + '.can-move')
    .mouseenter(
      /** @this {!Element} */ function(event) {
        if (dragging) {
          return;
        }

        let div = $(this);
        let td = div.parent();
        let from = Chess.getIndexFromAlgebraic('' + td.attr('id'));
        let fromElements = td.add(div);
        fromElements.toggleClass(
          'from',
          moves.some(
            /** @param {!Chess.Move} move @return {boolean} */ function(move) {
              return move.getFrom() === from;
            }
          )
        );

        if (fromElements.hasClass('from')) {
          moves.forEach(
            /** @param {!Chess.Move} move */ function(move) {
              if (move.getFrom() === from) {
                let toElements = $(
                  '#' + Chess.getAlgebraicFromIndex(move.getTo())
                );
                toElements = toElements.add(toElements.children());
                toElements.addClass('to');
                toElements.addClass(
                  move.getKind() === Chess.Move.Kind.POSITIONAL
                    ? 'positional'
                    : ''
                );
                toElements.addClass(move.isCapture() ? 'capture' : '');
                toElements.addClass(
                  move.getKind() === Chess.Move.Kind.DOUBLE_PAWN_PUSH
                    ? 'double-push'
                    : ''
                );
                toElements.addClass(
                  move.getKind() === Chess.Move.Kind.EN_PASSANT_CAPTURE
                    ? 'en-passant'
                    : ''
                );
                toElements.addClass(move.isPromotion() ? 'promotion' : '');
                toElements.addClass(move.isCastle() ? 'castle' : '');
                toElements.addClass(
                  move.getKind() === Chess.Move.Kind.KING_CASTLE
                    ? 'king-castle'
                    : ''
                );
                toElements.addClass(
                  move.getKind() === Chess.Move.Kind.QUEEN_CASTLE
                    ? 'queen-castle'
                    : ''
                );
              }
            }
          );

          Chess.UI.clearDragging();

          // Quote "drop", "start", "stop", etc to prevent the closure compiler from removing them
          $(Chess.UI.CHESSBOARD_SQUARE + '.to').droppable({
            drop: /** @this {!Element} */ function() {
              let to = Chess.getIndexFromAlgebraic('' + $(this).attr('id'));
              let makeMoves = moves.filter(
                /** @param {!Chess.Move} move */ function(move) {
                  return move.getFrom() === from && move.getTo() === to;
                }
              );

              if (makeMoves.length > 0) {
                // TODO: it's possible that there is more than one move (promotions). Either ask the user here or have a droplist somewhere ("promote to")
                ui.chessPosition.makeMove(makeMoves[0]);
                ui.updateChessPosition();
              } else {
                // Dropped to an invalid square
                Chess.UI.clearMoving();
                Chess.UI.clearDragging();
              }
            }
          });

          div.draggable({
            start: function() {
              dragging = true;
            },
            stop: function() {
              dragging = false;
            },
            containment: Chess.UI.CHESSBOARD_TABLE,
            zIndex: 10,
            revert: 'invalid'
          });
        }
      }
    )
    .mouseleave(function() {
      if (!dragging) {
        Chess.UI.clearMoving();
      }
    });

  $('#moves a').click(function() {
    let id = $(this).attr('id');
    if (id === 'undo') {
      ui.chessPosition.unmakeMove(); // computer (black) move
      ui.chessPosition.unmakeMove(); // user (white) move
      ui.updateChessPosition();
    } else if (id === 'auto') {
      ui.doComputerMove();
    } else {
      ui.chessPosition.makeMove(moves[parseInt(id, 10)]);
      ui.updateChessPosition();
    }
  });
};

/**
 * @throws {Error}
 */
Chess.UI.prototype.doComputerMove = function() {
  $('#moves').html('');
  let ui = this;
  let dim = $('#dim');
  dim.fadeIn(function() {
    let move = ui.ai.search(ui.chessPosition);
    if (!move) {
      // Mates should have been checked in updateChessPosition
      throw new Error('Move not found');
    }

    ui.chessPosition.makeMove(move);
    let from = $('#' + Chess.getAlgebraicFromIndex(move.getFrom()));
    let to = $('#' + Chess.getAlgebraicFromIndex(move.getTo()));
    let dx = to.offset().left - from.offset().left;
    let dy = to.offset().top - from.offset().top;
    let piece = from.children('div');
    piece.css({ position: 'relative', top: '0px', left: '0px' });

    dim.fadeOut(function() {
      piece.animate({ top: dy + 'px', left: dx + 'px' }, function() {
        ui.updateChessPosition();
      });
    });
  });
};

/**
 * Updates the chessboard according to the current chess position
 */
Chess.UI.prototype.updateChessPosition = function() {
  Chess.UI.clearMoving();
  Chess.UI.clearDragging();
  this.updatePieces();

  let status = this.chessPosition.getStatus();
  if (
    status === Chess.Position.Status.NORMAL &&
    this.chessPosition.getTurnColor() === Chess.PieceColor.BLACK
  ) {
    this.doComputerMove();
  } else {
    this.updateMoves();
    $('#dim').css({ display: 'none' });

    if (status === Chess.Position.Status.CHECKMATE) {
      $('#moves').append(
        '&#35;<br/>' + (this.chessPosition.getTurnColor() ? '1-0' : '0-1')
      );
    } else if (status !== Chess.Position.Status.NORMAL) {
      $('#moves').append('&frac12;-&frac12;');
    }
  }
};

/**
 * Creates a new chessboard and sets up the game at the standard chess initial position.
 */
function makeChessGame() {
  Chess.UI.makeBoard();
  let ui = new Chess.UI();
  ui.updateChessPosition();
}
