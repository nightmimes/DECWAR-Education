/*
  KIM NGUYEN
  KEL SHANG
  AET350C
  11/18/2025
  VER 1.2

  DECWAR DEMO - EDUCATIONAL APP DISPLAYED IN ONE OF THE FOUR MONITOR CONSOLE

  UPDATES: 
  - Display the warning prompts or invalid message in red color font (the rest is green)
  - Fixed the "F" glyph that duplicated or had a remaining clone when entering out of demo
  - Added "practice" command to skip demo and go straight into testing commands
  - Spaced out narrative/dialog for better readability
  - Added more evaluations during demo so when asked to do a certain cmd, player does not try to commit another cmd
  - Redid parts of narrative so it makes clearer sense and also draws more info to real game

  SOURCES LISTED IN FINAL PROPOSAL
  **USED CHAPGPT TO UNDERSTAND HOW TO IMPLEMENT IN A TERMINAL PANEL AND EVALUATE INPUTS
*/

// ---- p5 sketch (updated) ----
let grid;
let panelWidth = 380;          // widened panel
let messages = [];
let inputText = "";
const validCommands = ['move', 'attack', 'dock', 'capture', 'build', 'help', 'demo', 'practice'];

//  --- MOVING CMD ---
let awaitingMoveInput = false;                  // are we waiting for coordinates?
let moveGlyph = { type: 'text', value: 'F' };   // glyph to move
let currentPos = { col: 1, row: 1 };            // current position of the glyph

//  --- ATTACK CMND ---
let awaitingAttackInput = false;
let attackedTargets = new Map();                 // key: "row,col", value: true if attacked

//  --- CAPTURE CMD ---
let awaitingCaptureInput = false;
let capturedBases = new Map(); // track coordinates of all "<>" bases for dock logic later

// --- BUILD CMND ---
let awaitingBuildInput = false;
let buildProgress = new Map();  // key: "row,col" -> number (0..5)

// --- DOCK CMND ---
let awaitingDockInput = false;

// WALKTHROUGH CONDITIONS
displayWalkthrough = true;
walkthroughStep = 0;

moveDemo = false;
attackDemo = false;

awaitingMoveCmd = false; // condition requiring user to explore move cmd
awaitingAttackCmd = false; // condition requiring user to explore attack cmd
awaitingCaptureCmd = false; // cond req user to expore capture cmd
awaitingBuildCmd = false; // cond req user to explore build cmd
awaitingDockCmd = false; // cond req user to explore dock cmd
beginDemoConclusion = false; // sets condition to transition to walkthrough conclusion

stepOne = false;
stepTwo = false;


function setup() {
  createCanvas(1000, 480);
  textFont('monospace');

  // Grid: keep it left of the panel. Ensure top-left is a bit of a margin.
  grid = new Grid({ cells: 8, cellSize: 48 });
  grid.setGlyph(1, 1, { type: 'text', value: 'F' }); // define A glyph
  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', col: color(255), value: '@' }); // define planet glyph
  grid.setGlyph(3, 3, { type: 'text', value: '★' }); // define star glyph

  // removed the glyph at (3,5) per your request (was previously '⩥')
  grid.setOrigin(1, 1);

  walkthroughConditions();
}

function draw() {
  background(20);

  // Draw grid on left side; x chosen so grid and panel never overlap
  // grid size = cells * cellSize = 8 * 48 = 384
  // place grid at x = 40 so it sits comfortably left of the panel
  grid.draw(40, 40);

  // Draw command panel inside the same canvas (right side)
  drawCommandPanel();
}

