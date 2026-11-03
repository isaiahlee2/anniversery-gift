# A Map of Us

A phone-first treasure-map story site: an opening scroll with a wax seal, a winding trail of memories, hidden golden letters, and a locked chest at the end.

Plain HTML/CSS/JS with no build step. It runs straight from GitHub on Netlify.

## Editing content

**Everything she sees lives in `js/content.js`.** You shouldn't need to touch any other file.

- **Memories:** one entry per X on the map. Add or remove entries and the map redraws to fit.
- **Photos:** drop images into `images/`, then list them on a memory, for example `photos: [{ src: "images/first-date.jpg", caption: "look at us" }]`.
  - Resize them first, to roughly 1200px on the long side and under 400 KB each, so it loads fast on her phone.
  - Portrait (4:5) photos fit the polaroid frame best.
- **Password + letters:** each memory has one `letter`. All the letters together must be the letters of `password`, in any order. If they don't match, the browser console prints a warning.
- **Finale:** the message shown when the chest opens.
- **Secrets:** the compass message, the message in a bottle, and the doodle inside jokes.

## Easter eggs

| Egg | How she finds it |
| --- | --- |
| Golden letters | One tiny faded letter hides in each memory card, in a different spot each time. Tap it to collect it. |
| Treasure chest | Opens only after all letters are found and she types the password. |
| Compass | Tap the compass rose 4 times quickly, once per year. |
| Doodles | Tap the ship, island, sea serpent, and so on. Each tap shows the next inside joke. |
| Message in a bottle | Washes up near the chest once she has opened every memory. |

## Testing

- Open `index.html` in a browser. Use the browser's phone-size view, or open it on your phone once it's deployed.
- Progress (visited stops and collected letters) is saved in the browser. Add `?reset` to the URL to wipe it, for example `yoursite.netlify.app/?reset`. Do this before you send it to her.

## Deploying to Netlify

1. On Netlify, choose **Add new site → Import an existing project → GitHub**, then pick this repo.
2. Set the build command to empty and the publish directory to `/`.
3. Deploy. Every push to `main` redeploys automatically.
