import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "html-tables",
    title: "Tables & media",
    summary:
      "Present tabular data with clear headers, and embed images, figures, video and frames responsibly.",
    theory: [
      {
        title: "Tables that describe data",
        body: 'A table is the right choice only for data that needs rows and columns to make sense, such as a scoreboard or a price list. Open it with <table> and place a <caption> directly inside; the caption names the table and is announced before the data, so everyone gets the context. Each line of the table is a <tr> element, which stands for table row. The <thead> element wraps the row of labels and <tbody> wraps the rows of values, so browsers can repeat headers when printing. Inside a row, <th> creates a header cell and <td> creates a data cell. A header cell should declare which cells it describes: scope="col" means it labels the column below it, and scope="row" means it labels the row beside it. Do not use a table to position parts of a page; layout is a job for CSS.',
        code: `<table>
  <caption>Lesson scores</caption>
  <thead>
    <tr>
      <th scope="col">Player</th>
      <th scope="col">Points</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Ada</th>
      <td>18</td>
    </tr>
  </tbody>
</table>`,
      },
      {
        title: "Cells that span columns and rows",
        body: "Sometimes one label belongs to several columns at once. The colspan attribute on a cell makes it occupy more than one column position, and rowspan does the same down the rows. A colspan of two means the single cell fills the space of two ordinary cells, so the row still has to account for the same total number of columns. If the header row has three columns and one header spans two of them, that row needs one more cell beside it. When a header stretches across a group of columns, give it a scope value of colgroup so tools know it applies to the whole group rather than to a single column. Spans are a convenience, not a layout tool: deep nesting makes a table hard to follow with a screen reader and hard to maintain. Count column positions carefully, because one mismatch quietly shifts every value sideways.",
        code: `<tr>
  <th scope="colgroup" colspan="2">Quiz results</th>
</tr>
<tr>
  <th scope="col">Player</th>
  <th scope="col">Points</th>
</tr>`,
      },
      {
        title: "Images, figures and embeds",
        body: "Images, audio and video are replaced content, so the markup has to carry the meaning that the file cannot. The img element needs a src for the file and an alt that states what the picture adds to the page. Write the meaning rather than the appearance: alt text saying Ada crosses the finish line tells a listener something, while alt text saying photo does not. If an image is pure decoration, use an alt with an empty value so screen readers skip it. Wrap an image in figure when it needs a visible caption, and put that caption in figcaption; the caption is for everyone, while alt serves people who cannot see the picture. The video and audio elements need the controls attribute, otherwise there is no button to press. An iframe embeds a separate page, so it needs a title that names the frame, because the frame becomes its own stop in the reading order.",
        code: `<figure>
  <img src="race.png" alt="Ada crossing the finish line first">
  <figcaption>Ada wins the final race.</figcaption>
</figure>
<video src="clip.mp4" controls></video>
<audio src="theme.mp3" controls></audio>
<iframe src="map.html" title="Course map"></iframe>`,
      },
    ],
    tasks: [
      {
        prompt:
          "Which element gives a table a name that assistive technology announces?",
        options: ["<caption>", "<title>", "<label>", "<legend>"],
        answer: 0,
        explanation:
          "caption is the table's own description and is read when the table is reached, while title names the whole document.",
      },
      {
        prompt: "Which element creates one row inside a table?",
        options: ["<tr>", "<td>", "<row>", "<th>"],
        answer: 0,
        explanation:
          "tr stands for table row and wraps the cells that share one line.",
      },
      {
        prompt: "Which element marks a cell as a header instead of data?",
        options: ["<td>", "<th>", "<thead>", "<head>"],
        answer: 1,
        explanation:
          "th is a header cell, so its text is treated as a label for neighbouring cells; thead only groups a row of them.",
      },
      {
        prompt:
          "Which attribute value tells a screen reader that a header cell labels the column below it?",
        options: [
          'scope="col"',
          'scope="row"',
          'role="column"',
          'headers="col"',
        ],
        answer: 0,
        explanation:
          "scope=col ties the header to the cells underneath, so each value is announced together with its column label.",
      },
      {
        prompt: "How many columns does this table have?",
        code: `<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Points</th></tr>
  </thead>
  <tbody>
    <tr><td>Ada</td><td>18</td></tr>
    <tr><td>Grace</td><td>21</td></tr>
  </tbody>
</table>`,
        options: ["1", "2", "3", "4"],
        answer: 1,
        explanation:
          "The header row defines two cells, Name and Points, and each data row also holds two cells.",
      },
      {
        prompt: "How many column positions does this cell occupy?",
        code: '<td colspan="2">Team total</td>',
        options: ["1", "2", "3", "It depends on the row height"],
        answer: 1,
        explanation:
          "colspan sets how many columns the cell stretches across, so a value of 2 fills two positions.",
      },
      {
        prompt:
          "A photo shows how steep a mountain trail is. What should its alt text contain?",
        options: [
          "The information the picture adds, such as the steep climb",
          "The file name, mountain.png",
          "The words image of a mountain",
          "Nothing at all",
        ],
        answer: 0,
        explanation:
          "Alt text replaces the image for people who cannot see it, so it must carry the meaning rather than the file name.",
      },
      {
        prompt:
          "What should be added so a visitor can start, pause and change the volume?",
        code: '<video src="intro.mp4"></video>',
        options: ["controls", "alt", "title", "caption"],
        answer: 0,
        explanation:
          "The controls attribute makes the browser draw its playback controls; without it most people cannot operate the media.",
      },
      {
        prompt: "Why does an iframe need a title attribute?",
        options: [
          "It gives the embedded frame an accessible name that screen readers announce",
          "It sets the visible heading of the frame",
          "It is required before the frame can load",
          "It fixes the size of the frame",
        ],
        answer: 0,
        explanation:
          "A frame is a separate document, so its title tells users which embedded page they have moved into.",
      },
      {
        prompt: "Where may a figcaption sit inside a figure?",
        options: [
          "As the first or last child of the figure",
          "Only after a paragraph",
          "Only inside the img element",
          "Anywhere in the document",
        ],
        answer: 0,
        explanation:
          "The specification allows figcaption as the first or last child, which keeps the caption attached to its figure.",
      },
    ],
  },
  {
    id: "html-page",
    title: "Build a full page",
    summary:
      "Write the document skeleton, place landmarks and assemble a complete page that reads in order.",
    theory: [
      {
        title: "The document skeleton",
        body: "Every page starts with a fixed skeleton. The first line is the doctype, written as an exclamation mark, the word DOCTYPE and the word html between angle brackets, which tells the browser to use modern standards instead of a compatibility mode. Next comes the html element, which wraps the whole document and carries lang, the language of the content, such as en for English. Inside it, head holds information about the page and body holds what people see. The head needs a meta element declaring the utf-8 character set so accents and symbols decode correctly, a title element naming the page for the tab, bookmarks and search results, and a viewport meta so phones use their real screen width instead of pretending to be a wide desktop. Stylesheets and scripts are linked from head too. None of this is visible, yet each part decides how the visible page behaves, so write the skeleton from memory until it is automatic.",
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ada - Portfolio</title>
  </head>
  <body>
    <h1>Ada</h1>
  </body>
</html>`,
      },
      {
        title: "Landmarks and the skip link",
        body: "Landmarks are the named regions that a screen reader can list and jump between. header holds introductory content such as the site name and the main navigation, nav wraps a group of navigation links, main holds the unique content of this page, and footer holds closing information such as copyright. Use main once per page, because it answers the question of where the content begins. When a page has more than one nav, give each one an accessible name with aria-label so the list reads Main navigation and Footer navigation instead of two identical entries. A skip link is an ordinary a element placed as the first focusable item in body, pointing at the id of main, for example a href of hash main. It stays hidden until a keyboard user presses Tab, then lets them jump past the repeated header links. Together these elements turn a wall of content into a map that can be navigated by region.",
        code: `<body>
  <a href="#main">Skip to content</a>
  <header>
    <nav aria-label="Main navigation">
      <a href="#work">Work</a>
    </nav>
  </header>
  <main id="main">
    <h1>Ada</h1>
  </main>
  <footer>
    <p>Built for learners.</p>
  </footer>
</body>`,
      },
      {
        title: "Heading order and assembly",
        body: "Headings build the outline that both sighted and screen-reader users scan. Use one h1 that states what the page is, then h2 for each major section, and h3 only inside an h2. Skipping from h1 to h4 makes the outline look broken and forces assistive technology to announce a level with no parent. Headings are not font sizes: if a heading looks too large, change that with CSS rather than dropping to a lower level. Assembling a page means writing the skeleton first, then the landmarks in source order, then the headings and content inside them. Read the result from top to bottom: doctype, html with lang, head with charset, viewport and title, then body with a skip link, header, main and footer. Reorder anything that would make a keyboard user tab through the footer before the content, because source order is tab order. Finally, resize the window and press Tab through the page to confirm it still makes sense.",
        code: `<main id="main">
  <h1>Ada</h1>
  <section>
    <h2>Projects</h2>
    <h3>This year</h3>
  </section>
</main>`,
      },
    ],
    tasks: [
      {
        prompt: "Which line belongs at the very top of an HTML document?",
        options: ["<!DOCTYPE html>", "<html>", "<head>", "<!-- doctype -->"],
        answer: 0,
        explanation:
          "The doctype switches the browser into standards mode, so the page is rendered by modern rules.",
      },
      {
        prompt:
          "Which element holds the title, the character set and the viewport information?",
        options: ["<head>", "<header>", "<body>", "<meta>"],
        answer: 0,
        explanation:
          "head holds information about the page, while header is a visible banner inside body.",
      },
      {
        prompt: "Which element contains everything a visitor can see?",
        options: ["<body>", "<main>", "<html>", "<section>"],
        answer: 0,
        explanation:
          "body is the visible document; main is only the primary region within it.",
      },
      {
        prompt: "What does lang on the html element tell the browser?",
        options: [
          "The language of the content, used by screen readers and translation tools",
          "That the page uses English spelling only",
          "That the page must load in English-speaking countries",
          "The character encoding of the file",
        ],
        answer: 0,
        explanation:
          "lang lets speech synthesis pick the right pronunciation and helps browsers hyphenate and translate correctly.",
      },
      {
        prompt: "What does this tag make a phone do?",
        code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        options: [
          "Match the layout width to the device and start at normal zoom",
          "Lock the page to a desktop width",
          "Set the language of the page",
          "Preload the images of the page",
        ],
        answer: 0,
        explanation:
          "Without it a mobile browser assumes a wide desktop canvas and shrinks the page, so text becomes tiny.",
      },
      {
        prompt: "What is this link for?",
        code: '<a href="#main">Skip to content</a>',
        options: [
          "Letting keyboard users jump past repeated navigation to the content",
          "Scrolling to the footer of the page",
          "Opening the content in a new tab",
          "Linking to an external website",
        ],
        answer: 0,
        explanation:
          "It targets the element with id main, so a keyboard user can skip the same links on every page of the site.",
      },
      {
        prompt: "Which order is valid inside the html element?",
        options: [
          "head, then body",
          "body, then head",
          "title, then head, then body",
          "head, then body, then a second head",
        ],
        answer: 0,
        explanation:
          "head must come before body so metadata such as the title is known before content is painted.",
      },
      {
        prompt: "Where should a skip link appear in the document?",
        options: [
          "As the first focusable element at the start of body",
          "At the end of the footer",
          "Inside the head element",
          "Anywhere inside main",
        ],
        answer: 0,
        explanation:
          "It only helps when it is reached before the repeated navigation, which means first in the tab order.",
      },
      {
        prompt:
          "Which declaration should be added inside head so accented characters display correctly?",
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ada Portfolio</title>
  </head>
  <body>
    <h1>Ada</h1>
  </body>
</html>`,
        options: [
          '<meta charset="utf-8">',
          '<meta name="accent">',
          '<link rel="charset">',
          '<script charset="utf-8">',
        ],
        answer: 0,
        explanation:
          "The charset meta tells the browser how to decode the bytes, which prevents garbled characters.",
      },
      {
        prompt:
          "A page begins its main content with an h2 and has no h1. What is the best fix?",
        options: [
          "Add one h1 that names the page before the h2",
          "Change the h2 into an h4",
          "Add a second h1 at the end of the page",
          "Remove the h2 and use bold text instead",
        ],
        answer: 0,
        explanation:
          "Each page needs one top-level heading, and lower levels only make sense underneath it.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "html-basics": {
    objectives: [
      "Write an element with an opening tag, content and a closing tag.",
      "Add attributes such as href and alt with quoted values.",
      "Nest elements correctly so each child closes before its parent.",
    ],
    terms: [
      {
        term: "Element",
        meaning:
          "A complete unit of markup made of a tag, its content and any attributes.",
      },
      {
        term: "Attribute",
        meaning:
          "A name and value pair inside an opening tag that configures the element.",
      },
      {
        term: "Void element",
        meaning:
          "An element such as img or br that has no content and therefore no closing tag.",
      },
      {
        term: "Nesting",
        meaning:
          "Placing elements inside other elements so that the inner one closes first.",
      },
    ],
    deepDive: {
      title: "The page is a tree",
      body: "Once you add a second element, a document stops being a list of tags and becomes a tree. The html element is the root, head and body are its children, and everything else hangs below them. Each element is a box that can hold text and other boxes, so nesting expresses ownership: a link inside a paragraph belongs to that paragraph, while a link beside it does not. Attributes are settings on a single box, such as where a link goes or what an image means, and they never affect the surrounding boxes. Void elements such as img and br hold no content at all, so they have no closing tag. Browsers are forgiving and repair mistakes, which is why a missing closing tag can look harmless while producing a different tree than you intended. A quick way to check your work is to read the tags as open and close pairs: every open must be answered before its parent closes, and the last one opened must close first.",
    },
    pitfall:
      "A common beginner mistake is crossing the tags, as in an opening paragraph, an opening strong, then a closing paragraph before the closing strong. Browsers silently repair that markup, so the page may look correct while the structure is not what you meant. Write the closing tag immediately after the opening one, then fill in the content between them.",
    lab: {
      id: "html-basics-lab",
      title: "Draft a short introduction",
      brief:
        "Write a small page in page.html that introduces you. It needs an h1 with your name, at least one paragraph of text, a link whose href points somewhere real, and an unordered list with at least two items. This is a structure check on the markup you type, so every element needs both an opening and a closing tag.",
      file: "page.html",
      starter: `<!-- TODO: add an h1, a paragraph, a link and a list -->
<h1></h1>
`,
      checks: [
        {
          label: "Contains an h1 heading with text",
          test: (code) => /<h1\b[^>]*>[\s\S]*?\S[\s\S]*?<\/h1>/i.test(code),
        },
        {
          label: "Contains a paragraph with text",
          test: (code) => /<p\b[^>]*>[\s\S]*?\S[\s\S]*?<\/p>/i.test(code),
        },
        {
          label: "Contains a link with an href attribute",
          test: (code) =>
            /<a\b[^>]*\bhref\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/a>/i.test(
              code,
            ),
        },
        {
          label: "Contains an unordered list with two or more items",
          test: (code) =>
            /<ul\b[^>]*>[\s\S]*?<li\b[^>]*>[\s\S]*?<\/li>[\s\S]*?<li\b[^>]*>[\s\S]*?<\/li>[\s\S]*?<\/ul>/i.test(
              code,
            ),
        },
      ],
      hint: "Build it in order: heading, paragraph, link, then a ul whose li elements sit inside it.",
      explanation:
        "An element is only complete when its closing tag is present, and list items belong inside the ul rather than after it. Writing the structure first means the browser and the checks see the same tree.",
    },
  },
  "html-semantics": {
    objectives: [
      "Match each region of a page to the landmark element that names it.",
      "Group related content into sections that each start with a heading.",
      "Explain what a div does and does not communicate to assistive technology.",
    ],
    terms: [
      {
        term: "Landmark",
        meaning:
          "A named region such as header, nav, main or footer that assistive technology can jump to.",
      },
      {
        term: "Article",
        meaning:
          "A self-contained piece of content that would still make sense on its own.",
      },
      {
        term: "Section",
        meaning:
          "A themed group of content that normally begins with its own heading.",
      },
      {
        term: "Aside",
        meaning:
          "Content that is related to the page but separate from its main flow, such as a tip box.",
      },
    ],
    deepDive: {
      title: "A map, not a pile of boxes",
      body: "Think of landmarks as rooms in a building rather than decoration. A screen reader can list every landmark on a page and jump straight to one, so main earns its place by answering the question of where the content is without reading anything else. That list is built only from real elements: adding a class called header to a div does nothing for it. Keep one main per page, because a second one makes the shortcut ambiguous, and give each nav an accessible name with aria-label when a page has more than one, so users hear Main navigation instead of two identical entries. header and footer are not limited to the whole page; a long article can carry its own header and footer, and the same element then describes a smaller region. When you are unsure, ask what the block is for rather than what it looks like, and choose the element that names that purpose. If nothing matches, div remains a valid and honest answer.",
    },
    pitfall:
      "Beginners often build the whole layout from div elements and rely on classes such as header or nav to give them meaning. Classes are invisible to the accessibility tree, so the landmark list stays empty even though the page looks finished. Choose the semantic element first and keep the class only for styling.",
    lab: {
      id: "html-semantics-lab",
      title: "Map the page with landmarks",
      brief:
        "Rebuild the starter div as a landmark structure. Wrap a page title and a nav inside a header, put the content in a main that contains at least one section, and close with a footer. Keep the text short, because the checks look for the elements and their nesting.",
      file: "structure.html",
      starter: `<!-- TODO: replace this div with header, nav, main, section and footer -->
<div class="page">
</div>
`,
      checks: [
        {
          label: "Contains a header element",
          test: (code) => /<header\b[^>]*>[\s\S]*?<\/header>/i.test(code),
        },
        {
          label: "Contains a nav element for navigation links",
          test: (code) => /<nav\b[^>]*>[\s\S]*?<\/nav>/i.test(code),
        },
        {
          label: "Contains a main element for the primary content",
          test: (code) => /<main\b[^>]*>[\s\S]*?<\/main>/i.test(code),
        },
        {
          label: "Contains a section element",
          test: (code) => /<section\b[^>]*>[\s\S]*?<\/section>/i.test(code),
        },
        {
          label: "Contains a footer element",
          test: (code) => /<footer\b[^>]*>[\s\S]*?<\/footer>/i.test(code),
        },
      ],
      hint: "Open with header, put nav inside it, then main with a section, then footer.",
      explanation:
        "Landmarks are what a screen reader lists when someone asks to move between regions, and that list is built from real elements only. A div with a class name is invisible to it.",
    },
  },
  "html-forms": {
    objectives: [
      "Connect every input to a label with matching for and id values.",
      "Choose input types that match the value being collected.",
      "Mark required fields and give the form a submit button.",
    ],
    terms: [
      {
        term: "Label",
        meaning:
          "A visible name for a form control that assistive technology announces when the control is focused.",
      },
      {
        term: "Input type",
        meaning:
          "The attribute that decides which kind of value a field accepts and how it is validated.",
      },
      {
        term: "Required",
        meaning:
          "A boolean attribute that blocks submission while the field is still empty.",
      },
      {
        term: "Placeholder",
        meaning:
          "Faint example text inside an empty field that disappears as soon as typing starts.",
      },
    ],
    deepDive: {
      title: "The label is the name of the control",
      body: "A screen reader does not read the text beside a field; it asks the field for its accessible name. That name comes from a label whose for value matches the input id, or from a label wrapped around the control. Placeholder text is not a name: it disappears as soon as someone types, it is usually low contrast, and some tools skip it, so it can only ever be a hint. Association also buys a larger click target, because clicking the label focuses the input, which helps anyone using a small screen. Groups deserve their own naming: radio buttons inside fieldset with a legend are announced as one question with choices instead of several unrelated options. Types matter for the same reason. An email type gives a phone keyboard with an at sign and a built-in format check, while a plain text type accepts anything. Choose the type that describes the value, add autocomplete for common fields, and let the browser handle the first pass of validation.",
    },
    pitfall:
      "It is tempting to label a field with a placeholder and skip the label element entirely. The hint vanishes the moment typing starts, so the field loses its name exactly when the user wants to check the input. Provide a visible label and keep the placeholder for an example only.",
    lab: {
      id: "html-forms-lab",
      title: "Label two fields and submit",
      brief:
        "Create a form in form.html with a name field and an email field. Every input needs an id, and every label needs a for value that matches it. Finish with a button element whose type is submit.",
      file: "form.html",
      starter: `<!-- TODO: add labels, inputs and a submit button -->
<form>
</form>
`,
      checks: [
        {
          label: "Contains a form element",
          test: (code) => /<form\b[^>]*>[\s\S]*?<\/form>/i.test(code),
        },
        {
          label: "Contains a label with a for attribute",
          test: (code) =>
            /<label\b[^>]*\bfor\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/label>/i.test(
              code,
            ),
        },
        {
          label: "Contains an input with an id attribute",
          test: (code) =>
            /<input\b[^>]*\bid\s*=\s*["'][^"']+["'][^>]*>/i.test(code),
        },
        {
          label: "Contains an input with type email",
          test: (code) =>
            /<input\b[^>]*\btype\s*=\s*["']email["'][^>]*>/i.test(code),
        },
        {
          label: "Contains a submit button",
          test: (code) =>
            /<button\b[^>]*\btype\s*=\s*["']submit["'][^>]*>[\s\S]*?<\/button>/i.test(
              code,
            ),
        },
      ],
      hint: "Give the input an id first, then reuse that exact value in the for attribute of its label.",
      explanation:
        "The for and id pair is the link between a label and a field; without it the text is merely nearby. A button with type submit is the control that actually sends the form.",
    },
  },
  "html-tables": {
    objectives: [
      "Decide when data needs a table and when a list is the better structure.",
      "Name a table with caption and group its rows with thead and tbody.",
      "Connect each header cell to the data it describes with scope.",
    ],
    terms: [
      {
        term: "Caption",
        meaning:
          "The table element that names or describes the table and is announced before its data.",
      },
      {
        term: "Header cell",
        meaning:
          "A th cell that labels the row or column of data beside or below it.",
      },
      {
        term: "Scope",
        meaning:
          "The attribute stating whether a header cell applies to a column, a row or a group of them.",
      },
      {
        term: "Span",
        meaning:
          "The number of column or row positions one cell occupies, set with colspan or rowspan.",
      },
    ],
    deepDive: {
      title: "A grid is not a table",
      body: "A table describes a relationship between two dimensions, which is why it is powerful and also easy to misuse. If the content would still read correctly as a list of items, use a list. If the content is arranged in a grid only to control where things sit on screen, use CSS. Screen readers enter a table mode that reads one cell at a time and announces headers, so a header with the wrong scope makes every value sound misleading even though the visible grid looks fine. Complex tables can name their headers with id and headers attributes, but needing that is usually a signal to simplify the content instead. Keep spans small: a colspan of two means one cell fills two column positions, and every row must still account for the full width. On narrow screens a wide table is hard to read, so wrap it in a container that scrolls rather than deleting the caption or the header row.",
    },
    pitfall:
      "A frequent mistake is adding colspan without recounting the columns, so one row ends up narrower than the header row and the columns drift out of line. The table still looks like a table, which makes the mistake easy to miss. Count the column positions in every row before you add a span.",
    lab: {
      id: "html-tables-lab",
      title: "Build a scored table",
      brief:
        "Build a table in table.html that lists two players and their points. Start with a caption, put one header row inside thead with th cells that use scope, and put the data rows inside tbody as td cells. Header and body rows must have the same number of columns.",
      file: "table.html",
      starter: `<!-- TODO: add a caption, a header row with scope and two data rows -->
<table>
</table>
`,
      checks: [
        {
          label: "Contains a table element",
          test: (code) => /<table\b[^>]*>[\s\S]*?<\/table>/i.test(code),
        },
        {
          label: "Contains a caption with text",
          test: (code) =>
            /<caption\b[^>]*>[\s\S]*?\S[\s\S]*?<\/caption>/i.test(code),
        },
        {
          label: "Groups the header row inside thead",
          test: (code) => /<thead\b[^>]*>[\s\S]*?<\/thead>/i.test(code),
        },
        {
          label: "Uses a th cell with a column scope",
          test: (code) =>
            /<th\b[^>]*\bscope\s*=\s*["']col["'][^>]*>/i.test(code),
        },
        {
          label: "Groups data rows inside tbody with td cells",
          test: (code) =>
            /<tbody\b[^>]*>[\s\S]*?<td\b[^>]*>[\s\S]*?<\/tbody>/i.test(code),
        },
      ],
      hint: "The caption is the first child of the table, before thead.",
      explanation:
        "caption and scope make a table readable without sight: the caption names the whole table and each scope value ties a header to its cells. Grouping rows in thead and tbody keeps that relationship explicit.",
    },
  },
  "html-page": {
    objectives: [
      "Assemble the document skeleton from the doctype to the closing html tag.",
      "Declare the page language and a mobile-friendly viewport.",
      "Order landmarks and headings so the page reads from top to bottom.",
    ],
    terms: [
      {
        term: "Doctype",
        meaning:
          "The declaration on the first line that selects standards mode for the browser.",
      },
      {
        term: "Viewport",
        meaning:
          "The visible area of the page on a device, described for phones by the viewport meta tag.",
      },
      {
        term: "Landmark",
        meaning:
          "A region such as header, nav, main or footer that assistive technology can jump to.",
      },
      {
        term: "Skip link",
        meaning:
          "A link at the start of the body that moves focus past repeated navigation to the content.",
      },
    ],
    deepDive: {
      title: "From skeleton to screen",
      body: "A browser reads a document from top to bottom, and the order you write things in is the order it acts on them. The doctype comes first because it decides which rendering rules apply; without it a browser may fall back to quirks mode and compute box sizes differently. The head is processed before anything is painted, which is how the tab title and the character set are known in time. The lang value on html is inherited by everything inside, so one declaration tells a speech synthesiser how to pronounce the page, and an inline lang can override it for a quotation in another language. The viewport meta does not make a site responsive by itself; it tells a phone to use the device width instead of a pretend desktop width. Never pair it with user-scalable=no, which takes zoom away from people who need it. Finally, keep the visual order equal to the source order. If the tab order jumps around, the usual cause is a layout that moves content visually but leaves the markup in a different sequence.",
    },
    pitfall:
      "Many beginners copy only the visible part of a page, then wonder why the tab shows a file name or why accented characters turn into question marks. Without a charset declaration the browser has to guess the encoding, and without a title the page has no name in history or bookmarks. Start every file from the same skeleton: doctype, html with lang, head with charset, viewport and title, then body.",
    lab: {
      id: "html-page-lab",
      title: "Assemble a profile page",
      brief:
        "Write a complete document in profile.html: a doctype on the first line, an html element with lang, and a head containing a title and a viewport meta tag. The body should hold a header, a main and a footer in that order. Add a skip link at the top of the body and an h1 inside main.",
      file: "profile.html",
      starter: `<!-- TODO: start with the doctype, then html, head and body -->
<html>
  <head>
  </head>
  <body>
  </body>
</html>
`,
      checks: [
        {
          label: "Starts with an HTML doctype",
          test: (code) => /<!DOCTYPE\s+html>/i.test(code),
        },
        {
          label: "Declares a language on the html element",
          test: (code) =>
            /<html\b[^>]*\blang\s*=\s*["'][A-Za-z-]+["'][^>]*>/i.test(code),
        },
        {
          label: "Declares a viewport meta with the device width",
          test: (code) =>
            /<meta\b(?=[^>]*\bname\s*=\s*["']viewport["'])(?=[^>]*\bcontent\s*=\s*["'][^"']*width\s*=\s*device-width)[^>]*>/i.test(
              code,
            ),
        },
        {
          label: "Names the page with a title element",
          test: (code) => /<title\b[^>]*>[\s\S]*?<\/title>/i.test(code),
        },
        {
          label: "Places header before main and footer after it",
          test: (code) =>
            /<header\b(?=[\s\S]*<main\b[\s\S]*<\/main>[\s\S]*<footer\b)[\s\S]*<\/footer>/i.test(
              code,
            ),
        },
      ],
      hint: "The head needs both a title element and a meta tag whose name is viewport.",
      explanation:
        "The doctype and the head are handled before anything is drawn, which is why the title, the language and the viewport belong there. Landmarks in source order give the page a shape that both sighted and assistive users can follow.",
    },
  },
};
