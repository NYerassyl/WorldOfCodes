export const solutions = {
  "css-basics-lab": `.card {
  color: #173e31;
  background-color: #f4efe5;
  padding: 20px;
  border-radius: 12px;
}

#hero {
  color: #ffffff;
  background-color: #173e31;
}

.card p {
  color: #55605b;
  line-height: 1.6;
}
`,
  "css-box-lab": `.card {
  box-sizing: border-box;
  width: 100%;
  max-width: 320px;
  padding: 24px;
  border: 2px solid #d8ded8;
  margin: 0 auto 16px;
}
`,
  "css-flex-lab": `.toolbar {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 12px;
  min-height: 96px;
  background-color: #173e31;
}
`,
  "css-grid-lab": `.gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  background-color: #f4efe5;
}

.gallery .feature {
  grid-column: span 2;
}
`,
  "css-responsive-lab": `img {
  max-width: 100%;
  height: auto;
}

h1 {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}

.cards {
  display: grid;
  gap: 16px;
}

@media (min-width: 720px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}
`,
};
