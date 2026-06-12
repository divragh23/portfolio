# div23.app

This is my personal portfolio — a single page that covers who I am and the
things I've been building. It's live at [div23.app](https://div23.app).

I'm Divyansh, a Data Science & Engineering student at UConn. I spend most of my
time around AI, machine learning, computer vision, and the software around
them, and I wanted a home on the web that reflected that without being noisy
about it.

## What's on the page

The site walks through a short intro, a bit of background, and the projects I
care about most. Each project links out to its own live version on a subdomain:

- **Traffic-Sign Detection** — a computer-vision model you can try right on the
  page. Upload an image or turn on your webcam and it draws boxes around the
  traffic signs it finds.
- **Vita** — an AI health assistant that holds a conversation about everyday
  wellness questions. Lives at [vita.div23.app](https://vita.div23.app).
- **NBA Stats Tracker** — a stats project over at
  [nba.div23.app](https://nba.div23.app).

## How it's built

The front end is plain HTML, CSS, and JavaScript. No framework, no build
step — just files the browser can read directly. I went that route on purpose:
it keeps the whole thing fast and easy to reason about. The type is JetBrains
Mono and Inter, and the little touches — the name that scrambles into place in
the hero, the sections that fade in as you scroll, the glow that follows the
cursor, the marquee, the progress bar at the top — are all hand-written vanilla
JS rather than libraries.

The traffic-sign demo is the one part that needs a server. The model runs
through Roboflow, and the API key can't live in the browser, so there's a small
FastAPI service in `backend/` that takes the uploaded image, calls Roboflow with
the key kept server-side, and sends the predictions back. That proxy runs on
DigitalOcean; the static site itself is hosted on GitHub Pages with the domain
pointed at it through the `CNAME` file.

## Layout

```
index.html      the page itself
styles.css      main styling
demo.css        styling for the live demo
script.js       site interactions and animations
demo.js         the traffic-sign demo logic
backend/        FastAPI inference proxy
```

Since the front end is static, opening `index.html` in a browser is enough to
see everything except the live demo, which expects the backend to be running.
