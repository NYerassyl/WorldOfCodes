import { useState } from "react";
import { Icon } from "./UI";
export default function WorldArt() {
  const [language, setLanguage] = useState<"js" | "css">("js");
  return (
    <div className="hero-workbench">
      <div className="workbench-orbit orbit-a" />
      <div className="workbench-orbit orbit-b" />
      <span className="workbench-star star-a">+</span>
      <span className="workbench-star star-b">+</span>
      <div className="floating-note">
        <span className="note-icon">
          <Icon name="sparkle" />
        </span>
        <div>
          A little practice.<strong>A lot of possibility.</strong>
        </div>
      </div>
      <div className="workbench-window">
        <div className="window-chrome">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>your-next-chapter</span>
          <Icon name="code" />
        </div>
        <div
          className="workbench-tabs"
          role="tablist"
          aria-label="Hero code example"
        >
          <button
            role="tab"
            aria-selected={language === "js"}
            onClick={() => setLanguage("js")}
            className={language === "js" ? "selected" : ""}
          >
            <span className="file-icon js-file">JS</span>journey.js
          </button>
          <button
            role="tab"
            aria-selected={language === "css"}
            onClick={() => setLanguage("css")}
            className={language === "css" ? "selected" : ""}
          >
            <span className="file-icon css-file">#</span>world.css
          </button>
        </div>
        <div
          className="workbench-code"
          role="tabpanel"
          aria-label={language === "js" ? "JavaScript example" : "CSS example"}
          key={language}
        >
          {language === "js" ? (
            <>
              <div>
                <i>01</i>
                <code>
                  <span className="syntax-comment">
                    // Your next chapter starts here.
                  </span>
                </code>
              </div>
              <div>
                <i>02</i>
                <code>
                  <b>const</b> developer = {"{"}
                </code>
              </div>
              <div>
                <i>03</i>
                <code>
                  {" "}
                  curiosity: <em>Infinity</em>,
                </code>
              </div>
              <div>
                <i>04</i>
                <code>
                  {" "}
                  mindset:{" "}
                  <span className="syntax-string">"keep building"</span>,
                </code>
              </div>
              <div>
                <i>05</i>
                <code>
                  {" "}
                  nextStep: <span className="syntax-string">"start today"</span>
                </code>
              </div>
              <div>
                <i>06</i>
                <code>{"};"}</code>
              </div>
              <div>
                <i>07</i>
                <code> </code>
              </div>
              <div>
                <i>08</i>
                <code>
                  <span className="syntax-function">buildYourWorld</span>
                  (developer);
                  <span className="code-cursor" />
                </code>
              </div>
            </>
          ) : (
            <>
              <div>
                <i>01</i>
                <code>
                  <span className="syntax-comment">
                    /* Make room for your ideas. */
                  </span>
                </code>
              </div>
              <div>
                <i>02</i>
                <code>
                  <span className="syntax-function">.your-world</span> {"{"}
                </code>
              </div>
              <div>
                <i>03</i>
                <code>
                  {" "}
                  display: <em>grid</em>;
                </code>
              </div>
              <div>
                <i>04</i>
                <code>
                  {" "}
                  gap: <span className="syntax-string">new-possibilities</span>;
                </code>
              </div>
              <div>
                <i>05</i>
                <code>
                  {" "}
                  perspective: <span className="syntax-string">yours</span>;
                </code>
              </div>
              <div>
                <i>06</i>
                <code>{"}"}</code>
              </div>
              <div>
                <i>07</i>
                <code> </code>
              </div>
              <div>
                <i>08</i>
                <code>
                  <span className="syntax-comment">
                    /* A creative sketch, not executable CSS. */
                  </span>
                </code>
              </div>
            </>
          )}
        </div>
        <div className="workbench-status">
          <span>
            <Icon name="branch" /> your-journey
          </span>
          <span>
            <i /> Ready when you are
          </span>
        </div>
      </div>
      <div className="achievement-note">
        <span className="achievement-symbol">
          <Icon name="planet" />
        </span>
        <div>
          <small>HELLO, NEW WORLD.</small>
          <strong>Big things start small.</strong>
        </div>
        <span className="achievement-arrow">
          <Icon name="arrow-up" />
        </span>
      </div>
      <div className="workbench-caption">
        <span>LEARN</span>
        <i />
        <span>PRACTICE</span>
        <i />
        <span>LEVEL UP</span>
      </div>
    </div>
  );
}
