export const solutions = {
  "html-basics-lab": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>My first page</title>
  </head>
  <body>
    <h1>Ada Lovelace</h1>
    <p>I am learning HTML so I can build pages that anyone can read.</p>
    <a href="https://example.com">My notes on algorithms</a>
    <ul>
      <li>Structure first</li>
      <li>Then styling</li>
    </ul>
  </body>
</html>`,
  "html-semantics-lab": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>World of Codes</title>
  </head>
  <body>
    <header>
      <p>World of Codes</p>
      <nav aria-label="Main navigation">
        <a href="#lessons">Lessons</a>
        <a href="#about">About</a>
      </nav>
    </header>
    <main>
      <h1>Learn to build for the web</h1>
      <section>
        <h2>Latest lessons</h2>
        <p>Start with elements, then move on to layout.</p>
      </section>
    </main>
    <footer>
      <p>Built for learners.</p>
    </footer>
  </body>
</html>`,
  "html-forms-lab": `<form action="/subscribe" method="post">
  <label for="name">Your name</label>
  <input id="name" name="name" type="text" required>

  <label for="email">Email address</label>
  <input id="email" name="email" type="email" required>

  <button type="submit">Send</button>
</form>`,
  "html-tables-lab": `<table>
  <caption>Player points after round three</caption>
  <thead>
    <tr>
      <th scope="col">Player</th>
      <th scope="col">Points</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Ada</td>
      <td>18</td>
    </tr>
    <tr>
      <td>Grace</td>
      <td>21</td>
    </tr>
  </tbody>
</table>`,
  "html-page-lab": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ada Lovelace - Profile</title>
  </head>
  <body>
    <a href="#main">Skip to content</a>
    <header>
      <p>Ada Lovelace</p>
      <nav aria-label="Main navigation">
        <a href="#work">Work</a>
      </nav>
    </header>
    <main id="main">
      <h1>Ada Lovelace</h1>
      <p>Mathematician and writer of the first published algorithm.</p>
    </main>
    <footer>
      <p>Built in 2026.</p>
    </footer>
  </body>
</html>`,
};
