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
  togetherSince: "2022-11-12",

  intro: {
    title: "A Map of Us",
    subtitle: "Four years of adventures",
    // Short note she reads before the map. Blank line = new paragraph.
    note: "Loving you for 4 years and memories for a lifetime",
    // small "how to play" line under the note
    howTo: "Tap a pin and we'll drive there. Each memory hides a tiny golden letter. Find all 8 to unlock the treasure at the end.",
    button: "Start the car",
  },

  /* ----------------------------------------------------------------
     MEMORIES — one object per X on the map, in order.
     - photos: upload image files to the repo, then list them:
         photos: [
           { src: "first-date.jpg", caption: "look at us" },
           "another-one.jpg",                 // caption is optional
         ]
       Leave photos: [] and a placeholder polaroid shows instead.
     - story: blank line = new paragraph.
     - landmark: the drawing beside the pin — cookie, moon, disco, tent,
       bouquet, campus, stage or sunset.
     - letter: the golden letter hidden in this memory. All the letters
       together must be the letters of `password` below (any order).
     ---------------------------------------------------------------- */
  memories: [
    {
      title: "Where It Started",
      landmark: "cookie", // little drawing next to the pin
      date: "August 2022",
      place: "Crumbl",
      photos: [{ src: "crumbl.jpg", caption: "" }],
      story:
        "Shout out Riju, shout out Michelle, shout out Ronit, shout out Anas. The start of a lifetime of memories, without even knowing it.",
      letter: "T",
    },
    {
      title: "All Night in the Car",
      landmark: "moon", // little drawing next to the pin
      date: "September 2022",
      place: "",
      photos: [{ src: "car-night.jpg", caption: "" }],
      story:
        "Our matching everyday era. Lowkey crazy that this was over 4 years ago. Four years from now, we're gonna be 25. RIP.",
      letter: "R",
    },
    {
      title: "My Prom",
      landmark: "disco", // little drawing next to the pin
      date: "June 2023",
      place: "",
      photos: [{ src: "my-prom.jpg", caption: "" }],
      story: "The red was perfect.",
      letter: "E",
    },
    {
      title: "Camping with Your Parents",
      landmark: "tent", // little drawing next to the pin
      date: "July 2023",
      place: "",
      photos: [{ src: "camping.jpg", caption: "" }],
      story: "A core memory trip. Shout out the sun for giving us goated lighting for 2 days.",
      letter: "A",
    },
    {
      title: "Your Prom",
      landmark: "bouquet", // little drawing next to the pin
      date: "June 2024",
      place: "",
      photos: [{ src: "her-prom.jpg", caption: "" }],
      story:
        "The first time I met your friends, and we created the goated quad group. Also, why'd we cook with those colors?",
      letter: "S",
    },
    {
      title: "Off to College, Together",
      landmark: "campus", // little drawing next to the pin
      date: "October 2024",
      place: "Corvallis",
      photos: [{ src: "corvallis.jpg", caption: "" }],
      story:
        "We moved to school 400 miles away from our friends and family. Maybe it's a decision we've both thought twice about, but for me, the best decision was being as close to you as possible and growing with you.",
      letter: "U",
    },
    {
      title: "Sabrina Carpenter",
      landmark: "stage", // little drawing next to the pin
      date: "November 2024",
      place: "",
      photos: [{ src: "sabrina.jpg", caption: "" }],
      story:
        "I hate this photo, but Sabrina was lit, and it was a fun way to celebrate 3 years on the dot.",
      letter: "R",
    },
    {
      // Compilation stop: photos show as a scattered polaroid collage
      // instead of a swipe carousel. Add as many as you want.
      // {days} in any text is replaced with the live days-together count.
      layout: "collage",
      title: "Sunsets & Selfies",
      landmark: "sunset", // little drawing next to the pin
      date: "All four years",
      place: "",
      photos: [
        "sunset-1.jpg",
        "sunset-2.jpg",
        "sunset-3.jpg",
        "sunset-4.jpg",
        "sunset-5.jpg",
        "sunset-6.jpg",
      ],
      story:
        "All the sunsets we got to experience together.\n\n" +
        "The rest of this one is locked in the treasure chest.",
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
      "It's been a crazy, long, whirlwind journey loving you and spending life with you for the past {days} days. You've made me the best version of myself I think I ever could have been, and I hope I've brought out even 1% of that in you.\n\n" +
      "I know this year has had its fair share of rough patches, but I would do it all over again if it meant becoming a better person, and a better person for you.\n\n" +
      "When I see how pretty the sunset is, I think of you.",
    signature: "— Isaiah",
    photo: "", // optional: a favorite sunset pic, e.g. "sunset-1.jpg"
  },


  // The car that drives between stops. Any CSS color works.
  car: { color: "#c3c9d1" }, // silver
};
