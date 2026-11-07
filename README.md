# A Map of Us

A phone-first road-trip story site: an opening scroll with a wax seal, a winding road of memories a little car drives along, hidden golden letters, and a locked chest at the end.

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

## How it plays

- She taps a pin and a little silver sedan drives down the road to it, then the memory opens. Next and back in a memory drive to the neighbouring pin. After stop 8, "treasure →" drives to the chest.
- Each memory hides one faint golden letter. Tap it to collect it.
- The chest only opens once all letters are found and she types the password. The letters are shown scrambled.
- The car's color is `car.color` in `content.js`.
- `{days}` in any text is replaced with the live days-together count.

## Testing

- Open `index.html` in a browser. Use the browser's phone-size view, or open it on your phone once it's deployed.
- Progress (visited stops and collected letters) is saved in the browser. Add `?reset` to the URL to wipe it, for example `yoursite.netlify.app/?reset`. Do this before you send it to her.

## Deploying to Netlify

1. On Netlify, choose **Add new site → Import an existing project → GitHub**, then pick this repo.
2. Set the build command to empty and the publish directory to `/`.
3. Deploy. Every push to `main` redeploys automatically.
