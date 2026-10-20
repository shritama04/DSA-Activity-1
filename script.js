/* =========================================================
   Circular Queue Visualizer — logic
   The queue is an array used as a ring. Three variables
   describe it:  front, rear, count.
   Moving a pointer one step uses:  (index + 1) % capacity
   ========================================================= */
"use strict";

/* ---------- Helpers ---------- */
const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- Ring geometry (SVG units) ---------- */
const CENTER = 200;
const OUTER_RADIUS = 140;
const INNER_RADIUS = 82;
const SLOT_GAP_DEG = 1.5;

/** Point on a circle around the centre. Angle 0 = right, -90 = top. */
function pointOnCircle(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/* ---------- Queue state ---------- */
let capacity = 8;
let state;          // { items: [], front, rear, count }
let busy = false;   // true while an animation is playing

function resetState() {
  capacity = Number($("#capacity-select").value);
  state = {
    items: Array(capacity).fill(null),
    front: 0,
    rear: capacity - 1,   // one step behind front, so the first enqueue lands on slot 0
    count: 0,
  };
}

/* =========================================================
   Drawing
   ========================================================= */

/** Draw the empty ring: one arc-shaped slot per array index. */
function buildRing() {
  const slice = 360 / capacity;
  const largeArc = slice > 180 ? 1 : 0;
  let svg = "";

  for (let i = 0; i < capacity; i++) {
    const mid = -90 + i * slice;                    // slot 0 sits at the top
    const start = mid - slice / 2 + SLOT_GAP_DEG;
    const end = mid + slice / 2 - SLOT_GAP_DEG;

    const [x0, y0] = pointOnCircle(start, OUTER_RADIUS);
    const [x1, y1] = pointOnCircle(end, OUTER_RADIUS);
    const [x2, y2] = pointOnCircle(end, INNER_RADIUS);
    const [x3, y3] = pointOnCircle(start, INNER_RADIUS);
    const [valueX, valueY] = pointOnCircle(mid, 110);
    const [indexX, indexY] = pointOnCircle(mid, 130);

    svg += `
      <g class="slot">
        <path d="M${x0} ${y0} A${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${x1} ${y1}
                 L${x2} ${y2} A${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${x3} ${y3} Z"/>
        <text class="val" x="${valueX}" y="${valueY}"></text>
        <text class="idx" x="${indexX}" y="${indexY}">${i}</text>
      </g>`;
  }
  $("#slots").innerHTML = svg;
}

/** Slide a pointer marker (F or R) to the given slot. */
function movePointer(markerId, slotIndex, radius) {
  const [x, y] = pointOnCircle(-90 + (slotIndex * 360) / capacity, radius);
  $(markerId).style.transform = `translate(${x}px, ${y}px)`;
}

/** Redraw everything from the current state. */
function render() {
  const { items, front, rear, count } = state;

  // Slots on the ring
  document.querySelectorAll(".slot").forEach((slot, i) => {
    const text = items[i] ?? "";
    const label = slot.querySelector(".val");
    slot.classList.toggle("on", items[i] !== null);
    label.textContent = text;
    // shrink long values so they fit inside the slot
    label.style.fontSize = (text.length <= 3 ? 20 : text.length <= 5 ? 14 : 10) + "px";
  });

  // Pointers and counter
  movePointer("#ptr-front", front, 168);   // outside the ring
  movePointer("#ptr-rear", rear, 58);      // inside the ring
  $("#count-label").textContent = count;

  // Status pills
  const status =
    count === 0 ? '<span class="tag">EMPTY</span>' :
    count === capacity ? '<span class="tag">FULL</span>' : "";
  $("#stats").innerHTML = `
    <span class="pill">front <b>${front}</b></span>
    <span class="pill">rear <b>${rear}</b></span>
    <span class="pill">count <b>${count}</b> / ${capacity}</span>${status}`;

  // The plain array underneath, with F / R tags
  $("#array-row").innerHTML = items.map((value, i) => {
    const tags = (i === front && count > 0 ? "F" : "") + (i === rear && count > 0 ? "R" : "");
    return `<div class="cell ${value !== null ? "on" : ""}">
              <small>${i}</small>${value ?? "&nbsp;"}<i>${tags}</i>
            </div>`;
  }).join("");
}

/** Highlight one slot (pass -1 to clear all highlights). */
function highlight(index) {
  document.querySelectorAll(".slot").forEach((slot, i) => {
    slot.classList.remove("hi", "bad");
    if (i === index) slot.classList.add("hi");
  });
}

/** Turn the whole ring red (overflow / underflow). */
function flashError() {
  document.querySelectorAll(".slot").forEach((slot) => slot.classList.add("bad"));
}

/* =========================================================
   Step player
   Each operation is a list of [explanation text, action].
   The player shows one step at a time and runs its action.
   ========================================================= */

function setBusy(isBusy) {
  busy = isBusy;
  document.querySelectorAll(".btn, #capacity-select").forEach((el) => (el.disabled = isBusy));
}

function showMessage(title, text) {
  $("#op-title").textContent = title;
  $("#steps").innerHTML = `<li class="placeholder">${text}</li>`;
}

async function playSteps(title, steps) {
  setBusy(true);
  $("#op-title").textContent = title;
  $("#steps").innerHTML = "";

  for (const [text, action] of steps) {
    const li = document.createElement("li");
    li.textContent = text;
    $("#steps").append(li);

    if (action) action();
    await sleep(Number($("#speed-select").value));
  }

  highlight(-1);
  setBusy(false);
}

/* =========================================================
   The three operations
   ========================================================= */

function enqueue() {
  if (busy) return;

  const value = $("#value-input").value.trim();
  if (!value) {
    showMessage("Enter a value first", "Type a value (up to 8 characters) in the box, then press Enqueue.");
    $("#value-input").focus();
    return;
  }
  $("#value-input").value = "";

  const { front, rear, count } = state;
  const newRear = (rear + 1) % capacity;
  const isFull = count === capacity;

  const steps = [[
    `Check for overflow: is count (${count}) equal to the capacity (${capacity})? ` +
      (isFull
        ? "Yes, the queue is full, so nothing can be added. This is called overflow."
        : "No, so there is room."),
    () => isFull && flashError(),
  ]];

  if (!isFull) {
    steps.push([
      `Move rear forward: rear = (rear + 1) % N = (${rear} + 1) % ${capacity} = ${newRear}.` +
        (rear + 1 === capacity
          ? ` The +1 ran off the end of the array (${capacity}), and % wraps it back to 0. That is the circular part.`
          : ""),
      () => { state.rear = newRear; render(); highlight(newRear); },
    ]);

    steps.push([
      `Write ${value} into slot ${newRear}.`,
      () => { state.items[newRear] = value; render(); highlight(newRear); },
    ]);

    steps.push([
      `Increase count from ${count} to ${count + 1}.` +
        (count === 0 ? ` It was the first item, so front (${front}) already points at it.` :
         count + 1 === capacity ? " The queue is now full." : ""),
      () => { state.count++; render(); },
    ]);
  }

  playSteps(`Enqueue ${value}`, steps);
}

function dequeue() {
  if (busy) return;

  const { front, count } = state;
  const value = state.items[front];
  const newFront = (front + 1) % capacity;
  const isEmpty = count === 0;

  const steps = [[
    `Check for underflow: is count (${count}) equal to 0? ` +
      (isEmpty
        ? "Yes, the queue is empty, so there is nothing to remove. This is called underflow."
        : "No, so there is an item to remove."),
    () => isEmpty && flashError(),
  ]];

  if (!isEmpty) {
    steps.push([
      `Read the item at front: slot ${front} holds ${value}. This is the oldest item, so it is the one that leaves.`,
      () => highlight(front),
    ]);

    steps.push([
      `Clear slot ${front}. (Real code often just leaves the old value there and ignores it; the lab clears it so you can see it go.)`,
      () => { state.items[front] = null; render(); highlight(front); },
    ]);

    steps.push([
      `Move front forward: front = (front + 1) % N = (${front} + 1) % ${capacity} = ${newFront}.` +
        (front + 1 === capacity ? " It wrapped past the end back to slot 0." : ""),
      () => { state.front = newFront; render(); },
    ]);

    steps.push([
      `Decrease count from ${count} to ${count - 1}. ${value} has been dequeued.` +
        (count - 1 === 0 ? " The queue is empty again." : ""),
      () => { state.count--; render(); },
    ]);
  }

  playSteps("Dequeue", steps);
}

function peek() {
  if (busy) return;

  const { front, count } = state;
  const isEmpty = count === 0;

  const steps = [[
    `Is count (${count}) equal to 0? ` +
      (isEmpty ? "Yes, the queue is empty, so there is nothing to look at." : "No."),
    () => isEmpty && flashError(),
  ]];

  if (!isEmpty) {
    steps.push([
      `Read slot ${front} (front): it holds ${state.items[front]}. Peek only looks. Nothing moves and count stays ${count}.`,
      () => highlight(front),
    ]);
  }

  playSteps("Peek", steps);
}

/* =========================================================
   Setup and event wiring
   ========================================================= */

function resetLab() {
  resetState();
  buildRing();
  render();
  showMessage("Ready", "Press Enqueue, Dequeue or Peek. Every step is explained here as it happens.");
}

function showTab(name) {
  ["lab", "walk"].forEach((id) => ($("#" + id).hidden = id !== name));
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.classList.toggle("on", tab.dataset.tab === name));
  window.scrollTo(0, 0);
}

$("#btn-enqueue").addEventListener("click", enqueue);
$("#btn-dequeue").addEventListener("click", dequeue);
$("#btn-peek").addEventListener("click", peek);
$("#btn-reset").addEventListener("click", () => { if (!busy) resetLab(); });
$("#capacity-select").addEventListener("change", resetLab);
$("#value-input").addEventListener("keydown", (e) => { if (e.key === "Enter") enqueue(); });

document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => showTab(tab.dataset.tab)));
$("#btn-go-lab").addEventListener("click", () => showTab("lab"));

resetLab();
