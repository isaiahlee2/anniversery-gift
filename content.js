/* ==================================================================
   ✏️  THIS IS THE ONLY FILE YOU NEED TO EDIT.
   Everything on the site (memories, photos, letters, secrets, the
   finale) comes from here. The map redraws itself to fit however
   many memories you list — add or remove stops freely.
   ================================================================== */

window.SITE = {
  herName: "Naomi",
  hisName: "Isaiah",

  // Shown on the wax seal on the opening screen
  sealInitials: "N & I",

  // Your first day together (YYYY-MM-DD) — powers the "days of adventures" counter
  togetherSince: "2022-11-12", // TODO: real date

  intro: {
    title: "A Map of Us",
    subtitle: "Four years of adventures",
    // Short note she reads before the map. Blank line = new paragraph.
    note:
      "TODO: a short note from you goes here.\n\n" +
      "Every X on this map is a memory. Hidden somewhere inside each one is a tiny golden letter — collect them all to open the treasure at the end.\n\n" +
      "Also… poke around. Some things on this map have secrets.",
    button: "Begin the adventure",
  },

  /* ----------------------------------------------------------------
     MEMORIES — one object per X on the map, in order.
     - photos: put image files in the /images folder, then list them:
         photos: [
           { src: "images/first-date.jpg", caption: "look at us" },
           "images/another-one.jpg",          // caption is optional
         ]
       Leave photos: [] and a placeholder polaroid shows instead.
     - story: blank line = new paragraph.
     - letter: the golden letter hidden in this memory. All the letters
       together must be the letters of `password` below (any order).
     ---------------------------------------------------------------- */
  memories: [
    {
      title: "Where It Started",
      date: "Month Year", // TODO
      place: "Crumbl",
      photos: [],
      story:
        "TODO: the story of meeting at Crumbl. Write it like you're telling her out loud — what happened, what you noticed about her, what you were thinking.\n\nBlank line = new paragraph.",
      letter: "T",
    },
    {
      title: "All Night in the Car",
      date: "Month Year", // TODO
      place: "TODO: where you parked",
      photos: [],
      story: "TODO: the second hangout — spending the whole night talking in the car.",
      letter: "R",
    },
    {
      title: "My Prom",
      date: "Month Year", // TODO
      place: "TODO",
      photos: [],
      story: "TODO: the night she came to your prom.",
      letter: "E",
    },
    {
      title: "Camping with Your Parents",
      date: "Month Year", // TODO
      place: "TODO: campground",
      photos: [],
      story: "TODO: the camping trip with her parents.",
      letter: "A",
    },
    {
      title: "Your Prom",
      date: "Month Year", // TODO
      place: "TODO",
      photos: [],
      story: "TODO: going to her prom a year later.",
      letter: "S",
    },
    {
      title: "Off to College, Together",
      date: "Fall Year", // TODO
      place: "Corvallis",
      photos: [],
      story: "TODO: heading to college together.",
      letter: "U",
    },
    {
      title: "Sabrina Carpenter",
      date: "Month Year", // TODO
      place: "TODO: venue",
      photos: [],
      story: "TODO: the Sabrina Carpenter concert.",
      letter: "R",
    },
    {
      // Compilation stop: photos show as a scattered polaroid collage
      // instead of a swipe carousel. Add as many as you want.
      layout: "collage",
      title: "Sunsets & Selfies",
      date: "All four years",
      place: "Everywhere",
      photos: [],
      story: "TODO: a short caption for the collage (optional).",
      letter: "E",
    },
  ],

  // The word that opens the chest. Swap for a nickname / inside joke,
  // then re-assign one letter per memory above so they spell it.
  password: "TREASURE",

  chest: {
    title: "The Treasure",
    lockedText: "Locked tight. Only the golden letters can open it.",
    hint: "Unscramble your letters to spell the password.",
  },

  // What she sees when the chest opens
  finale: {
    title: "Happy 4 Years",
    message:
      "TODO: the big message. This is the payoff, so make it count.\n\n" +
      "Could reveal the LA trip as 'the next stop on the map', or be a letter from you.",
    signature: "— Isaiah",
    photo: "", // optional, e.g. "images/finale.jpg"
  },

  /* ----------------------------------------------------------------
     EASTER EGGS
     ---------------------------------------------------------------- */
  secrets: {
    // Tap the compass rose (top of the map) 4 times — once per year
    compass: {
      title: "You found the compass secret",
      message: "TODO: secret message #1. Maybe something about 'no matter where we go'.",
    },
    // A message in a bottle washes up after she's opened every memory
    bottle: {
      title: "A message in a bottle",
      message: "TODO: secret message for finishing every memory.",
    },
    // Little notes behind the doodles on the map (ship, island, etc.).
    // Tapping a doodle shows the next note in this list.
    doodles: [
      "TODO: inside joke #1",
      "TODO: inside joke #2",
      "TODO: inside joke #3",
      "TODO: inside joke #4",
      "TODO: inside joke #5",
      "TODO: inside joke #6",
      "TODO: inside joke #7",
    ],
  },
};
