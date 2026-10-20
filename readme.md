# Circular Queue Visualizer

An interactive, animated circular queue. Enqueue, dequeue and peek, and every operation is explained step by step in plain English. A second tab walks through the theory, with code in Python and C.

## Run it

No install or build step is needed.

- Double-click `index.html`, or
- In VS Code, install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: the Lab tab and the Walkthrough tab |
| `style.css`  | Dark theme and layout |
| `script.js`  | Queue logic, ring drawing, step-by-step animation |

## How it works

The queue is an array treated as a ring, tracked by three variables.

- `front`: index of the oldest item (next to leave)
- `rear`: index of the newest item (last to join)
- `count`: how many items are stored

Pointers move with `(index + 1) % capacity`, so after the last slot they wrap back to slot 0. Starting with `rear = capacity - 1` makes the first enqueue land on slot 0. Using `count` removes the confusion between "full" and "empty".



| Enqueue | check full, `rear = (rear + 1) % N`, write value, `count++` | O(1) |
| Dequeue | check empty, read `data[front]`, `front = (front + 1) % N`, `count--` | O(1) |
| Peek | check empty, read `data[front]` | O(1) |

## Upload to GitHub

```bash
git init
git add .
git commit -m "Circular queue visualizer"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