function drawCommandPanel() {
  const x = width - panelWidth;
  const margin = 14;

  // panel background
  noStroke();
  fill(0);
  rect(x, 0, panelWidth, height);

  // panel title
  fill(51, 255, 0);
  textSize(20);
  textAlign(LEFT, TOP);
  text("DECWAR TERMINAL", x + margin, 12);

  // messages area
  fill(51, 255, 0);
  textSize(13);
  textLeading(18);

  // compute how many lines fit and show the last N messages
  const topY = 36;
  const bottomReserve = 56; // space reserved for input box
  const availableHeight = height - topY - bottomReserve - margin;
  const lineHeight = 18;
  const visibleLines = Math.floor(availableHeight / lineHeight);

  // we need to word-wrap messages so they don't overflow horizontally.
  // A helper to split long messages into lines that fit the panel width
  const maxTextWidth = panelWidth - margin * 2;
  const lines = [];
  for (let m of messages) {
    lines.push(...wrapTextToLines(m, maxTextWidth, textSize()));
  }

  const start = max(0, lines.length - visibleLines);
  let y = topY;

  //  changes text color if normal or error
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    if (line.warning) {
      fill(255, 0, 0);   // red
    } else {
      fill(51, 255, 0);    // green
    }

    text(line.text, x + margin, y);
    y += lineHeight;
  }

  // input box background
  const inputY = height - 40;
  fill(0);
  stroke(60);
  strokeWeight(1);
  noStroke();

  // prompt and typed input (with blinking cursor)
  if (walkthroughStep === 4) { // if command walkthrough step 
    fill(255); // white text
  } else { // otherwise
    fill(51, 255, 0); // green text
  }
  textSize(14);
  textAlign(LEFT, CENTER);

  const cursorStill = "_";
  const cursor = (frameCount % 30 < 15) ? "_" : "";
  // show truncated input if too long
  const invisiblePrefix = ""; // not needed now; we will clip by manual trimming
  let displayed = inputText;

  // ensure displayed fits within width; trim front if needed
  while (textWidth("> " + displayed + cursor) > (panelWidth - margin * 2 - 12) && displayed.length > 0) {
    displayed = displayed.substring(1);
  }

  if (walkthroughStep <= 4 || walkthroughStep === 9 || walkthroughStep === 10 || walkthroughStep === 12 || walkthroughStep === 14 || walkthroughStep === 16 || walkthroughStep === 17 || walkthroughStep === 19) {
    text("> " + "🔒", x + margin + 6, inputY + 9); // display lock icon
  }
  else if (walkthroughStep === 4) {
    text("> " + displayed + cursorStill, x + margin + 6, inputY + 9); // display still cursor
  }
  else {
    text("> " + displayed + cursor, x + margin + 6, inputY + 9); // display blinking cursor
  }

  textSize(9);

  // subtle guidance text
  if (walkthroughStep === 5) { // if command walkthrough step 
    fill(255); // white text
    text("This is where you’ll type in your commands to control your game", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 8) {
    fill(255); // white text
    text("Type in “move” in the command panel", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 10) { // introducing attack command
    fill(255); // white text
    text("Remember to use the move cmd in to be near target", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 11) { // instructing user to use attack command
    fill(255); // white text
    text("Attack all stars before your next task", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 13) { // instructing user to use capture command
    fill(255); // white text
    text("When you are ready to capture, type “capture”", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 15) {
    fill(255);
    text("On your captured planet, type “build”", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 18) {
    fill(255);
    text("Type 'dock' to dock your ship at base", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 20) {
    fill(255);
    text("Press ENTER to play DECWAR!", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 1 || walkthroughStep === 6 || walkthroughStep === 7 || walkthroughStep === 9 || walkthroughStep === 10 || walkthroughStep === 13 || walkthroughStep === 14 || walkthroughStep === 16 || walkthroughStep === 17) { // disable cmd input
    fill(255);
    text("See DECWAR TERMINAL above [Press ENTER to continue]", x + margin + 6, height - 50);
  }
  else if (walkthroughStep === 2 || walkthroughStep === 3 || walkthroughStep === 4) { // disable cmd input
    fill(255);
    text("Press ENTER to continue", x + margin + 6, height - 50);
  }
  else { // otherwise
    fill(51, 255, 0); // green text
    text("Type command and press Enter", x + margin + 6, height - 50);
  }
}

// wrap a message string to an array of lines that fit within maxWidth
function wrapTextToLines(str, maxWidth, baseTextSize = 13) {
  if (typeof str === "object" && str.text) {
    return wrapTextToLines(str.text, maxWidth, baseTextSize).map(t => ({
      text: t,
      warning: str.warning
    }));
  }

  push();
  textSize(baseTextSize);
  const words = String(str).split(/\s+/);
  const out = [];
  let line = "";
  for (let w of words) {
    const test = line ? (line + " " + w) : w;
    if (textWidth(test) <= maxWidth) {
      line = test;
    } else {
      if (line) out.push(line);
      // if single word is wider than maxWidth, hard-split it:
      if (textWidth(w) > maxWidth) {
        let chunk = "";
        for (let ch of w) {
          const testChunk = chunk + ch;
          if (textWidth(testChunk) <= maxWidth) {
            chunk = testChunk;
          } else {
            out.push(chunk);
            chunk = ch;
          }
        }
        if (chunk) line = chunk;
        else line = "";
      } else {
        line = w;
      }
    }
  }
  if (line) out.push(line);
  pop();
  return out;
}

function inputLocked() { // locks cmd input
  return walkthroughStep <= 5 ||
    walkthroughStep === 6 ||
    walkthroughStep === 7 ||
    walkthroughStep === 9 ||
    walkthroughStep === 10 ||
    walkthroughStep === 14 ||
    walkthroughStep === 16 ||
    walkthroughStep === 17 ||
    walkthroughStep === 19 ||
    walkthroughStep === 20;
}


// --- Keyboard input handling ---
function keyTyped() {
  if (inputLocked()) { // if cmd input locked
    return; // do nothing
  }

  if (keyCode === ENTER) return; // handled in keyPressed
  if (key.length === 1 && inputText.length < 200) {
    inputText += key;
  }
}

function walkthroughConditions() {
  if (displayWalkthrough) { // walkthrough demo 
    if (!awaitingMoveCmd && !awaitingAttackCmd && !awaitingCaptureCmd && !awaitingBuildCmd && !awaitingDockCmd) {
      walkthroughStep++; // move to the next line of the walkthrough
    }
  }

  if (walkthroughStep === 1) {
    addMsg("DECWAR is a real time space battle game designed to be played by from 1 to 10 people.");
    addMsg("[Press ENTER to continue]");
  }
  else if (walkthroughStep === 2) {
    addMsg("‍>");
    addMsg("Today, you will be playing a simple version of DECWAR which offers the basics and commonly used commands. You will learn how to type in the terminal which will control your spaceship and actions.");
  }
  else if (walkthroughStep === 3) {
    addMsg(">");
    addMsg("The object of the game is to destroy all enemy bases and ships, and capture all enemy planets, before the enemy does the same to you.");
  }
  else if (walkthroughStep === 4) {
    addMsg(">");
    addMsg("Each person plays on a separate terminal, and enters the game by selecting what team they want: Federation or Empire");
  }
  else if (walkthroughStep === 6) {
    addMsg(">");
    addMsg("For easy and quick demo, let's say you have been recruited to the Federation side...");
  }
  else if (walkthroughStep === 7) {
    addMsg(">");
    addMsg("Please find your ship on the grid map ('F') and let's get started on your first task.");
    addMsg("--------------------------------------------");
  }
  else if (walkthroughStep === 8) {
    addMsg("Your first task is to move!");
    awaitingMoveCmd = true; // req task condition
  }
  else if (walkthroughStep === 9) {
    addMsg("--------------------------------------------");
    addMsg("Your next task is to attack a star!");
  }
  else if (walkthroughStep === 10) {
    addMsg(">");
    addMsg("You must be next to the object before you can attack!");
  }
  else if (walkthroughStep === 11) {
    addMsg(">");
    addMsg("When you are next to the object and ready to attack, type “attack”");
    awaitingAttackCmd = true; // req task cond
  }
  else if (walkthroughStep === 12) {
    addMsg("--------------------------------------------");
    addMsg("Now your task is to capture a planet!");
  }
  else if (walkthroughStep === 13) {
    addMsg(">");
    addMsg("In order to capture, you must be next to the planet and attack it first!");
    awaitingCaptureCmd = true; // req task cond
  }
  else if (walkthroughStep === 14) {
    addMsg("--------------------------------------------");
    addMsg("Now that you have captured a planet, it is time to build a base where your team can dock peacefully, allowing them to regain stats and repair ships");
  }
  else if (walkthroughStep === 15) {
    addMsg(">");
    addMsg("Your next task is to build your base on the captured planet");
    awaitingBuildCmd = true; // req task cond
  }
  else if (walkthroughStep === 16) {
    addMsg("--------------------------------------------");
    addMsg(`Congrats on your first base! Keep in mind that the real-game has different base level. You can contiously build the same base to increase its level which will stengthen and benefit you and your team when docking by!`);
  }
  else if (walkthroughStep === 17) {
    addMsg(">");
    addMsg("You can dock by captured planets or team bases in order to regain your stats. The higher level your base is, the more difficult it is for the enemy to capture!");
  }
  else if (walkthroughStep === 18) {
    addMsg("--------------------------------------------");
    addMsg("For your last task, you must learn how to dock your ship in order to regain your stats and repair your ship");
    awaitingDockCmd = true; // req task cond
  }
  else if (walkthroughStep === 19) {
    addMsg("--------------------------------------------");
    addMsg("Nice work Cadet! You just completed the simple version of DECWAR, proving that you are more than capable in playing the actual version!");
  }
  else if (walkthroughStep === 20) {
    addMsg(">");
    addMsg("Since our training has come to an end, you may use this panel to practice executing commands! Just press 'ENTER' to continue practicing or to restart the 'demo'!");
  }
  else if (walkthroughStep === 21) { // pressed enter to play
    addMsg(">");
    addMsg("Feeling stuck? Type in 'help' or 'demo'");
    showMenu(); // show cmd options
    displayWalkthrough = false; // ends task walkthrough demo

    afterDemoGrid();
  }
}

function afterDemoGrid() {
  // GRID PRACTICE AFTER DEMO
  grid = new Grid({ cells: 8, cellSize: 48 });
  grid.setGlyph(1, 1, { type: 'text', value: 'F' });

  // Reset movement tracking
  currentPos = { row: 1, col: 1 };

  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', col: color(255), value: '@' });
  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', col: color(255), value: '@' });
  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', value: '★' });
  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', value: '★' });
  grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', value: '★' });
}

function keyPressed() {

  if (keyCode === BACKSPACE) {
    inputText = inputText.slice(0, -1);
  }
  else if (keyCode === ENTER) {


    if (displayWalkthrough && inputText.trim() === "") { // tasks ongoing AND text entry empty
      if (!awaitingMoveInput && !awaitingAttackInput && !awaitingCaptureInput && !awaitingBuildInput) { // command not receiving input
        walkthroughConditions(); // conditions for walkthrough step 
      }
    } else if (inputText.trim() !== "") {
      processCommand(inputText.trim().toLowerCase());
    }
    inputText = "";
  }
}

// --- Command logic ---
function processCommand(cmd) {

  if (cmd === "") return;
  addMsg("> " + cmd);

  // If waiting for coordinates after "move"
  if (awaitingMoveInput) {
    handleMoveInput(cmd);
    return;
  }

  //  If waiting for coor after "attack"
  if (awaitingAttackInput) {
    handleAttackInput(cmd);
    return;
  }

  // If waiting for coordinates after "capture"
  if (awaitingCaptureInput) {
    handleCaptureInput(cmd);
    return;
  }

  // If waiting for coordinates after "build"
  if (awaitingBuildInput) {
    handleBuildInput(cmd);
    return;
  }

  //  If waiting for coordinates after "dock"
  if (awaitingDockInput) {
    handleDockInput(cmd);
    return;
  }

  // Disable all commands except for 'move' during walkthrough step 8
  if (walkthroughStep === 8) {
    if (cmd !== "move" && cmd !== "demo" && cmd !== "practice") {
      addMsg("During this step, only the 'move' command is allowed.", true);
      return;
    }
  }

  // Disable all commands except for 'attack' during walkthrough step 11
  if (walkthroughStep === 11) {
    if (cmd !== "attack" && cmd !== "move" && cmd !== "demo" && cmd !== "practice") {
      addMsg("During this step, only the 'attack' and 'move' command is allowed.", true);
      return;
    }
  }

  // Disable 'build' during when asking user to capture
  if (walkthroughStep === 13) {
    if (cmd === "build" || cmd === "dock") {
      addMsg("It is not time to build or dock yet! Complete your capture task first.", true);
      return;
    }
  }

  // Disable 'dock' during when asking user to capture
  if (walkthroughStep === 15 && cmd === "dock") {
    addMsg("It is not time to dock yet! Complete your build base task and press 'ENTER' once you are done!", true);
    return;
  }

  if (validCommands.includes(cmd)) {
    performAction(cmd);
  } else {
    addMsg("Unrecognized command.", true);
    if (!displayWalkthrough) {
      showMenu();
    }
  }
}

function performAction(cmd) {

  switch (cmd) {
    case 'move':
      addMsg("《✧》Where do you want to move? Enter coordinates (col row) eg. '3 5'");
      awaitingMoveInput = true; // Wait for next input
      return; // Stop here until coordinates come in
    case 'attack':
      addMsg("《✧》Which coordinate do you want to attack? Enter coordinates (col row).");
      awaitingAttackInput = true; // wait for input
      return; // Stop here until coordinates come in
    case 'dock':
      addMsg("《✧》Where do you want to dock? Enter coordinates (col row).");
      awaitingDockInput = true;
      return;
    case 'capture':
      addMsg("《✧》Which coordinate do you want to capture? Enter coordinates (col row).");
      awaitingCaptureInput = true; // wait for coordinates
      return; // Stop here until coordinates come in
    case 'build':
      addMsg("《✧》Which coordinate do you want to build at? Enter coordinates (col row).");
      awaitingBuildInput = true; // wait for coordinates
      return; // stop until coordinates provided
    case 'help':
      showMenu();
      return;
    case 'practice':
      displayWalkthrough = false;
      walkthroughStep = 22;
      afterDemoGrid();
      showMenu();
      return;
    case 'demo':
      addMsg("--------------------------------------------");

      // walkthrough demo cond true
      displayWalkthrough = true;

      // reset walkthrough task conds
      awaitingMoveCmd = false;
      awaitingAttackCmd = false;
      awaitingCaptureCmd = false;
      awaitingBuildCmd = false;
      awaitingDockCmd = false;

      awaitingMoveInput = false;
      awaitingAttackInput = false;
      awaitingCaptureInput = false;
      awaitingBuildInput = false;
      beginDemoConclusion = false;

      // GRID PRACTICE AFTER DEMO
      grid = new Grid({ cells: 8, cellSize: 48 });
      grid.setGlyph(1, 1, { type: 'text', value: 'F' });

      // Reset movement tracking
      currentPos = { row: 1, col: 1 };

      grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', col: color(255), value: '@' });
      grid.setGlyph(Math.floor(random(1, 8)), Math.floor(random(1, 8)), { type: 'text', value: '★' });

      // reset task step 
      walkthroughStep = 0;

      // clear terminal msgs
      messages = [];

      // trigger the first message "Welcome to DecWar!"
      walkthroughConditions();

      return;
  }

  if (displayWalkthrough && beginDemoConclusion) { // if dock task completed demo
    addMsg("Action complete [Press ENTER to continue]");
  } else {
    addMsg("Action complete.");
  }

  if (!displayWalkthrough) {
    showMenu(); // if not walkthrough demo
  }
}


function showMenu() {
  addMsg("--------------------------------------------");
  addMsg("Available commands: move, attack, capture, build, dock, help, demo, practice");
  console.log(random(8));
}

function addMsg(txt, isWarning = false) {
  messages.push({ text: txt, warning: isWarning });
  if (messages.length > 400) messages.shift();
}

// ---- Grid class ----
class Grid {
  constructor({ cells = 8, cellSize = 32 } = {}) {
    this.cells = cells | 0;
    this.cellSize = cellSize | 0;
    this.sizePx = this.cells * this.cellSize;
    this.originRow = 1;
    this.originCol = 1;
    this._glyphs = new Map();
    this.bgColor = color(0);
    this.gridColor = color(51, 255, 0);
    this.textColor = color(51, 255, 0);
    this.gridWeight = 1;
    this.fontSize = Math.max(10, Math.floor(this.cellSize * 0.28));
    this.axisGap = Math.ceil(this.fontSize * 1.2);
  }

  setGlyph(row, col, glyph) { this._glyphs.set(`${row},${col}`, glyph); }
  clearGlyph(row, col) { this._glyphs.delete(`${row},${col}`); }
  clearAllGlyphs() { this._glyphs.clear(); }
  setOrigin(row, col) { this.originRow = row | 0; this.originCol = col | 0; }

  _cellTopLeft(x0, y0, row, col) {
    const col0 = col - 1;
    const row0_fromTop = (this.cells - row);
    const x = x0 + col0 * this.cellSize;
    const y = y0 + row0_fromTop * this.cellSize;
    return { x, y };
  }

  draw(x, y) {
    const w = this.sizePx;
    const h = this.sizePx;

    noStroke();
    fill(this.bgColor);
    rect(x, y, w, h);

    stroke(this.gridColor);
    strokeWeight(this.gridWeight);
    for (let i = 0; i <= this.cells; i++) {
      const vx = x + i * this.cellSize;
      line(vx, y, vx, y + h);
    }
    for (let j = 0; j <= this.cells; j++) {
      const hy = y + j * this.cellSize;
      line(x, hy, x + w, hy);
    }

    noStroke();
    fill(this.textColor);
    textSize(this.fontSize);

    textAlign(CENTER, TOP);
    const bottomY = y + h + Math.floor(this.gridWeight);
    for (let col = 1; col <= this.cells; col++) {
      const label = this.originCol + (col - 1);
      const cx = x + (col - 0.5) * this.cellSize;
      text(label, cx, bottomY + 4);
    }

    textAlign(RIGHT, CENTER);
    const leftX = x - 6;
    for (let row = 1; row <= this.cells; row++) {
      const label = this.originRow + (row - 1);
      const { y: cyTop } = this._cellTopLeft(x, y, row, 1);
      const cy = cyTop + this.cellSize * 0.5;
      text(label, leftX, cy);
    }

    textAlign(CENTER, CENTER);
    for (let [key, g] of this._glyphs.entries()) {
      const [row, col] = key.split(',').map(Number);
      const { x: cx, y: cy } = this._cellTopLeft(x, y, row, col);
      const midX = cx + this.cellSize * 0.5;
      const midY = cy + this.cellSize * 0.5;

      if (g.type === 'text') {
        push();
        noStroke();
        fill(255);
        textSize(this.fontSize * 1.2);
        text(g.value, midX, midY);
        pop();
      }
    }
  }
}

/* ------------------------------------------------------------ */
//  MOVING CMD - HELPER FUNCTION
function handleMoveInput(cmd) {
  const parts = cmd.split(/\s+/);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    addMsg("Invalid input. Enter two numbers like '3 5'.", true);
    return; // Still waiting for valid input
  }

  const col = parseInt(parts[0]);
  const row = parseInt(parts[1]);

  if (row < 1 || row > 8 || col < 1 || col > 8) {
    addMsg("Coordinates out of range (1–8). Type it again:", true);
    return; // Still waiting
  }

  // Check if destination cell is already occupied
  const cellKey = `${row},${col}`;
  if (grid._glyphs.has(cellKey)) {
    addMsg(`That cell (${col}, ${row}) is already occupied! Type in another location.`, true);
    return; // Stay in move input mode
  }

  // Prevent moving on top of a base ("<>")
  const destGlyph = grid._glyphs.get(cellKey);
  if (destGlyph && destGlyph.value === '<>') {
    addMsg("You cannot move onto your base '<>'.", true);
    return;
  }

  // Clear previous position and draw at new one
  grid.clearGlyph(currentPos.row, currentPos.col);
  grid.setGlyph(row, col, moveGlyph);

  // Save the new position
  currentPos = { row, col };

  if (displayWalkthrough && walkthroughStep <= 8) { // if walkthrough move demo
    addMsg(`Unit moved to (${col}, ${row}). Nice job!`);
    addMsg("--------------------------------------------");
    awaitingMoveInput = false;
    addMsg("When you’re done exploring the move command");
    addMsg("[Press ENTER to continue]");
    awaitingMoveCmd = false; // sets move demo completion cond to false to continue tasks
  } else if (!displayWalkthrough || walkthroughStep >= 9) {
    addMsg(`Unit moved to (${col}, ${row})!`);
    awaitingMoveInput = false;
  } else if (!displayWalkthrough) {
    addMsg(`Unit moved to (${col}, ${row}).`);
    awaitingMoveInput = false;
    addMsg("Action complete.");
    showMenu();
  }
}

/* ------------------------------------------------------------ */
//  ATTACK CMD - HELPER FUNCTION
function handleAttackInput(cmd) {

  const parts = cmd.split(/\s+/);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    addMsg("Invalid input. Enter two numbers like '3 5'", true);
    return; // Still waiting for valid input
  }

  const col = parseInt(parts[0]);
  const row = parseInt(parts[1]);

  if (row < 1 || row > 8 || col < 1 || col > 8) {
    addMsg("Coordinates out of range (1–8). Try again:", true);
    return;
  }

  const targetKey = `${row},${col}`;
  const targetGlyph = grid._glyphs.get(targetKey);

  // Check if there's actually something there to attack
  if (!targetGlyph) {
    addMsg("No target found at that location!", true);
    awaitingAttackInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // Check if player’s glyph “A” is adjacent (1 tile away in any direction)
  const dx = Math.abs(col - currentPos.col);
  const dy = Math.abs(row - currentPos.row);
  const isAdjacent = (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0));

  if (!isAdjacent) {
    if (displayWalkthrough) {
      addMsg("Target too far! You must be next to the target to attack."), true;
      addMsg("--------------------------------------------");
      addMsg("HINT: 'move' next to other objects");
    } else {
      addMsg("Target too far! You must be next to the target to attack.", true);
      showMenu();
    }
    awaitingAttackInput = false;
    return;
  }

  // Determine what type of glyph is being attacked
  const targetType = targetGlyph.value;

  //  Stops player from attacking planet first before stars in demo
  if (walkthroughStep === 11) {
    if (targetType === '@') {
      addMsg("In this task, you must attack stars '★' only!", true);
      addMsg("[Press ENTER to continue]");
      awaitingAttackInput = false;
      return;
    }
  }

  // === Case 1: Attacking a star ("★") ===
  if (targetType === '★') {
    if (displayWalkthrough) { // if walkthrough demo
      addMsg(`You destroyed a star '★' at (${col}, ${row})`);
    } else if (!displayWalkthrough) { // if actual game
      addMsg(`You destroyed a star '★' at (${col}, ${row})`);
    }

    grid.clearGlyph(row, col); // remove the target
    awaitingAttackInput = false;

    if (displayWalkthrough) { // if walkthrough demo
      addMsg("Good job! Let's proceed to next task:");
      addMsg("[Press ENTER to continue]");
      awaitingAttackCmd = false; // allow tasks to cont
    } else { // otherwise
      addMsg("Action complete.");
      showMenu();
    }
    return;
  }

  // === Case 2: Attacking an enemy base ("@") ===
  if (targetType === '@') {
    // Check if it's already been attacked once before
    const wasAttacked = attackedTargets.get(targetKey);

    if (!wasAttacked) {
      // First attack — mark as attacked
      attackedTargets.set(targetKey, true);
      addMsg(`You attacked the @ at (${col}, ${row})! It's damaged and ready for capture.`);
    } else {
      // Already attacked — remind player
      addMsg(`The @ at (${col}, ${row}) has already been attacked. You can capture it now.`);
    }

    //  === Case 2: Cannot attack your captured base ("<>") ===
    if (targetGlyph.value === '@F') {
      addMsg("You cannot attack your planet '@F'", true);
      awaitingAttackInput = false;
      if (!displayWalkthrough) {
        showMenu();
      }
      return;
    }

    awaitingAttackInput = false;
    if (!displayWalkthrough) { // if not demo
      showMenu(); // show cmd options
    }
    return;
  }

  // === Case 3: Any other glyphs ===
  addMsg("You can only attack '@' or '★' glyphs!", true);
  awaitingAttackInput = false;
  if (!displayWalkthrough) {
    showMenu();
  }
}

/* ------------------------------------------------------------ */
//  CAPTURE CMD - HELPER FUNCTION
function handleCaptureInput(cmd) {
  const parts = cmd.split(/\s+/);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    addMsg("Invalid input. Enter two numbers like '3 5'", true);
    return;
  }

  const col = parseInt(parts[0]);
  const row = parseInt(parts[1]);

  if (row < 1 || row > 8 || col < 1 || col > 8) {
    addMsg("Coordinates out of range (1–8). Try again:", true);
    return;
  }

  const targetKey = `${row},${col}`;
  const targetGlyph = grid._glyphs.get(targetKey);

  // 1. Check if something exists at that coordinate
  if (!targetGlyph) {
    if (displayWalkthrough) { // if demo
      addMsg("No target found at that location! You can’t capture empty space.", true);
      addMsg("--------------------------------------------");
      addMsg("HINT: 'move' next to object then 'attack'");
    } else {
      addMsg("No target found at that location! You can’t capture empty space.", true);
      showMenu();
    }
    awaitingCaptureInput = false;
    return;
  }

  // 2. Prevent capturing an already captured or owned glyph
  if (targetGlyph.value === '@F') {
    addMsg("Planet '@F' has already been captured by you or your empire!", true);
    awaitingCaptureInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // 3. Capture can only target '@' or possibly damaged/star glyphs
  if (targetGlyph.value !== '@') {
    addMsg("You can only capture Planet '@' glyphs that have been attacked.", true);
    awaitingCaptureInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // 4. Ensure player’s "A" is adjacent (1 tile away)
  const dx = Math.abs(col - currentPos.col);
  const dy = Math.abs(row - currentPos.row);
  const isAdjacent = (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0));

  if (!isAdjacent) {
    // Distinguish between being far from star or base
    if (targetGlyph.value === '@') {
      addMsg("Too far away from '@'! Move closer to capture this target.", true);
    }
    awaitingCaptureInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // 5. Ensure that the '@' has been attacked before capturing
  if (targetGlyph.value === '@' && !attackedTargets.has(targetKey)) {
    addMsg("This '@' has not been attacked yet. You must attack it before capturing!", true);
    awaitingCaptureInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // 6. Capture success

  if (displayWalkthrough) { // if walkthrough
    addMsg(`You captured the ${targetGlyph.value} at (${col}, ${row})! It is now your captured planet '@F'`);
  } else { // if game
    addMsg(`You captured the ${targetGlyph.value} at (${col}, ${row})! It is now your captured planet '@F'`);
  }

  // Replace the glyph with '@F'
  grid.setGlyph(row, col, { type: 'text', value: '@F' });

  // Remove it from attacked targets and record as captured base
  attackedTargets.delete(targetKey);
  capturedBases.set(targetKey, true);

  awaitingCaptureInput = false;

  if (displayWalkthrough) { // if walkthrough
    addMsg("You may now build at this planet!");
    addMsg("[Press ENTER to continue]");
    awaitingCaptureCmd = false; // cont tasks
  }
  else { // if game
    addMsg("You may now build at this planet.");
    showMenu();
  }
}

/* ------------------------------------------------------------ */
//  BUILD CMD - INPUT HANDLER
function handleBuildInput(cmd) {
  const parts = cmd.split(/\s+/);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    addMsg("Invalid input. Enter two numbers like '3 5'", true);
    return; // still waiting
  }

  const col = parseInt(parts[0]);
  const row = parseInt(parts[1]);

  if (row < 1 || row > 8 || col < 1 || col > 8) {
    addMsg("Coordinates out of range (1–8). Try again:", true);
    return; // still waiting
  }

  const targetKey = `${row},${col}`;
  const targetGlyph = grid._glyphs.get(targetKey);

  // Empty cell -> warn
  if (!targetGlyph) {
    addMsg("No target found at that location! You can’t build on empty space.", true);
    awaitingBuildInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // Can't build on final base "<>"
  if (targetGlyph.value === '<>') {
    addMsg("That location is already a base '<>' and cannot be built on.", true);
    awaitingBuildInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // Must be captured planet '@F' to build
  if (targetGlyph.value !== '@F') {
    addMsg("You can only build on a captured planet '@F'.", true);
    awaitingBuildInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // Must be adjacent to player 'A'
  const dx = Math.abs(col - currentPos.col);
  const dy = Math.abs(row - currentPos.row);
  const isAdjacent = (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0));
  if (!isAdjacent) {
    addMsg("You must be next to the captured planet '@F' to build on it.", true);
    awaitingBuildInput = false;
    if (!displayWalkthrough) {
      showMenu();
    }
    return;
  }

  // OK: increment build progress for this planet
  const prev = buildProgress.get(targetKey) || 0;
  const next = prev + 1;
  buildProgress.set(targetKey, next);

  if (next < 1) {
  } else {
    // evolve into final base "<>"
    grid.setGlyph(row, col, { type: 'text', value: '<>' });
    buildProgress.delete(targetKey);
    capturedBases.delete(targetKey); // no longer just a captured planet

    if (displayWalkthrough) { // if walkthrough 
      addMsg(`Build Completed at (${col}, ${row}) — it has evolved into Federation Base '<>'!`);
      addMsg(`[Press 'ENTER' to Continue]`);
      awaitingBuildCmd = false; // cont tasks
    } else { // if game
      addMsg(`《✧》Build complete at (${col}, ${row}) — it has evolved into Federation Base '<>'!`);
    }
  }

  awaitingBuildInput = false;
  if (!displayWalkthrough) {
    showMenu();
  }
}

/* ------------------------------------------------------------ */
//  DOCK CMD - INPUT HANDLER
function handleDockInput(cmd) {
  const parts = cmd.split(/\s+/);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    addMsg("Invalid input. Enter coordinates like '3 5'.", true);
    return;
  }

  const col = parseInt(parts[0]);
  const row = parseInt(parts[1]);

  if (row < 1 || row > 8 || col < 1 || col > 8) {
    addMsg("Coordinates out of range (1–8).", true);
    return;
  }

  const key = `${row},${col}`;
  const glyph = grid._glyphs.get(key);

  // 1. No glyph → cannot dock
  if (!glyph) {
    addMsg("You cannot dock in empty space.", true);
    awaitingDockInput = false;
    if (!displayWalkthrough) showMenu();
    return;
  }

  // 2. Validate allowed docking types
  const val = glyph.value;
  const isBase = (val === "<>");
  const isCaptured = (val === "@F");

  if (!isBase && !isCaptured) {
    addMsg("You can only dock on a base '<>' or a captured planet '@F'.", true);
    awaitingDockInput = false;
    if (!displayWalkthrough) showMenu();
    return;
  }

  // 3. Player must be adjacent to the dock target
  const dx = Math.abs(col - currentPos.col);
  const dy = Math.abs(row - currentPos.row);
  const adjacent = (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0));

  if (!adjacent) {
    addMsg("You are too far away to dock.", true);
    awaitingDockInput = false;
    if (!displayWalkthrough) showMenu();
    return;
  }

  // Passed all conditions → SUCCESS
  addMsg("Docking successful! Your ship is now docked and regaining stats.");

  awaitingDockInput = false;

  // WALKTHROUGH COMPLETION
  if (displayWalkthrough && awaitingDockCmd) {
    awaitingDockCmd = false;
    beginDemoConclusion = true;
    addMsg("[Press ENTER to continue]");
  } else if (!displayWalkthrough) {
    showMenu();
  }
}


