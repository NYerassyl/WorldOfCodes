import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "css-grid",
    title: "Grid & positioning",
    summary:
      "Arrange content in two dimensions and place elements precisely on the page.",
    theory: [
      {
        title: "A grid in two dimensions",
        body: "Grid layout arranges children in rows and columns at the same time. Setting display: grid on a container turns it into a grid container, and every direct child becomes a grid item. You describe the tracks, which are the rows and columns, with grid-template-columns and grid-template-rows. A value such as 1fr 1fr 1fr creates three columns that share the free space equally, while 120px 1fr creates a fixed sidebar next to a flexible main area. The gap property adds space between tracks without adding space at the outer edges, so every child no longer needs its own margin. Flexbox lays items out along one axis at a time; grid lines content up in both directions, which suits page skeletons, dashboards and card galleries. Items still flow into cells in source order, so keep the markup in a readable order first and use grid to arrange it afterwards.",
        code: ".page {\n  display: grid;\n  grid-template-columns: 220px 1fr;\n  grid-template-rows: auto 1fr auto;\n  gap: 24px;\n}",
      },
      {
        title: "Repeat, minmax and fluid tracks",
        body: "Writing the same track value again and again is noisy, so repeat() describes it once: repeat(3, 1fr) means three equal columns. The fr unit is a fraction of the free space that remains after fixed tracks and gaps are subtracted, so 1fr and 2fr split that space in a one to two ratio. minmax() gives a track a floor and a ceiling: minmax(200px, 1fr) keeps a card at least 200 pixels wide and lets it grow to share leftover space. Combined with auto-fit, the browser creates as many tracks as fit the container and collapses empty ones, so items stretch to fill the row. auto-fill keeps those empty tracks reserved instead. The pattern repeat(auto-fit, minmax(220px, 1fr)) is a common gallery that adapts without a single media query, though it still needs a max-width on the container to stop cards growing huge on wide screens.",
        code: ".gallery {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 16px;\n}",
      },
      {
        title: "Placing items and stacking layers",
        body: "Every grid item starts in one cell, and you can extend it with grid-column or grid-row. grid-column: span 2 makes an item cover two column tracks, while grid-column: 1 / 3 starts at line 1 and stops before line 3, which also covers two tracks. Placement is different from position, which changes how a box is shifted or removed from normal flow. static is the default. relative keeps the box in flow and lets inset, or top, right, bottom and left, shift it visually. absolute removes it from flow and resolves those offsets against the nearest positioned ancestor. fixed resolves them against the viewport, and sticky blends relative with a scroll threshold. inset: 0 is shorthand for all four offsets and stretches an absolutely positioned box to its containing block. z-index decides which overlapping positioned box paints on top, but each stacking context contains its children, so a high z-index inside a parent cannot rise above the parent's siblings.",
        code: ".card { position: relative; }\n.badge {\n  position: absolute;\n  inset: 8px 8px auto auto;\n  z-index: 2;\n}",
      },
    ],
    tasks: [
      {
        prompt: "Which declaration turns an element into a grid container?",
        options: [
          "grid: display",
          "display: grid",
          "display: table",
          "layout: grid",
        ],
        answer: 1,
        explanation:
          "Grid layout starts when the container opts in with display: grid, and its direct children become grid items.",
      },
      {
        prompt: "Which property sets the space between grid rows and columns?",
        options: ["margin", "padding", "gap", "border-spacing"],
        answer: 2,
        explanation:
          "gap adds space between tracks without adding space around the outside of the grid.",
      },
      {
        prompt:
          "Which property defines the height of the rows in a grid container?",
        options: [
          "grid-row-height",
          "row-template",
          "grid-template-rows",
          "grid-auto-height",
        ],
        answer: 2,
        explanation:
          "Row tracks are described with grid-template-rows, which accepts the same track values as the column property.",
      },
      {
        prompt:
          "In grid-template-columns: 1fr 2fr, how is the free space shared?",
        options: [
          "Both columns are equal",
          "The first column is twice as wide as the second",
          "The columns collapse to zero",
          "The second column is twice as wide as the first",
        ],
        answer: 3,
        explanation:
          "The fr unit divides free space by ratio, so 2fr receives twice the share of 1fr.",
      },
      {
        prompt: "What does this rule create?",
        code: ".grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}",
        options: [
          "Three fixed 24px columns",
          "Three equal columns with 24px between them",
          "One column repeated three times vertically",
          "Three columns that each hold 3fr",
        ],
        answer: 1,
        explanation:
          "repeat(3, 1fr) produces three equal flexible columns, and gap puts 24px between the tracks.",
      },
      {
        prompt: "What does minmax(220px, 1fr) mean in this track list?",
        code: ".gallery {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n}",
        options: [
          "Each track is exactly 220px wide",
          "Each track is at most 220px wide",
          "Each track is at least 220px and can grow to fill the row",
          "Tracks sit exactly 220px apart",
        ],
        answer: 2,
        explanation:
          "minmax sets a minimum and a maximum size, so a track never drops below 220px and may grow into free space.",
      },
      {
        prompt: "Which declaration makes a grid item cover two column tracks?",
        options: [
          "grid-column: span 2",
          "grid-row: span 2",
          "column-count: 2",
          "grid-area: 2",
        ],
        answer: 0,
        explanation:
          "grid-column with span 2 extends the item across two columns, while grid-row would span rows instead.",
      },
      {
        prompt: "Where is .badge pinned in this setup?",
        code: ".card {\n  position: relative;\n}\n.badge {\n  position: absolute;\n  top: 0;\n  right: 0;\n}",
        options: [
          "The top-right corner of the page",
          "Its normal place in the flow",
          "The bottom-left corner of .card",
          "The top-right corner of .card",
        ],
        answer: 3,
        explanation:
          "The badge leaves the flow, and its offsets resolve against .card, the nearest positioned ancestor.",
      },
      {
        prompt: "What does inset: 0 do for an absolutely positioned box?",
        options: [
          "Adds a zero-width border",
          "Sets top, right, bottom and left to zero, so the box fills its containing block",
          "Removes the element from the page",
          "Sets the padding to zero",
        ],
        answer: 1,
        explanation:
          "inset is shorthand for the four offset properties, and zero on every side stretches the box to its containing block.",
      },
      {
        prompt:
          "A modal outside .card has z-index: 10, while a child of .card has z-index: 99. Which one paints on top?",
        options: [
          "The modal, because the child's z-index is confined to the stacking context of .card",
          "The child, because 99 is larger than 10",
          "They paint at the same level",
          "Neither, because z-index only works together with float",
        ],
        answer: 0,
        explanation:
          "A positioned ancestor with a z-index forms a stacking context, and its children cannot stack above elements that sit outside it.",
      },
    ],
  },
  {
    id: "css-responsive",
    title: "Responsive design",
    summary:
      "Size content fluidly and let layouts adapt to phones, tablets and wide screens.",
    theory: [
      {
        title: "Relative units and fluid type",
        body: "A pixel is an absolute length: it stays the same size whatever surrounds it. Relative units describe length in terms of something else. rem means root em and follows the font size set on the html element, so it stays stable however deeply an element is nested. em follows the element's own font size, which suits a component whose parts should scale together. A percentage resolves against the containing block, and vw is one percent of the viewport width, which is the visible browser area. Mixing these units lets text breathe: font-size: clamp(1.5rem, 4vw, 2.5rem) sets a minimum of 1.5rem, a preferred value that follows the viewport, and a maximum of 2.5rem. The browser picks the middle value and clamps it into the range, so headings grow on wide screens without becoming absurd on a large monitor or unreadable on a phone.",
        code: "h1 {\n  font-size: clamp(1.5rem, 4vw, 2.5rem);\n}\n.card {\n  padding: 1rem;\n}",
      },
      {
        title: "Containers with sensible limits",
        body: "A layout that stretches across a very wide monitor is hard to read, because the eye loses the start of the next line. max-width sets a ceiling without fixing a size, so a container can shrink on a phone and stop growing on a desktop. Combine it with width: 100% when the block should fill small screens, and add margin: 0 auto so the leftover space is split into equal side margins and the block sits in the middle. The min() function chooses the smaller of two lengths: width: min(100%, 640px) means as wide as the parent but never wider than 640px, and it removes the need for a separate width plus max-width pair. min-height reserves vertical space, and min-width stops a box from being squeezed below a usable size. Padding on the container keeps text away from the screen edge on narrow devices.",
        code: ".wrapper {\n  width: min(100% - 2rem, 720px);\n  margin: 0 auto;\n  padding-block: 2rem;\n}",
      },
      {
        title: "Media queries and fluid images",
        body: "A media query is a conditional block: its rules apply only while the condition is true. @media (min-width: 768px) matches when the viewport is at least 768 pixels wide. Mobile-first CSS writes the base rules for the smallest screen, then adds min-width queries that only change what must differ, which keeps overrides short and predictable. Each width where the layout changes is called a breakpoint, and it should come from the content rather than from a device name. Images need attention too: an image with a fixed width can overflow its column, so set max-width: 100% and height: auto to let it shrink while keeping its proportions. aspect-ratio: 16 / 9 reserves a shape before the file loads, so the page does not jump, and object-fit: cover crops a picture to fill that box instead of stretching it.",
        code: "img {\n  max-width: 100%;\n  height: auto;\n  aspect-ratio: 16 / 9;\n  object-fit: cover;\n}\n\n@media (min-width: 768px) {\n  .cards { display: grid; grid-template-columns: repeat(2, 1fr); }\n}",
      },
    ],
    tasks: [
      {
        prompt: "Which unit is relative to the root font size?",
        options: ["em", "rem", "px", "pt"],
        answer: 1,
        explanation:
          "rem means root em, so it follows the font size of the html element and ignores nested font sizes.",
      },
      {
        prompt:
          "Which rule stops a large image from overflowing a narrow column while keeping its proportions?",
        options: [
          "img { width: 900px; }",
          "img { min-width: 100%; }",
          "img { max-width: 100%; height: auto; }",
          "img { position: absolute; }",
        ],
        answer: 2,
        explanation:
          "max-width lets a large image shrink to its container, and height: auto keeps the original proportions.",
      },
      {
        prompt: "What does a breakpoint mark in a responsive stylesheet?",
        options: [
          "A viewport width where the layout changes",
          "A fixed pixel size for body text",
          "The end of a CSS file",
          "A browser that cannot load CSS",
        ],
        answer: 0,
        explanation:
          "A breakpoint is the width at which a media query switches rules, and it should be chosen from the content rather than a device name.",
      },
      {
        prompt: "What does clamp(1rem, 2.5vw, 2rem) produce?",
        options: [
          "The middle value only, ignoring the limits",
          "Always 2rem",
          "A value between 1rem and 2rem that follows the viewport",
          "A value rounded to whole rems",
        ],
        answer: 2,
        explanation:
          "clamp takes a minimum, a preferred value and a maximum, so 2.5vw scales but cannot fall below 1rem or rise above 2rem.",
      },
      {
        prompt:
          "Which media query applies only when the viewport is at least 768px wide?",
        options: [
          "@media (max-width: 768px)",
          "@media (width: 768px)",
          "@media (min-width: 768px)",
          "@media screen and (height: 768px)",
        ],
        answer: 2,
        explanation:
          "min-width matches at that width and every width above it, which is why it suits mobile-first rules.",
      },
      {
        prompt: "What is the effect of this rule?",
        code: ".panel {\n  width: min(100%, 640px);\n  margin: 0 auto;\n}",
        options: [
          "The panel is always 640px wide",
          "The panel is 100% of the viewport",
          "The panel is 640px plus its padding",
          "The panel is as wide as its container but never wider than 640px, and centered",
        ],
        answer: 3,
        explanation:
          "min() keeps the smaller of the two lengths, so the panel shrinks on phones, stops at 640px and centers through the automatic side margins.",
      },
      {
        prompt:
          "What does aspect-ratio: 16 / 9 do on a box whose width is 100%?",
        options: [
          "Fixes the height at 9px",
          "Makes the box square",
          "Lets the height follow from the width at a 16 to 9 ratio",
          "Crops the content to 16 by 9 pixels",
        ],
        answer: 2,
        explanation:
          "The browser derives the missing dimension from the ratio, so the box keeps its shape as the width changes.",
      },
      {
        prompt: "At a 1200px wide viewport, which padding applies to .card?",
        code: ".card {\n  padding: 16px;\n}\n\n@media (min-width: 900px) {\n  .card {\n    padding: 32px;\n  }\n}",
        options: [
          "16px, because the base rule comes first",
          "Both, so the padding adds up to 48px",
          "Neither, the rules cancel each other",
          "32px, because the min-width rule matches and comes later",
        ],
        answer: 3,
        explanation:
          "Both rules match at 1200px, and with equal specificity the later declaration in the source order wins.",
      },
      {
        prompt: "A box has font-size: 20px. What is padding: 2em inside it?",
        options: ["20px", "2px", "40px", "200px"],
        answer: 2,
        explanation:
          "For properties other than font-size, em resolves against the element's own font size, so 2 x 20px is 40px.",
      },
      {
        prompt: "What does this rule guarantee for the hero image?",
        code: ".hero img {\n  width: 100%;\n  aspect-ratio: 16 / 9;\n  object-fit: cover;\n}",
        options: [
          "The image stretches to fill a 16 to 9 box",
          "The image keeps its natural height",
          "The image is hidden below 16px",
          "The image fills the width inside a 16 to 9 box and is cropped rather than distorted",
        ],
        answer: 3,
        explanation:
          "aspect-ratio defines the box, and object-fit: cover crops the picture to fill it while preserving its proportions.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "css-basics": {
    objectives: [
      "Read and write class, id and descendant selectors",
      "Apply color, background-color and font-size declarations",
      "Predict which rule wins when two selectors compete",
    ],
    terms: [
      {
        term: "Class selector",
        meaning:
          "A selector written with a leading dot that styles every element carrying that class.",
      },
      {
        term: "Id selector",
        meaning:
          "A selector written with a leading hash that targets the single element using that id.",
      },
      {
        term: "Declaration",
        meaning:
          "One property and value pair, such as color: red, written inside a rule block.",
      },
      {
        term: "Specificity",
        meaning:
          "The weight of a selector that decides which competing declaration the browser applies.",
      },
    ],
    deepDive: {
      title: "Going further: specificity as a score",
      body: "Every selector earns a score that decides which declaration wins. Think of three columns: ids, then classes with attribute selectors and pseudo-classes, then element names with pseudo-elements. The rule .card p scores 0-1-1 and #hero scores 1-0-0, so the id wins even though the other selector mentions more elements. When scores tie, the declaration that appears later in the stylesheet wins, which is why rule order matters. Styles written in a style attribute outrank both. Inheritance is a separate mechanism: properties such as color and font-family flow into children unless a rule overrides them, while box properties do not. That is why one low-specificity reset at the top of a file rarely breaks anything, and why relying on ids for colour soon forces !important everywhere. Style with classes because they are reusable and keep scores low, and keep ids for anchors and script hooks. When a rule refuses to apply, inspect the winning declaration before reaching for !important, since that flag discards the normal cascade and makes later fixes harder.",
    },
    pitfall:
      "A common beginner mistake is styling everything with ids because the colour then applies, and then failing to reuse that style on a second element. Classes are reusable and keep specificity low, so style with classes and reserve ids for links and scripts. Another trap is reading .card p as both selectors at once: it styles paragraphs inside cards, while .card, p styles both.",
    lab: {
      id: "css-basics-lab",
      title: "Colour a card and its text",
      brief:
        "Write three rules in styles.css. Give the .card class a text color and a background-color, give the #hero id its own color, and use the descendant selector .card p to colour the paragraphs inside the card. Keep each declaration inside a block with braces.",
      file: "styles.css",
      starter:
        "/* TODO: style the .card class, the #hero id and paragraphs inside the card */\n.card {\n  padding: 16px;\n}\n",
      checks: [
        {
          label: "Selects the card class",
          test: (code) => /\.card\s*\{/.test(code),
        },
        {
          label: "Selects the hero id",
          test: (code) => /#hero\s*\{/.test(code),
        },
        {
          label: "Sets a text color",
          test: (code) => /(^|[^-\w])color\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Sets a background color",
          test: (code) => /background(-color)?\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Styles paragraphs inside the card",
          test: (code) => /\.card\s+p\s*\{/.test(code),
        },
      ],
      hint: "A class starts with a dot and an id with a hash, and a space between two selectors means inside.",
      explanation:
        "The dot and the hash choose which elements a rule reaches, and a space narrows that choice to descendants. Colour declarations belong inside braces, which keeps each rule separate from the next. This is a structure check, so it reads your selectors and declarations as text rather than rendering the page.",
    },
  },
  "css-box": {
    objectives: [
      "Measure how padding and border change the space an element occupies",
      "Switch to border-box sizing so declared widths include padding",
      "Center a fixed-width block with automatic side margins",
    ],
    terms: [
      {
        term: "Padding",
        meaning: "The space between an element's content and its border.",
      },
      {
        term: "Margin",
        meaning:
          "The space outside an element's border that separates it from neighbours.",
      },
      {
        term: "Border box",
        meaning:
          "The sizing mode where the declared width includes content, padding and border.",
      },
      {
        term: "Margin collapsing",
        meaning:
          "The rule that merges adjacent vertical margins into the larger of the two.",
      },
    ],
    deepDive: {
      title: "Going further: what the box really measures",
      body: "Browsers build every element as a rectangle with four nested layers: content, padding, border and margin. The width you declare normally applies to the content layer only, so a 300px card with 24px padding and a 1px border occupies 350px of horizontal space. box-sizing: border-box changes the reference, because the declared width then covers content, padding and border, and the content area receives whatever remains. Most teams set border-box on everything with *, which keeps the arithmetic predictable. Percentages resolve against the containing block, so padding: 10% of a 500px container is 50px, and for top and bottom padding the browser measures the container's width rather than its height. Adjacent vertical margins between block boxes collapse: the larger margin wins instead of both being added, which often explains spacing that looks wrong. Horizontal margins never collapse. Use padding when the space belongs to the element's own surface, and margin when you need distance from neighbours. Centering with margin: 0 auto then follows naturally, because equal automatic side margins split the leftover width.",
    },
    pitfall:
      "Beginners often set width: 100% with padding and then wonder why the element is wider than its parent, because content-box sizing adds the padding on top of the width. Set box-sizing: border-box on the element, or on everything with *, so the declared width already includes padding and border. Remember too that stacked vertical margins collapse to the larger value instead of adding up.",
    lab: {
      id: "css-box-lab",
      title: "Space a card with the box model",
      brief:
        "Style the .card rule in styles.css so it has a width, inner padding, a visible border and outer margin. Add box-sizing: border-box so the declared width covers the padding and border instead of growing past it. Use the margin shorthand to place the card and keep it away from its neighbours.",
      file: "styles.css",
      starter:
        "/* TODO: add width, padding, border, margin and box-sizing to .card */\n.card {\n  background-color: #f4efe5;\n}\n",
      checks: [
        {
          label: "Sets a width",
          test: (code) => /(^|[^-\w])width\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Adds padding",
          test: (code) => /padding\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Draws a border",
          test: (code) => /border\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Adds margin",
          test: (code) => /margin\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Includes padding in the declared width",
          test: (code) => /box-sizing\s*:\s*border-box/i.test(code),
        },
      ],
      hint: "The border shorthand needs a width, a style and a colour, and box-sizing belongs on the same element whose width you set.",
      explanation:
        "Padding sits inside the border and margin sits outside it, so all three affect the space a card claims. border-box makes the declared width the final outer width, which keeps a row of cards predictable. The structure check reads the declarations as text, so spell every property name exactly.",
    },
  },
  "css-flex": {
    objectives: [
      "Turn a container into a flex row and align items on both axes",
      "Distribute space with justify-content and flexible items",
      "Let items wrap onto new lines without losing the gap",
    ],
    terms: [
      {
        term: "Main axis",
        meaning: "The direction flex items flow, set by flex-direction.",
      },
      {
        term: "Cross axis",
        meaning:
          "The axis at right angles to the main axis, controlled by align-items.",
      },
      {
        term: "flex-basis",
        meaning:
          "The starting size of a flex item before free space is shared out.",
      },
      {
        term: "flex-wrap",
        meaning:
          "The setting that allows flex items to move onto additional lines.",
      },
    ],
    deepDive: {
      title: "Going further: how flex shares space",
      body: "A flex container has a main axis, chosen by flex-direction, and a cross axis at right angles to it. The browser first lays out each item at its flex-basis, then compares the total with the container's available space. Leftover space is handed out according to flex-grow, and overflow is taken back according to flex-shrink, weighted by each item's basis. The shorthand flex: 1 means grow 1, shrink 1 and a basis of 0, so items split the free space evenly whatever their content. flex: auto keeps the content size as the basis, so wider content keeps a wider share. Items refuse to shrink below their content's minimum width unless you set min-width: 0, which is the usual cure for long words that break a row. align-items positions items on the cross axis, while align-content only has an effect once the container has more than one flex line, which requires flex-wrap: wrap. Reach for flexbox for a single row or column of items, and switch to grid when rows and columns must line up together.",
    },
    pitfall:
      "A frequent mistake is adding justify-content: center to a column and expecting horizontal centering, but justify-content works along the main axis, which is vertical in a column. Use align-items for the cross axis, or change the direction deliberately. Another trap is expecting flex items to shrink below their text: set min-width: 0 on the item when compression is really wanted.",
    lab: {
      id: "css-flex-lab",
      title: "Center a row with flexbox",
      brief:
        "Make .toolbar a flex container with flex-direction: row. Center its children on both axes with justify-content and align-items, and add a gap so the buttons do not touch. Keep the existing background rule so the row remains visible.",
      file: "styles.css",
      starter:
        "/* TODO: make .toolbar a centered flex row with a gap between the buttons */\n.toolbar {\n  background-color: #173e31;\n}\n",
      checks: [
        {
          label: "Creates a flex container",
          test: (code) => /display\s*:\s*flex\b/i.test(code),
        },
        {
          label: "Keeps items in a row",
          test: (code) => /flex-direction\s*:\s*row\b/i.test(code),
        },
        {
          label: "Centers items along the main axis",
          test: (code) => /justify-content\s*:\s*center\b/i.test(code),
        },
        {
          label: "Centers items across the cross axis",
          test: (code) => /align-items\s*:\s*center\b/i.test(code),
        },
        {
          label: "Adds space between items",
          test: (code) => /(^|[^-\w])gap\s*:\s*[^;]+/i.test(code),
        },
      ],
      hint: "The two centering properties belong to the container, not to each button, and gap replaces per-button margins.",
      explanation:
        "display: flex makes the children flex items, and justify-content and align-items center them along the main and cross axes. gap keeps the spacing between items even without touching their margins. This structure check compares your text with the expected properties and does not draw the row.",
    },
  },
  "css-grid": {
    objectives: [
      "Describe rows and columns with grid-template and gap",
      "Build fluid tracks with repeat, fr and minmax",
      "Place and span items, then layer positioned elements with z-index",
    ],
    terms: [
      {
        term: "Grid line",
        meaning:
          "A numbered line between tracks that you can use to start or end an item.",
      },
      {
        term: "Track",
        meaning:
          "One row or column of a grid, sized by the template or by its content.",
      },
      {
        term: "fr unit",
        meaning:
          "A share of the free space left after fixed tracks and gaps are subtracted.",
      },
      {
        term: "Stacking context",
        meaning:
          "A layer whose children cannot paint above elements outside it.",
      },
    ],
    deepDive: {
      title: "Going further: lines, tracks and the implicit grid",
      body: "A grid is easier to reason about as numbered lines rather than cells. The first line is 1, and three columns produce four lines. grid-column: 1 / 3 places an item from line 1 up to line 3, which covers two tracks, and grid-column: span 2 says the same thing without naming lines. Track sizing runs in two passes: each track gets a base size from its content or a fixed length, then free space is distributed up to each track's growth limit, which is what fr and minmax describe. Tracks you never declared still exist, because the implicit grid creates rows with grid-auto-rows, which defaults to auto and sizes them by content. Use grid-auto-flow: dense only when order does not matter, since it can move items visually away from the source order and confuse keyboard users. Reach for grid when rows and columns must align across a whole region, such as page layouts and card galleries, and keep flexbox for a single row or column of items.",
    },
    pitfall:
      "A common mistake is putting gap on the grid items instead of the container, which spaces every item on all sides and doubles the visible distance between neighbours. Declare gap once on the grid container so space appears only between tracks. When z-index seems to do nothing, check whether an ancestor creates a stacking context, because a child can never rise above that ancestor's siblings.",
    lab: {
      id: "css-grid-lab",
      title: "Build a two-column gallery",
      brief:
        "Turn .gallery into a grid with two columns using grid-template-columns and repeat, and add a gap between the tracks. Then make the .feature item span both columns with grid-column. Keep the existing background rule on the container.",
      file: "styles.css",
      starter:
        "/* TODO: make .gallery a two-column grid and let .feature span both columns */\n.gallery {\n  background-color: #f4efe5;\n}\n",
      checks: [
        {
          label: "Creates a grid container",
          test: (code) => /display\s*:\s*grid\b/i.test(code),
        },
        {
          label: "Declares column tracks",
          test: (code) => /grid-template-columns\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Repeats the track list",
          test: (code) => /repeat\s*\(/i.test(code),
        },
        {
          label: "Adds space between tracks",
          test: (code) => /(^|[^-\w])gap\s*:\s*[^;]+/i.test(code),
        },
        {
          label: "Spans the feature across both columns",
          test: (code) => /grid-column\s*:\s*span\s*2\b/i.test(code),
        },
      ],
      hint: "Columns are declared on the container, while the span belongs on the item that should be wider.",
      explanation:
        "grid-template-columns with repeat describes the tracks, and gap spaces them without outer margins. grid-column: span 2 lets one item cross the line between the two columns so it reads as a feature. This is a structure check on the stylesheet text, so each track and span must be written out explicitly.",
    },
  },
  "css-responsive": {
    objectives: [
      "Size type and spacing with rem, em and viewport units",
      "Write mobile-first media queries that add layout as screens grow",
      "Keep images fluid with max-width, height auto and aspect-ratio",
    ],
    terms: [
      {
        term: "Viewport",
        meaning: "The visible area of the page inside the browser window.",
      },
      {
        term: "Breakpoint",
        meaning: "A viewport width where a media query changes the layout.",
      },
      {
        term: "clamp()",
        meaning:
          "A function that keeps a value between a minimum and a maximum while scaling it.",
      },
      {
        term: "Fluid image",
        meaning:
          "An image that shrinks with its container instead of overflowing it.",
      },
    ],
    deepDive: {
      title: "Going further: from units to decisions",
      body: "Length values resolve in a context. A pixel is absolute, rem follows the root font size so it stays stable when nested text changes, and em follows the element's own font size, which suits a component whose parts scale together. Percentages and fr follow the containing block. clamp(min, preferred, max) combines those units into a single declaration whose preferred value can be viewport based, which removes the need for a breakpoint between two sizes. Media queries then cover the places where the layout must change shape rather than merely resize, such as moving from one column to three. Because a min-width query adds rules as the viewport grows, a mobile-first stylesheet stays short: base rules describe the narrow layout and each query overrides only what differs. Tie breakpoints to content. If a line of text becomes too long around 700px, that width is the breakpoint, not a device name. Images need both max-width: 100% and height: auto, and aspect-ratio reserves space before the file arrives so the page does not jump.",
    },
    pitfall:
      "The classic mistake is writing the desktop layout first and then patching phones with max-width queries, which leads to duplicated overrides that fight each other. Start with the narrow layout and add min-width queries. Another frequent slip is setting only width on images: add height: auto, or the picture is squashed once its width changes.",
    lab: {
      id: "css-responsive-lab",
      title: "Make a page fluid",
      brief:
        "Give img a fluid rule with max-width: 100% and height: auto. Size the h1 with clamp so it scales between a minimum and a maximum, and add a min-width media query that switches .cards to a two-column grid. Declare the narrow layout first so the query only adds to it.",
      file: "styles.css",
      starter:
        "/* TODO: make the image fluid, scale the h1 with clamp and add a min-width query */\nbody {\n  margin: 0;\n}\n",
      checks: [
        {
          label: "Adds a min-width media query",
          test: (code) =>
            /@media[^{]*min-width\s*:\s*\d+\s*(px|em|rem)/i.test(code),
        },
        {
          label: "Caps images at the container width",
          test: (code) => /max-width\s*:\s*100%/i.test(code),
        },
        {
          label: "Keeps image height automatic",
          test: (code) => /height\s*:\s*auto/i.test(code),
        },
        {
          label: "Sizes the heading with clamp",
          test: (code) => /font-size\s*:\s*clamp\s*\([^)]*\)/i.test(code),
        },
      ],
      hint: "The media query wraps other rules, so its opening brace comes after the condition and its closing brace comes last.",
      explanation:
        "A fluid image shrinks to its column, and clamp lets the heading scale without a separate breakpoint. The min-width query then upgrades the card row only once there is room for two columns. The structure check reads your stylesheet as text, so keep the media query, function names and units exact.",
    },
  },
};
